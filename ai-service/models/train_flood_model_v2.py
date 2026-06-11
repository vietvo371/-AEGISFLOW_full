# -*- coding: utf-8 -*-
"""
AegisFlow AI — Enhanced Flood Risk Model Training v3
So sánh RandomForest, XGBoost, Neural Network (MLP) và ensemble model.

Cải tiến v3:
- Thêm features: water_level_trend, rain_6h, soil_saturation
- Dữ liệu episode-based thực tế hơn
- Class balance tốt hơn
"""

import json
import joblib
import warnings
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier, VotingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    classification_report, f1_score, precision_score, recall_score,
    accuracy_score, confusion_matrix, roc_auc_score, balanced_accuracy_score
)
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("XGBoost not available, skipping...")

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
MODEL_DIR = SCRIPT_DIR

# v3: includes 3 new time-series features
BASE_FEATURES = ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score",
                 "water_level_trend", "rain_6h", "soil_saturation"]
TIME_FEATURES = ["month", "year_index", "month_sin", "month_cos", "seasonal_risk_score"]
ALL_FEATURES = BASE_FEATURES + TIME_FEATURES

RISK_SCORE_BY_LABEL = {
    "low": 15.0, "medium": 45.0, "high": 70.0, "critical": 90.0,
}


def load_dataset() -> Tuple[pd.DataFrame, np.ndarray, pd.DataFrame]:
    # Ưu tiên dùng augmented dataset (có real flood events từ 2022)
    augmented = DATA_DIR / "flood_danang_2019_2024_augmented.csv"
    base = DATA_DIR / "flood_danang_2019_2024.csv"
    csv_path = augmented if augmented.exists() else base
    print(f"Loading dataset: {csv_path.name}")
    df = pd.read_csv(csv_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp", "risk_level"]).reset_index(drop=True)

    # Fill missing new features with 0 for backward compat
    for col in ["water_level_trend", "rain_6h", "soil_saturation"]:
        if col not in df.columns:
            df[col] = 0.0

    X = df[BASE_FEATURES + ["timestamp"]].copy()
    y = df["risk_level"].values
    return X, y, df


def build_monthly_profile(timestamps: pd.Series, labels: np.ndarray) -> Dict[int, float]:
    profile_df = pd.DataFrame({
        "month": pd.to_datetime(timestamps).dt.month,
        "risk_score": [RISK_SCORE_BY_LABEL.get(str(label), 15.0) for label in labels],
    })
    global_mean = float(profile_df["risk_score"].mean())
    return {
        month: float(profile_df.loc[profile_df["month"] == month, "risk_score"].mean())
        if (profile_df["month"] == month).any() else global_mean
        for month in range(1, 13)
    }


def add_time_features(X: pd.DataFrame, monthly_profile: Dict[int, float], base_year: int) -> np.ndarray:
    timestamps = pd.to_datetime(X["timestamp"], errors="coerce").fillna(pd.Timestamp(datetime.now()))
    month = timestamps.dt.month.astype(float)
    year_index = (timestamps.dt.year - base_year).astype(float)

    enriched = X[BASE_FEATURES].copy()
    enriched["month"] = month
    enriched["year_index"] = year_index
    enriched["month_sin"] = np.sin(2 * np.pi * month / 12)
    enriched["month_cos"] = np.cos(2 * np.pi * month / 12)
    enriched["seasonal_risk_score"] = month.astype(int).map(monthly_profile).astype(float)

    return enriched[ALL_FEATURES].values


def compute_class_weights(y: np.ndarray) -> Dict:
    label_counts = pd.Series(y).value_counts()
    n_samples = len(y)
    n_classes = len(label_counts)
    return {cls: n_samples / (n_classes * count) for cls, count in label_counts.items()}


def create_models(class_weight: Dict) -> Dict[str, Any]:
    models = {}

    models["random_forest"] = RandomForestClassifier(
        n_estimators=300,
        max_depth=18,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight=class_weight,
        random_state=42,
        n_jobs=-1,
    )

    models["extra_trees"] = ExtraTreesClassifier(
        n_estimators=300,
        max_depth=20,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight=class_weight,
        random_state=42,
        n_jobs=-1,
    )

    if HAS_XGBOOST:
        # XGBoost uses scale_pos_weight per class, use balanced approach
        models["xgboost"] = XGBClassifier(
            n_estimators=300,
            max_depth=8,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=2,
            random_state=42,
            n_jobs=-1,
            eval_metric='mlogloss',
        )

    models["neural_network"] = Pipeline(steps=[
        ("scaler", StandardScaler()),
        ("mlp", MLPClassifier(
            hidden_layer_sizes=(256, 128, 64, 32),
            activation='relu',
            solver='adam',
            alpha=0.0005,
            batch_size=64,
            learning_rate='adaptive',
            learning_rate_init=0.001,
            max_iter=600,
            early_stopping=True,
            validation_fraction=0.1,
            n_iter_no_change=25,
            random_state=42,
        )),
    ])

    return models


def train_model(name: str, model, X_train, y_train) -> Any:
    print(f"\n  Training {name}...")
    start = datetime.now()
    model.fit(X_train, y_train)
    elapsed = (datetime.now() - start).total_seconds()
    print(f"    Done in {elapsed:.2f}s")
    return model


def evaluate_model(name: str, model, X_train, y_train, X_test, y_test, label_encoder) -> Dict[str, Any]:
    y_pred = model.predict(X_test)

    results = {
        "name": name,
        "accuracy": accuracy_score(y_test, y_pred),
        "balanced_accuracy": balanced_accuracy_score(y_test, y_pred),
        "f1_weighted": f1_score(y_test, y_pred, average="weighted", zero_division=0),
        "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
        "precision_weighted": precision_score(y_test, y_pred, average="weighted", zero_division=0),
        "recall_weighted": recall_score(y_test, y_pred, average="weighted", zero_division=0),
    }

    results["per_class"] = {}
    for class_index, cls in enumerate(label_encoder.classes_):
        mask_true = [1 if yy == class_index else 0 for yy in y_test]
        mask_pred = [1 if yy == class_index else 0 for yy in y_pred]
        results["per_class"][str(cls)] = {
            "precision": precision_score(mask_true, mask_pred, zero_division=0),
            "recall": recall_score(mask_true, mask_pred, zero_division=0),
            "f1": f1_score(mask_true, mask_pred, zero_division=0),
        }

    try:
        if hasattr(model, 'predict_proba'):
            y_proba = model.predict_proba(X_test)
            from sklearn.preprocessing import label_binarize
            y_test_bin = label_binarize(y_test, classes=range(len(label_encoder.classes_)))
            results["auc_roc"] = roc_auc_score(y_test_bin, y_proba, multi_class="ovr", average="weighted")
        else:
            results["auc_roc"] = None
    except Exception:
        results["auc_roc"] = None

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_weighted", n_jobs=-1)
    results["cv_f1_mean"] = float(cv_scores.mean())
    results["cv_f1_std"] = float(cv_scores.std())
    results["confusion_matrix"] = confusion_matrix(y_test, y_pred).tolist()

    print("\n  Classification report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_, zero_division=0))
    print(f"  {name}: Accuracy={results['accuracy']:.4f} | F1(w)={results['f1_weighted']:.4f} | "
          f"F1(mac)={results['f1_macro']:.4f} | CV={results['cv_f1_mean']:.4f}±{results['cv_f1_std']:.4f}")

    return results


def create_ensemble(models: Dict) -> VotingClassifier:
    estimators = [
        ('rf', models["random_forest"]["model"]),
        ('et', models["extra_trees"]["model"]),
        ('nn', models["neural_network"]["model"]),
    ]
    if HAS_XGBOOST and "xgboost" in models:
        estimators.append(('xgb', models["xgboost"]["model"]))
    return VotingClassifier(estimators=estimators, voting='soft', n_jobs=1)


def save_model(name, model, label_encoder, feature_names, version, metrics, monthly_profile, base_year) -> Path:
    model_path = MODEL_DIR / "flood_risk_model.pkl"
    metadata = {
        "model_name": name,
        "model_version": version,
        "trained_at": datetime.now().isoformat(),
        "feature_names": feature_names,
        "label_classes": list(label_encoder.classes_),
        "monthly_risk_profile": {str(k): round(v, 4) for k, v in monthly_profile.items()},
        "base_year": base_year,
        "metrics": metrics,
        "new_features": ["water_level_trend", "rain_6h", "soil_saturation"],
    }
    joblib.dump({
        "model": model,
        "label_encoder": label_encoder,
        "feature_names": feature_names,
        "version": version,
        "trained_at": datetime.now().isoformat(),
        "monthly_risk_profile": {str(k): round(v, 4) for k, v in monthly_profile.items()},
        "base_year": base_year,
        "metadata": metadata,
    }, model_path)
    return model_path


def main():
    warnings.filterwarnings("ignore")

    print("=" * 70)
    print("AegisFlow AI — Flood Risk Model Training v3")
    print(f"New features: water_level_trend, rain_6h, soil_saturation")
    print("=" * 70)
    print(f"Started at: {datetime.now().isoformat()}\n")

    print("Loading dataset...")
    X_raw, y, df = load_dataset()
    print(f"Dataset: {X_raw.shape[0]} samples, {len(ALL_FEATURES)} total features")
    print(f"Classes: {pd.Series(y).value_counts().to_dict()}")

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    print(f"Label encoding: {dict(zip(label_encoder.classes_, range(len(label_encoder.classes_))))}")

    X_train_raw, X_test_raw, y_train, y_test, labels_train, _ = train_test_split(
        X_raw, y_encoded, y, test_size=0.2, random_state=42, stratify=y_encoded
    )
    monthly_profile = build_monthly_profile(X_train_raw["timestamp"], labels_train)
    base_year = int(pd.to_datetime(X_train_raw["timestamp"]).dt.year.min())
    X_train = add_time_features(X_train_raw, monthly_profile, base_year)
    X_test = add_time_features(X_test_raw, monthly_profile, base_year)

    print(f"\nTrain: {len(X_train)} | Test: {len(X_test)}")
    print("Monthly risk profile:")
    for month, score in monthly_profile.items():
        print(f"  month {month:02d}: {score:.1f}")

    class_weight = compute_class_weights(y_train)
    print(f"\nClass weights: {class_weight}")

    print("\n" + "=" * 50)
    print("TRAINING MODELS")
    print("=" * 50)

    models = create_models(class_weight)
    trained_models = {}
    all_results = []

    for name, model in models.items():
        print(f"\n[{name.upper()}]")
        model = train_model(name, model, X_train, y_train)
        results = evaluate_model(name, model, X_train, y_train, X_test, y_test, label_encoder)
        trained_models[name] = {"model": model}
        all_results.append(results)

    print("\n" + "=" * 50)
    print("ENSEMBLE MODEL")
    print("=" * 50)
    ensemble = create_ensemble(trained_models)
    print("\n  Training ensemble (soft voting)...")
    ensemble.fit(X_train, y_train)
    ensemble_results = evaluate_model("ensemble", ensemble, X_train, y_train, X_test, y_test, label_encoder)
    all_results.append(ensemble_results)
    trained_models["ensemble"] = {"model": ensemble}

    print("\n" + "=" * 50)
    print("MODEL COMPARISON")
    print("=" * 50)
    print(f"\n{'Model':<20} {'Accuracy':<12} {'F1 (w)':<12} {'F1 (mac)':<12} {'CV F1':<12}")
    print("-" * 70)

    best_model = None
    best_score = 0
    for r in all_results:
        cv = f"{r['cv_f1_mean']:.4f}±{r['cv_f1_std']:.2f}"
        print(f"{r['name']:<20} {r['accuracy']:<12.4f} {r['f1_weighted']:<12.4f} {r['f1_macro']:<12.4f} {cv:<12}")
        if r['f1_weighted'] > best_score:
            best_score = r['f1_weighted']
            best_model = r['name']

    print(f"\nBest model: {best_model} (F1 weighted: {best_score:.4f})")

    # Use ensemble if competitive
    if ensemble_results['f1_weighted'] >= best_score - 0.005:
        final_model_name = "ensemble"
        print("Using ensemble (competitive performance)")
    else:
        final_model_name = best_model
        print(f"Using {final_model_name}")

    final_model = trained_models[final_model_name]["model"]
    final_results = next(r for r in all_results if r["name"] == final_model_name)
    version = "3.0.0"

    model_path = save_model(
        final_model_name, final_model, label_encoder, ALL_FEATURES,
        version, final_results, monthly_profile, base_year,
    )
    print(f"\nModel saved: {model_path} (v{version})")

    # Feature importance
    if final_model_name in ("random_forest", "extra_trees"):
        rf_imp = final_model.feature_importances_
    elif final_model_name == "ensemble":
        # Use RF component
        for est_name, est in final_model.named_estimators_.items():
            if hasattr(est, 'feature_importances_'):
                rf_imp = est.feature_importances_
                break
        else:
            rf_imp = None
    else:
        rf_imp = None

    if rf_imp is not None:
        print("\nFeature Importance:")
        for fname, imp in sorted(zip(ALL_FEATURES, rf_imp), key=lambda x: -x[1]):
            bar = "█" * int(imp * 100)
            print(f"  {fname:25s}: {imp:.4f} {bar}")

    comparison_path = MODEL_DIR / "model_comparison.json"
    with open(comparison_path, "w") as f:
        json.dump({
            "trained_at": datetime.now().isoformat(),
            "version": version,
            "dataset_samples": int(X_raw.shape[0]),
            "test_samples": len(X_test),
            "features": ALL_FEATURES,
            "new_features_v3": ["water_level_trend", "rain_6h", "soil_saturation"],
            "monthly_risk_profile": {str(k): round(v, 4) for k, v in monthly_profile.items()},
            "base_year": base_year,
            "results": all_results,
            "best_model": best_model,
            "selected_model": final_model_name,
        }, f, indent=2, default=str)

    metrics_path = MODEL_DIR / "model_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump({
            "model_name": f"AegisFlow Flood Nowcasting {final_model_name.title()} v3",
            "version": version,
            "trained_at": datetime.now().isoformat(),
            "algorithm": final_model_name,
            "framework": "scikit-learn/xgboost",
            "dataset": "flood_danang_2019_2024_augmented.csv (synthetic + 391 real events)",
            "dataset_samples": int(X_train.shape[0] + X_test.shape[0]),
            "test_samples": int(X_test.shape[0]),
            "dataset_features": ALL_FEATURES,
            "dataset_classes": list(label_encoder.classes_),
            "new_features": ["water_level_trend", "rain_6h", "soil_saturation"],
            "prediction_horizons_minutes": [30, 60],
            "data_quality_note": (
                "v3: Episode-based time-series synthetic data with trend/accumulation features. "
                "Model captures rising water trends and soil saturation effects. "
                "Class-balanced training with at least 150 critical samples."
            ),
            "monthly_risk_profile": {str(k): round(v, 4) for k, v in monthly_profile.items()},
            "base_year": base_year,
            "accuracy": final_results["accuracy"],
            "balanced_accuracy": final_results["balanced_accuracy"],
            "f1_weighted": final_results["f1_weighted"],
            "f1_macro": final_results["f1_macro"],
            "precision_weighted": final_results["precision_weighted"],
            "recall_weighted": final_results["recall_weighted"],
            "auc_roc": final_results.get("auc_roc"),
            "cv_f1_mean": final_results["cv_f1_mean"],
            "cv_f1_std": final_results["cv_f1_std"],
            "per_class": final_results["per_class"],
            "confusion_matrix": final_results["confusion_matrix"],
        }, f, indent=2, default=str)

    print(f"\nMetrics saved: {metrics_path}")

    print("\n" + "=" * 70)
    print("FINAL SUMMARY")
    print("=" * 70)
    print(f"Model:               {final_model_name} v{version}")
    print(f"Accuracy:            {final_results['accuracy']:.4f}")
    print(f"Balanced Accuracy:   {final_results['balanced_accuracy']:.4f}")
    print(f"F1 Weighted:         {final_results['f1_weighted']:.4f}")
    print(f"F1 Macro:            {final_results['f1_macro']:.4f}")
    if final_results.get('auc_roc'):
        print(f"AUC-ROC:             {final_results['auc_roc']:.4f}")
    print(f"CV F1:               {final_results['cv_f1_mean']:.4f} ± {final_results['cv_f1_std']:.4f}")
    print("\nPer-class F1:")
    for cls, m in final_results['per_class'].items():
        print(f"  {cls:10s}: P={m['precision']:.2f}, R={m['recall']:.2f}, F1={m['f1']:.2f}")
    print(f"\nCompleted at: {datetime.now().isoformat()}")

    return all_results


if __name__ == "__main__":
    main()
