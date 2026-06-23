# -*- coding: utf-8 -*-
"""
AegisFlow AI — Flood Risk Model Training v4.2  (authoritative, reproducible)
============================================================================
This is the SINGLE source of truth for the deployed `flood_risk_model.pkl`.
It reproduces the v4.1 stacking bundle format expected by
`services/flood_calculator.py::_ml_predict` and upgrades it with:

  1. Leak-free stacking      — meta-model trained on OUT-OF-FOLD base
                               probabilities (cross_val_predict), not on
                               in-sample probabilities (which inflated v4.1).
  2. Probability calibration — CalibratedClassifierCV on the meta-model so the
                               reported `confidence` is trustworthy (v4.1's
                               confidence collapsed to ~0.48 on extreme inputs).
  3. Cost-sensitive training — sample weights emphasise the `critical` class;
                               in a life-safety system, missing a critical
                               case is the expensive error.
  4. Noise-robustness        — base learners are refit on the training set plus
                               a jittered copy, widening the learned manifold
                               so out-of-distribution inputs degrade gracefully.
  5. Honest evaluation       — held-out test metrics, per-class recall,
                               confusion matrix, AUC, AND calibration error
                               (Brier / ECE). A monotonicity stress test sweeps
                               water level and checks risk never decreases.
  6. SHAP explainability     — global feature attributions saved as a plot +
                               JSON, backing the "transparency" ethics claim.

Train/serve parity: the 5 interaction features (rain_x_tide, water_x_saturation,
rain_x_season, trend_x_rain6h, cumulative_stress) are computed here with the
EXACT formulas used at inference in flood_calculator._ml_predict.

Run:  ./venv/bin/python models/train_flood_model_v4.py
"""

import json
import shutil
import warnings
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_predict
from sklearn.ensemble import (
    RandomForestClassifier, ExtraTreesClassifier, GradientBoostingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, f1_score, precision_score,
    recall_score, classification_report, confusion_matrix, roc_auc_score,
    brier_score_loss,
)

from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")
RNG = 42
np.random.seed(RNG)

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
MODEL_PATH = SCRIPT_DIR / "flood_risk_model.pkl"
METRICS_PATH = SCRIPT_DIR / "model_metrics.json"
ARTIFACT_DIR = SCRIPT_DIR / "artifacts_v4"
VERSION = "4.2.0"

# ---- Feature contract: MUST match flood_calculator._ml_predict order ----
BASE_FEATURES = ["water_level_m", "rainfall_mm", "hours_rain", "tide_level",
                 "historical_score", "water_level_trend", "rain_6h", "soil_saturation"]
TIME_FEATURES = ["month", "year_index", "month_sin", "month_cos", "seasonal_risk_score"]
INTERACTION_FEATURES = ["rain_x_tide", "water_x_saturation", "rain_x_season",
                        "trend_x_rain6h", "cumulative_stress"]
ALL_FEATURES = BASE_FEATURES + TIME_FEATURES + INTERACTION_FEATURES  # 18

RISK_SCORE_BY_LABEL = {"low": 15.0, "medium": 45.0, "high": 70.0, "critical": 90.0}
# Service inference maps probabilities to a 0-100 score with these anchors:
CLASS_SCORE = {"critical": 92, "high": 72, "medium": 45, "low": 12}


def add_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    """Replicate the EXACT inference-time feature engineering (train/serve parity)."""
    out = df.copy()
    for col in TIME_FEATURES + ["water_level_trend", "rain_6h", "soil_saturation"]:
        if col not in out.columns:
            out[col] = 0.0
    out["rain_x_tide"] = out["rainfall_mm"] * out["tide_level"]
    out["water_x_saturation"] = out["water_level_m"] * out["soil_saturation"]
    out["rain_x_season"] = out["rainfall_mm"] * out["seasonal_risk_score"] / 100.0
    out["trend_x_rain6h"] = out["water_level_trend"] * out["rain_6h"]
    out["cumulative_stress"] = (
        out["water_level_m"] * 0.3
        + out["rainfall_mm"] / 300 * 0.25
        + out["soil_saturation"] * 0.2
        + out["tide_level"] / 2 * 0.15
        + out["seasonal_risk_score"] / 100 * 0.1
    )
    return out


def build_monthly_profile(months: pd.Series, labels: np.ndarray) -> Dict[int, float]:
    prof = pd.DataFrame({"month": months.astype(int),
                         "score": [RISK_SCORE_BY_LABEL.get(str(l), 15.0) for l in labels]})
    gmean = float(prof["score"].mean())
    return {m: (float(prof.loc[prof["month"] == m, "score"].mean())
                if (prof["month"] == m).any() else gmean) for m in range(1, 13)}


