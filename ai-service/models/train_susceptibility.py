#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Train Flood Susceptibility Model (khung / scaffold)
================================================================
Mô hình nhị phân P(vùng dễ ngập) theo VỊ TRÍ, nhãn = dữ liệu ngập THẬT (không circular).

Đây là NGUỒN CHÂN LÝ để tái tạo artifact (chống lỗi "không có script train" của v4.1).
Chạy trong conda env `aegisflow-flood` (xem ai-service/environment.yml).

Pipeline:
  labeled_points.csv (Phase 01)  ×  feature_builder/feature_grid (Phase 02)
    → spatial block CV (KHÔNG random split)  → RF (champion) vs XGBoost (challenger)
    → PR-AUC + ROC-AUC + reliability + confusion trên điểm lũ thật + baseline
    → lưu .pkl + susceptibility_metrics.json + model_card.md (kèm version thư viện)

Chạy:
  python ai-service/models/train_susceptibility.py                 # cần labeled_points.csv (Phase 01)
  python ai-service/models/train_susceptibility.py --self-test     # chỉ kiểm tra PLUMBING (data giả, metric VÔ NGHĨA)

NGUYÊN TẮC: KHÔNG oversample nhân bản. KHÔNG dùng CSV synthetic cũ. KHÔNG dùng GPU (RF = CPU vài giây).
"""

from __future__ import annotations

import argparse
import json
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

# ── Đường dẫn ─────────────────────────────────────────────────────────────────
HERE = Path(__file__).resolve().parent          # ai-service/models
AI_ROOT = HERE.parent                           # ai-service
DATA_DIR = AI_ROOT / "data"
LABELED_POINTS = DATA_DIR / "labeled_points.csv"        # ← Phase 01 sinh ra
FEATURE_GRID = DATA_DIR / "feature_grid.parquet"        # ← Phase 02 sinh ra (tùy chọn)

OUT_MODEL = HERE / "flood_susceptibility_model.pkl"
OUT_METRICS = HERE / "susceptibility_metrics.json"
OUT_CARD = HERE / "model_card.md"

# ── Cấu hình ──────────────────────────────────────────────────────────────────
SEED = 42
N_SPLITS = 5
SPATIAL_BLOCK_KM = 3.0     # kích thước block không gian cho GroupKFold (chống rò rỉ không gian)
# Feature TĨNH theo vị trí — PHẢI khớp với feature_builder (Phase 02).
FEATURE_COLUMNS = ["elevation", "slope", "dist_river", "dist_coast", "historical_score"]
LABEL_COL = "label"        # 1 = điểm ngập thật, 0 = pseudo-absence


# ══════════════════════════════════════════════════════════════════════════════
# 0. Version thư viện — GHI vào artifact để bảo đảm .pkl load được ở production
# ══════════════════════════════════════════════════════════════════════════════
def get_lib_versions() -> dict:
    import sklearn
    versions = {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "scikit-learn": sklearn.__version__,
    }
    try:
        import xgboost
        versions["xgboost"] = xgboost.__version__
    except Exception:
        versions["xgboost"] = None
    return versions


def assert_sklearn_pinned(versions: dict) -> None:
    """Cảnh báo nếu sklearn KHÁC 1.6.0 — .pkl có thể không load được trong ai-service."""
    if versions["scikit-learn"] != "1.6.0":
        warnings.warn(
            f"[CẦU NỐI] scikit-learn={versions['scikit-learn']} KHÁC 1.6.0 của ai-service. "
            f".pkl có thể load lỗi ở production. Ghim scikit-learn=1.6.0 trong environment.yml.",
            stacklevel=2,
        )


# ══════════════════════════════════════════════════════════════════════════════
# 1. Load dữ liệu nhãn thật (Phase 01)
# ══════════════════════════════════════════════════════════════════════════════
def load_labeled_points(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Chưa có {path}. Hãy chạy Phase 01 (build_labeled_dataset.py) trước, "
            f"hoặc dùng --self-test để kiểm tra plumbing.\n"
            f"Schema cần: lat, lon, {LABEL_COL}[, source, water_level_cm]"
        )
    df = pd.read_csv(path)
    need = {"lat", "lon", LABEL_COL}
    missing = need - set(df.columns)
    if missing:
        raise ValueError(f"{path} thiếu cột: {missing}")
    df = df.dropna(subset=["lat", "lon", LABEL_COL]).reset_index(drop=True)
    df[LABEL_COL] = df[LABEL_COL].astype(int)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 2. Gắn feature TĨNH (Phase 02) — DÙNG CHUNG train == serve (chống skew)
# ══════════════════════════════════════════════════════════════════════════════
def attach_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ưu tiên import feature_builder của Phase 02. Nếu chưa có → báo lỗi rõ ràng.
    (Serve-time đọc feature_grid.parquet; train-time có thể tính trực tiếp qua feature_builder.)
    """
    try:
        # Phase 02 sẽ cung cấp: build_feature_frame(df[["lat","lon"]]) -> DataFrame[FEATURE_COLUMNS]
        sys.path.insert(0, str(AI_ROOT / "services"))
        from feature_builder import build_feature_frame  # type: ignore
    except Exception as e:
        raise NotImplementedError(
            "Chưa có ai-service/services/feature_builder.py (Phase 02).\n"
            f"Cần hàm build_feature_frame(df[['lat','lon']]) -> DataFrame các cột {FEATURE_COLUMNS}.\n"
            f"(Import lỗi: {e})"
        )
    feats = build_feature_frame(df[["lat", "lon"]].copy())
    for col in FEATURE_COLUMNS:
        if col not in feats.columns:
            raise ValueError(f"feature_builder thiếu cột feature: {col}")
    out = pd.concat([df.reset_index(drop=True), feats[FEATURE_COLUMNS].reset_index(drop=True)], axis=1)
    return out


