#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Susceptibility serve-time service (Phase 04/05)
===========================================================
Chấm điểm P(vùng dễ ngập) TĨNH theo vị trí, dùng CHUNG cho:
  • Phase 04 heatmap (score cả lưới feature_grid.parquet),
  • Phase 05 realtime (score 1 điểm rồi nhân hệ số live).

Serve-time thuần pip: joblib + sklearn(1.6.0) + pandas + (scipy/pyarrow qua feature_builder.lookup_features).
KHÔNG cần rasterio/GDAL. Model đọc từ flood_susceptibility_model.pkl (Phase 03), CHỌN cột theo
feature_names_in_ (model fit trên DataFrame → sklearn tự báo lỗi nếu sai cột).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, Dict, Any

import joblib
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent          # ai-service/services
# Cho phép import sibling (feature_builder) cả khi chạy script LẪN khi app import qua package `services`.
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
AI_ROOT = HERE.parent                            # ai-service
MODEL_PATH = AI_ROOT / "models" / "flood_susceptibility_model.pkl"
GRID_PATH = AI_ROOT / "data" / "feature_grid.parquet"

# Ngưỡng mức nguy cơ trên thang susceptibility 0..1 (minh bạch, không train).
LEVEL_THRESHOLDS = [(0.75, "critical"), (0.50, "high"), (0.25, "medium"), (0.0, "low")]

_cache: Optional[Dict[str, Any]] = None
_grid_cache: Optional[pd.DataFrame] = None


def _load() -> Dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Chưa có {MODEL_PATH}. Chạy Phase 03 (train_susceptibility.py) trước."
        )
    d = joblib.load(MODEL_PATH)
    model = d["model"]
    feats = list(d.get("feature_names") or getattr(model, "feature_names_in_", []))
    _cache = {
        "model": model,
        "feature_names": feats,
        "model_type": d.get("model_type", "susceptibility"),
        "metadata": d.get("metadata", {}),
    }
    return _cache


def level_for(susc: float) -> str:
    for thr, name in LEVEL_THRESHOLDS:
        if susc >= thr:
            return name
    return "low"


def score_frame(feat_df: pd.DataFrame) -> np.ndarray:
    """feat_df: DataFrame CHỨA (ít nhất) các cột feature_names của model → P(dễ ngập) [0..1]."""
    st = _load()
    feats = st["feature_names"]
    missing = [c for c in feats if c not in feat_df.columns]
    if missing:
        raise ValueError(f"Thiếu cột feature cho model: {missing}")
    X = feat_df[feats]  # DataFrame (đúng tên/thứ tự) → sklearn name-validate
    return st["model"].predict_proba(X)[:, 1].astype(float)


def score_points(latlon: pd.DataFrame) -> pd.DataFrame:
    """latlon: DataFrame['lat','lon'] → thêm cột susceptibility + level. Dùng lookup_features (serve)."""
    from feature_builder import lookup_features  # lazy; serve-time không cần rasterio
    feats = lookup_features(latlon[["lat", "lon"]])
    susc = score_frame(feats)
    out = latlon.reset_index(drop=True).copy()
    out["susceptibility"] = np.round(susc, 4)
    out["level"] = [level_for(s) for s in susc]
    return out


def score_grid() -> pd.DataFrame:
    """Chấm điểm TOÀN lưới feature_grid.parquet (cache). Trả grid + susceptibility + level."""
    global _grid_cache
    if _grid_cache is not None:
        return _grid_cache
    if not GRID_PATH.exists():
        raise FileNotFoundError(f"Chưa có {GRID_PATH}. Chạy Phase 02 (feature_builder --build-grid).")
    g = pd.read_parquet(GRID_PATH)
    susc = score_frame(g)
    g = g.copy()
    g["susceptibility"] = np.round(susc, 4)
    g["level"] = [level_for(s) for s in susc]
    _grid_cache = g
    return g


def model_info() -> Dict[str, Any]:
    st = _load()
    meta = st["metadata"]
    return {
        "model_type": st["model_type"],
        "features": st["feature_names"],
        "trained_at": meta.get("created_at"),
        "library_versions": meta.get("library_versions"),
        "caveats": meta.get("caveats"),
    }


def reload():
    global _cache, _grid_cache
    _cache = None
    _grid_cache = None