def make_base_models() -> List[Tuple[str, Any]]:
    """The 5 base learners (names match the deployed bundle)."""
    return [
        ("rf", RandomForestClassifier(n_estimators=300, max_depth=18, min_samples_split=4,
                                      min_samples_leaf=2, class_weight="balanced",
                                      random_state=RNG, n_jobs=-1)),
        ("et", ExtraTreesClassifier(n_estimators=300, max_depth=20, min_samples_split=4,
                                    min_samples_leaf=2, class_weight="balanced",
                                    random_state=RNG, n_jobs=-1)),
        ("gb", GradientBoostingClassifier(n_estimators=200, max_depth=4,
                                          learning_rate=0.08, subsample=0.85, random_state=RNG)),
        ("lgbm", LGBMClassifier(n_estimators=400, max_depth=-1, num_leaves=48,
                                learning_rate=0.05, subsample=0.85, colsample_bytree=0.85,
                                class_weight="balanced", random_state=RNG, n_jobs=-1, verbose=-1)),
        ("xgb", XGBClassifier(n_estimators=400, max_depth=6, learning_rate=0.06,
                              subsample=0.85, colsample_bytree=0.85, min_child_weight=2,
                              random_state=RNG, n_jobs=-1, eval_metric="mlogloss")),
    ]


def jitter(X: pd.DataFrame, frac: float = 0.04) -> pd.DataFrame:
    """Gaussian noise proportional to each column's std — widens the manifold."""
    noise = np.random.normal(0, 1, X.shape) * (X.std(axis=0).values * frac)
    aug = X + noise
    # keep physical floors
    for c in ["water_level_m", "rainfall_mm", "hours_rain", "tide_level",
              "rain_6h", "soil_saturation"]:
        if c in aug.columns:
            aug[c] = aug[c].clip(lower=0)
    return aug


def expected_calibration_error(y_true_enc, probas, n_bins=10) -> float:
    conf = probas.max(axis=1)
    pred = probas.argmax(axis=1)
    correct = (pred == y_true_enc).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        m = (conf > bins[i]) & (conf <= bins[i + 1])
        if m.sum() > 0:
            ece += (m.sum() / len(conf)) * abs(correct[m].mean() - conf[m].mean())
    return float(ece)


def risk_score_from_proba(proba_row, le) -> float:
    s = sum(CLASS_SCORE.get(le.inverse_transform([i])[0], 50) * float(p)
            for i, p in enumerate(proba_row))
    return float(min(100, max(0, s)))