# ══════════════════════════════════════════════════════════════════════════════
# 3. Gán block KHÔNG GIAN cho GroupKFold (chống rò rỉ không gian)
# ══════════════════════════════════════════════════════════════════════════════
def assign_spatial_blocks(df: pd.DataFrame, block_km: float = SPATIAL_BLOCK_KM) -> np.ndarray:
    """Chia lưới ~block_km để mọi điểm trong cùng ô -> cùng group (không rơi 2 phía train/test)."""
    dlat = block_km / 111.0
    lat0 = float(df["lat"].mean())
    dlon = block_km / (111.0 * max(np.cos(np.radians(lat0)), 1e-3))
    bi = np.floor(df["lat"].to_numpy() / dlat).astype(int)
    bj = np.floor(df["lon"].to_numpy() / dlon).astype(int)
    # Ghép (bi,bj) thành 1 id nguyên
    return bi.astype(np.int64) * 100000 + bj.astype(np.int64)


# ══════════════════════════════════════════════════════════════════════════════
# 4. Model ứng viên
# ══════════════════════════════════════════════════════════════════════════════
def make_models() -> dict:
    from sklearn.ensemble import RandomForestClassifier
    models = {
        "random_forest": RandomForestClassifier(
            n_estimators=400, max_depth=None, min_samples_leaf=3,
            class_weight="balanced", random_state=SEED, n_jobs=-1,
        ),
    }
    try:
        from xgboost import XGBClassifier
        models["xgboost"] = XGBClassifier(
            n_estimators=400, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, reg_lambda=2.0,
            eval_metric="aucpr", random_state=SEED, n_jobs=-1,
            # scale_pos_weight đặt runtime theo tỉ lệ lớp (xem spatial_cv)
        )
    except Exception as e:
        warnings.warn(f"Bỏ qua XGBoost (import lỗi): {e}", stacklevel=2)
    return models


# ══════════════════════════════════════════════════════════════════════════════
# 5. Spatial cross-validation → PR-AUC (chính) + ROC-AUC
# ══════════════════════════════════════════════════════════════════════════════
def spatial_cv(model_factory, X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> dict:
    from sklearn.model_selection import StratifiedGroupKFold
    from sklearn.metrics import roc_auc_score, average_precision_score
    from sklearn.base import clone

    n_groups = len(np.unique(groups))
    n_splits = int(min(N_SPLITS, n_groups))
    if n_splits < 2:
        return {"error": "Không đủ block không gian để CV (cần >=2).", "n_groups": int(n_groups)}

    skf = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    roc, pr = [], []
    for tr, te in skf.split(X, y, groups):
        m = clone(model_factory)
        # cân bằng cho xgboost nếu có thuộc tính
        if hasattr(m, "scale_pos_weight"):
            pos = max(int(y[tr].sum()), 1)
            neg = max(int((1 - y[tr]).sum()), 1)
            m.set_params(scale_pos_weight=neg / pos)
        m.fit(X[tr], y[tr])
        proba = m.predict_proba(X[te])[:, 1]
        # fold có thể chỉ 1 lớp -> bỏ qua metric fold đó
        if len(np.unique(y[te])) < 2:
            continue
        roc.append(roc_auc_score(y[te], proba))
        pr.append(average_precision_score(y[te], proba))
    return {
        "n_splits_used": n_splits,
        "roc_auc_mean": float(np.mean(roc)) if roc else None,
        "roc_auc_std": float(np.std(roc)) if roc else None,
        "pr_auc_mean": float(np.mean(pr)) if pr else None,
        "pr_auc_std": float(np.std(pr)) if pr else None,
        "roc_auc_per_fold": [float(v) for v in roc],
        "pr_auc_per_fold": [float(v) for v in pr],
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6. Baseline tầm thường (chỉ elevation) — chứng minh ML thêm giá trị
# ══════════════════════════════════════════════════════════════════════════════
def baseline_elevation_only(df: pd.DataFrame, groups: np.ndarray) -> dict:
    """Điểm nguy cơ = -elevation (càng thấp càng dễ ngập). Nếu ML không hơn baseline này -> ML vô ích."""
    from sklearn.metrics import average_precision_score, roc_auc_score
    y = df[LABEL_COL].to_numpy()
    score = -df["elevation"].to_numpy(dtype=float)
    if len(np.unique(y)) < 2:
        return {"error": "một lớp"}
    return {
        "roc_auc": float(roc_auc_score(y, score)),
        "pr_auc": float(average_precision_score(y, score)),
        "note": "baseline = -elevation (không ML). ML champion phải vượt mức này.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# 7. Lưu artifact + metrics + model_card
# ══════════════════════════════════════════════════════════════════════════════
def save_artifacts(best_name, best_model, feature_names, cv_all, baseline, counts, versions, df):
    import joblib
    from sklearn.metrics import classification_report, confusion_matrix

    # Confusion trên toàn bộ (train-fit) — chỉ tham khảo; số THẬT là spatial-CV ở trên.
    y = df[LABEL_COL].to_numpy()
    proba_full = best_model.predict_proba(df[feature_names].to_numpy())[:, 1]
    pred_full = (proba_full >= 0.5).astype(int)

    created = datetime.now(timezone.utc).isoformat()
    artifact = {
        "model": best_model,
        "model_type": f"susceptibility_{best_name}",
        "feature_names": feature_names,
        "classes": [0, 1],
        "metadata": {
            "created_at": created,
            "trained_on": "windows-conda:aegisflow-flood",
            "library_versions": versions,      # ← để production kiểm tra tương thích .pkl
            "label_source": "real flood reports 2022-10-14 + chronic spots (presence) + terrain pseudo-absence",
            "counts": counts,
            "cv_summary": {k: cv_all[k].get("pr_auc_mean") for k in cv_all},
            "caveats": "presence-only; single flood event (14/10/2022); metric = spatial-CV, KHÔNG phải random split",
        },
    }
    joblib.dump(artifact, OUT_MODEL)

    metrics = {
        "version": "susceptibility-1.0.0",
        "created_at": created,
        "champion": best_name,
        "cv_scheme": f"StratifiedGroupKFold(n={N_SPLITS}) theo block ~{SPATIAL_BLOCK_KM}km",
        "counts": counts,
        "candidates_cv": cv_all,
        "baseline_elevation_only": baseline,
        "library_versions": versions,
        "features": feature_names,
        "confusion_full_fit_reference": confusion_matrix(y, pred_full).tolist(),
        "classification_report_full_fit_reference": classification_report(y, pred_full, output_dict=True, zero_division=0),
        "data_quality_note": "Nhãn từ dữ liệu ngập thật (presence) + pseudo-absence. Metric TRUNG THỰC là spatial-CV PR-AUC. KHÔNG dùng số này như '98.81%' cũ.",
    }
    OUT_METRICS.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

    champ_cv = cv_all.get(best_name, {})
    card = f"""# Model Card — Flood Susceptibility (Đà Nẵng)

**Tạo:** {created} · **Champion:** `{best_name}` · **Loại:** phân loại nhị phân P(vùng dễ ngập)

## Nhãn (KHÔNG circular)
- Positive: {counts.get('n_pos','?')} điểm ngập THẬT (báo cáo 14/10/2022 + điểm kinh niên).
- Negative: {counts.get('n_neg','?')} pseudo-absence lấy mẫu theo địa hình (gồm hard negatives).

## Feature (tĩnh theo vị trí)
{", ".join(feature_names)}

## Đánh giá TRUNG THỰC (spatial cross-validation)
- Scheme: StratifiedGroupKFold theo block ~{SPATIAL_BLOCK_KM}km (chống rò rỉ không gian).
- **PR-AUC:** {champ_cv.get('pr_auc_mean')}  (±{champ_cv.get('pr_auc_std')})
- **ROC-AUC:** {champ_cv.get('roc_auc_mean')}  (±{champ_cv.get('roc_auc_std')})
- Baseline (-elevation): PR-AUC={baseline.get('pr_auc')}, ROC-AUC={baseline.get('roc_auc')}. Champion phải vượt baseline.

## HẠN CHẾ (phải nêu với giám khảo)
- **Presence-only:** "không có báo cáo" ≠ "không ngập" → pseudo-absence có bias; đã giảm thiểu bằng hard negatives, báo cả PR-AUC.
- **Một sự kiện:** hiệu chỉnh theo trận 14/10/2022 → khái quát theo KHÔNG GIAN, không theo thời gian.
- Không dùng để dự báo mực nước theo giờ (thiếu chuỗi thời gian).

## Version thư viện (để tái tạo & load .pkl)
{json.dumps(versions, ensure_ascii=False)}
"""
    OUT_CARD.write_text(card, encoding="utf-8")


# ══════════════════════════════════════════════════════════════════════════════
# Self-test: CHỈ kiểm tra plumbing (conda env chạy được). Metric VÔ NGHĨA.
# ══════════════════════════════════════════════════════════════════════════════
def _generate_smoketest_fixture(n: int = 600) -> pd.DataFrame:
    warnings.warn(
        "⚠️ SELF-TEST: đang dùng DATA GIẢ chỉ để kiểm tra code chạy. "
        "MỌI METRIC IN RA ĐỀU VÔ NGHĨA — KHÔNG báo cáo, KHÔNG commit .pkl từ chế độ này.",
        stacklevel=2,
    )
    rng = np.random.default_rng(SEED)
    lat = 16.0 + rng.random(n) * 0.1
    lon = 108.15 + rng.random(n) * 0.15
    elevation = rng.random(n) * 20
    # nhãn giả tương quan yếu với elevation (chỉ để pipeline có 2 lớp)
    p = 1 / (1 + np.exp((elevation - 6)))
    label = (rng.random(n) < p).astype(int)
    df = pd.DataFrame({"lat": lat, "lon": lon, LABEL_COL: label})
    df["elevation"] = elevation
    df["slope"] = rng.random(n) * 10
    df["dist_river"] = rng.random(n) * 2000
    df["dist_coast"] = rng.random(n) * 5000
    df["historical_score"] = rng.random(n) * 100
    return df


# ══════════════════════════════════════════════════════════════════════════════
def main():
    ap = argparse.ArgumentParser(description="Train Flood Susceptibility Model")
    ap.add_argument("--self-test", action="store_true",
                    help="Chạy với DATA GIẢ để kiểm tra plumbing (metric vô nghĩa)")
    ap.add_argument("--no-shap", action="store_true", help="Bỏ qua SHAP")
    args = ap.parse_args()

    versions = get_lib_versions()
    assert_sklearn_pinned(versions)
    print("[versions]", json.dumps(versions, ensure_ascii=False))

    # 1-2) Data + features
    if args.self_test:
        df = _generate_smoketest_fixture()
    else:
        df = load_labeled_points(LABELED_POINTS)
        df = attach_features(df)

    df = df.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)
    counts = {"n_total": int(len(df)),
              "n_pos": int(df[LABEL_COL].sum()),
              "n_neg": int((df[LABEL_COL] == 0).sum())}
    print("[counts]", counts)

    X = df[FEATURE_COLUMNS].to_numpy(dtype=float)
    y = df[LABEL_COL].to_numpy(dtype=int)
    groups = assign_spatial_blocks(df)
    print(f"[spatial] {len(np.unique(groups))} block (~{SPATIAL_BLOCK_KM}km)")

    # 3-5) CV cho từng ứng viên
    models = make_models()
    cv_all = {name: spatial_cv(m, X, y, groups) for name, m in models.items()}
    for name, rep in cv_all.items():
        print(f"[cv:{name}] PR-AUC={rep.get('pr_auc_mean')} ROC-AUC={rep.get('roc_auc_mean')}")

    # 6) Chọn champion theo PR-AUC
    def pr(name): return (cv_all[name].get("pr_auc_mean") or -1)
    best_name = max(models, key=pr)
    print(f"[champion] {best_name} (PR-AUC={pr(best_name)})")

    # 7) Baseline
    baseline = baseline_elevation_only(df, groups)
    print(f"[baseline -elevation] PR-AUC={baseline.get('pr_auc')} ROC-AUC={baseline.get('roc_auc')}")

    # 8) Fit champion trên toàn bộ + lưu
    from sklearn.base import clone
    best_model = clone(models[best_name])
    if hasattr(best_model, "scale_pos_weight"):
        pos = max(int(y.sum()), 1); neg = max(int((1 - y).sum()), 1)
        best_model.set_params(scale_pos_weight=neg / pos)
    best_model.fit(X, y)

    # 9) SHAP (tùy chọn)
    if not args.no_shap:
        try:
            import shap
            expl = shap.TreeExplainer(best_model)
            sv = expl.shap_values(X[: min(len(X), 500)])
            imp = np.abs(np.array(sv)).mean(axis=tuple(range(np.array(sv).ndim - 1)))
            order = np.argsort(imp)[::-1]
            print("[shap importance]", [(FEATURE_COLUMNS[i], round(float(imp[i]), 4)) for i in order])
        except Exception as e:
            warnings.warn(f"Bỏ qua SHAP: {e}", stacklevel=2)

    if args.self_test:
        print("\n✅ SELF-TEST xong: conda env + pipeline chạy OK. "
              "KHÔNG lưu artifact (data giả). Dùng dữ liệu thật (Phase 01/02) để train thật.")
        return

    save_artifacts(best_name, best_model, FEATURE_COLUMNS, cv_all, baseline, counts, versions, df)
    print(f"\n✅ Đã lưu:\n  {OUT_MODEL}\n  {OUT_METRICS}\n  {OUT_CARD}")
    print("→ Nhớ smoke-test load .pkl trong môi trường pip (scikit-learn==1.6.0) rồi git add commit.")


if __name__ == "__main__":
    main()