def main():
    ARTIFACT_DIR.mkdir(exist_ok=True)
    print("=" * 72)
    print(f"AegisFlow AI — Flood Risk Trainer v{VERSION}  (leak-free + calibrated)")
    print("=" * 72)

    # ---- Load ----
    csv = DATA_DIR / "flood_danang_clean_balanced.csv"
    df = pd.read_csv(csv)
    print(f"Dataset: {csv.name} | {len(df):,} rows | classes={dict(df['risk_level'].value_counts())}")
    df = add_interaction_features(df)

    X = df[ALL_FEATURES].astype(float)
    y_raw = df["risk_level"].values
    le = LabelEncoder().fit(y_raw)
    y = le.transform(y_raw)
    months = df["month"] if "month" in df else pd.Series(np.ones(len(df)))
    base_year = int(df["year_index"].min()) if "year_index" in df else 2020
    base_year = 2020  # year_index is already an offset in this dataset
    monthly_profile = build_monthly_profile(months, y_raw)
    print(f"Features: {len(ALL_FEATURES)} | classes(enc): {dict(zip(le.classes_, range(len(le.classes_))))}")

    # ---- Honest split ----
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=RNG, stratify=y)
    print(f"Train: {len(Xtr):,} | Test (held-out): {len(Xte):,}")

    # cost-sensitive sample weights: emphasise critical, then high
    crit = le.transform(["critical"])[0]
    high = le.transform(["high"])[0]
    sw = np.ones(len(ytr))
    sw[ytr == crit] = 2.0
    sw[ytr == high] = 1.5

    bases = make_base_models()
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RNG)

    # ---- 1. Leak-free OOF meta-features (the key fix vs v4.1) ----
    print("\n[1/5] Generating out-of-fold base predictions (leak-free stacking)...")
    oof_parts, test_parts = [], []
    fitted_bases = []
    for name, est in bases:
        print(f"   - {name}: 5-fold OOF + refit ...", flush=True)
        oof = cross_val_predict(est, Xtr, ytr, cv=skf, method="predict_proba", n_jobs=-1)
        oof_parts.append(oof)
        # refit on full train + jittered copy for OOD robustness
        Xaug = pd.concat([Xtr, jitter(Xtr)], ignore_index=True)
        yaug = np.concatenate([ytr, ytr])
        swaug = np.concatenate([sw, sw])
        try:
            est.fit(Xaug, yaug, sample_weight=swaug)
        except TypeError:
            est.fit(Xaug, yaug)
        fitted_bases.append((name, est))
        test_parts.append(est.predict_proba(Xte))
    meta_tr = np.hstack(oof_parts)
    meta_te = np.hstack(test_parts)

    # ---- 2. Calibrated meta-model ----
    print("[2/5] Training calibrated Logistic-Regression meta-model...")
    meta_raw = LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced",
                                  multi_class="multinomial", random_state=RNG)
    meta_model = CalibratedClassifierCV(meta_raw, method="isotonic", cv=5)
    meta_model.fit(meta_tr, ytr)

    # ---- 3. Held-out evaluation ----
    print("[3/5] Evaluating on held-out test set...")
    proba_te = meta_model.predict_proba(meta_te)
    pred_te = proba_te.argmax(axis=1)
    acc = accuracy_score(yte, pred_te)
    bacc = balanced_accuracy_score(yte, pred_te)
    f1w = f1_score(yte, pred_te, average="weighted")
    f1m = f1_score(yte, pred_te, average="macro")
    yte_bin = np.eye(len(le.classes_))[yte]
    auc = roc_auc_score(yte_bin, proba_te, multi_class="ovr", average="weighted")
    ece = expected_calibration_error(yte, proba_te)
    brier = float(np.mean([brier_score_loss((yte == k).astype(int), proba_te[:, k])
                           for k in range(len(le.classes_))]))
    per_class = {}
    for i, c in enumerate(le.classes_):
        tmask = (yte == i).astype(int); pmask = (pred_te == i).astype(int)
        per_class[c] = {"precision": round(precision_score(tmask, pmask, zero_division=0), 4),
                        "recall": round(recall_score(tmask, pmask, zero_division=0), 4),
                        "f1": round(f1_score(tmask, pmask, zero_division=0), 4)}
    cm = confusion_matrix(yte, pred_te).tolist()
    print("\n" + classification_report(yte, pred_te, target_names=le.classes_, zero_division=0))
    print(f"  Accuracy={acc:.4f}  BalancedAcc={bacc:.4f}  F1w={f1w:.4f}  F1m={f1m:.4f}  AUC={auc:.4f}")
    print(f"  Calibration:  ECE={ece:.4f}  Brier={brier:.4f}  (lower = better calibrated)")
    print(f"  CRITICAL recall = {per_class['critical']['recall']:.4f}  "
          f"(safety-critical: fraction of true emergencies caught)")

    # ---- 4. Monotonicity stress test (the v4.1 weakness) ----
    print("[4/5] Monotonicity stress test (sweeping water level)...")
    sweep = []
    base_row = {f: float(Xtr[f].median()) for f in ALL_FEATURES}
    for wl in np.arange(0.5, 6.01, 0.5):
        row = dict(base_row); row["water_level_m"] = wl
        row["water_x_saturation"] = wl * row["soil_saturation"]
        row["cumulative_stress"] = (wl*0.3 + row["rainfall_mm"]/300*0.25
                                    + row["soil_saturation"]*0.2 + row["tide_level"]/2*0.15
                                    + row["seasonal_risk_score"]/100*0.1)
        dfr = pd.DataFrame([[row[f] for f in ALL_FEATURES]], columns=ALL_FEATURES)
        mi = np.hstack([m.predict_proba(dfr) for _, m in fitted_bases])
        p = meta_model.predict_proba(mi)[0]
        sweep.append((round(wl, 1), round(risk_score_from_proba(p, le), 1),
                      le.inverse_transform([p.argmax()])[0], round(float(p.max()), 3)))
    scores = [s[1] for s in sweep]
    monotonic = all(scores[i] <= scores[i+1] + 1e-6 for i in range(len(scores)-1))
    print(f"   water_level → risk_score: {[(s[0], s[1], s[2]) for s in sweep]}")
    print(f"   strictly non-decreasing: {monotonic}")

    # ---- 5. SHAP explainability ----
    print("[5/5] Computing SHAP feature attributions (xgb base)...")
    shap_top = {}
    try:
        import shap, matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        xgb_est = dict(fitted_bases)["xgb"]
        expl = shap.TreeExplainer(xgb_est)
        sample = Xte.sample(min(400, len(Xte)), random_state=RNG)
        sv = expl.shap_values(sample)
        sv_stack = np.mean([np.abs(s) for s in sv], axis=0) if isinstance(sv, list) else np.abs(sv).mean(axis=2) if sv.ndim == 3 else np.abs(sv)
        importance = sv_stack.mean(axis=0)
        shap_top = {f: round(float(v), 5) for f, v in sorted(zip(ALL_FEATURES, importance),
                    key=lambda x: -x[1])}
        plt.figure(figsize=(8, 6))
        order = np.argsort(importance)[::-1]
        plt.barh([ALL_FEATURES[i] for i in order][::-1], importance[order][::-1], color="#00B4D8")
        plt.xlabel("mean |SHAP value|"); plt.title("AegisFlow v4.2 — Global Feature Importance (SHAP)")
        plt.tight_layout(); plt.savefig(ARTIFACT_DIR / "shap_feature_importance.png", dpi=130)
        plt.close()
        print(f"   SHAP plot saved → {ARTIFACT_DIR/'shap_feature_importance.png'}")
        print(f"   Top 5: {list(shap_top.items())[:5]}")
    except Exception as e:
        print(f"   SHAP skipped: {e}")

    # ---- Save bundle (EXACT format the service loader expects) ----
    if MODEL_PATH.exists():
        backup = SCRIPT_DIR / "flood_risk_model.v41_backup.pkl"
        shutil.copy2(MODEL_PATH, backup)
        print(f"\nBacked up previous model → {backup.name}")

    import joblib
    metadata = {
        "model_name": "stacking_v42_calibrated_oof_lgbm_xgb_rf_et_gb",
        "accuracy": float(acc),
        "balanced_accuracy": float(bacc),
        "leak_free_stacking": True,
        "calibrated": "isotonic",
        "cost_sensitive": {"critical": 2.0, "high": 1.5},
        "noise_augmented": True,
        "monotonic_stress_pass": bool(monotonic),
        "ece": ece, "brier": brier,
        "shap_top_features": list(shap_top.keys())[:8],
    }
    joblib.dump({
        "model_type": "stacking",
        "base_models": fitted_bases,
        "meta_model": meta_model,
        "label_encoder": le,
        "feature_names": ALL_FEATURES,
        "version": VERSION,
        "trained_at": datetime.now().isoformat(),
        "monthly_risk_profile": {str(k): round(v, 4) for k, v in monthly_profile.items()},
        "base_year": base_year,
        "metadata": metadata,
    }, MODEL_PATH)
    print(f"Model saved → {MODEL_PATH.name}  (v{VERSION})")

    metrics = {
        "version": VERSION,
        "trained_at": datetime.now().isoformat(),
        "algorithm": "Leak-free stacking: RF+ET+GB+LightGBM+XGBoost -> Calibrated(LogReg, isotonic)",
        "dataset": "flood_danang_clean_balanced.csv (8000 rows, balanced 2000/class)",
        "evaluation": "held-out 20% test split (stratified, seed 42)",
        "features": ALL_FEATURES,
        "labels": list(le.classes_),
        "accuracy": round(float(acc), 6),
        "balanced_accuracy": round(float(bacc), 6),
        "weighted_f1": round(float(f1w), 6),
        "macro_f1": round(float(f1m), 6),
        "auc_roc_weighted_ovr": round(float(auc), 6),
        "calibration_ece": round(ece, 6),
        "calibration_brier": round(brier, 6),
        "per_class": per_class,
        "confusion_matrix": cm,
        "monotonic_stress_test": {"pass": bool(monotonic),
                                  "curve": [{"water_level_m": s[0], "risk_score": s[1],
                                             "risk_level": s[2], "confidence": s[3]} for s in sweep]},
        "shap_top_features": shap_top,
        "upgrades_vs_v41": [
            "leak-free out-of-fold stacking (v4.1 used in-sample probabilities)",
            "isotonic probability calibration (trustworthy confidence)",
            "cost-sensitive weights (critical x2, high x1.5)",
            "noise-augmented base learners (OOD robustness)",
            "held-out + calibration + monotonicity reporting",
            "SHAP global explainability",
        ],
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))
    print(f"Metrics saved → {METRICS_PATH.name}")
    print("\n" + "=" * 72)
    print(f"DONE. v{VERSION}  acc={acc:.4f}  bal_acc={bacc:.4f}  AUC={auc:.4f}  "
          f"ECE={ece:.4f}  critical_recall={per_class['critical']['recall']:.4f}  "
          f"monotonic={monotonic}")
    print("=" * 72)


if __name__ == "__main__":
    main()
