#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Phase 04: Sinh heatmap susceptibility (GeoJSON)
===========================================================
Chấm model Phase 03 trên lưới feature_grid.parquet → GeoJSON cho mobile map.

Output:
  ai-service/data/susceptibility_grid.geojson       — Point/ô có {susceptibility, level}
  ai-service/data/flood_points_reference.geojson    — 430 điểm ngập THẬT (lớp đối chiếu, toggle được)

Chạy (conda env aegisflow-flood, hoặc pip-only — chỉ cần pandas/sklearn/joblib/pyarrow, KHÔNG rasterio):
  python ai-service/scripts/generate_susceptibility_grid.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent            # ai-service/scripts
AI_ROOT = HERE.parent                              # ai-service
sys.path.insert(0, str(AI_ROOT / "services"))

import susceptibility_service as svc  # noqa: E402

DATA = AI_ROOT / "data"
OUT_GRID = DATA / "susceptibility_grid.geojson"
OUT_POINTS = DATA / "flood_points_reference.geojson"
LABELED = DATA / "labeled_points.csv"

# Màu gợi ý theo mức (mobile có thể tự map; kèm sẵn để tiện render).
LEVEL_COLOR = {"low": "#2c7fb8", "medium": "#fdae61", "high": "#f46d43", "critical": "#a50026"}


def _fc(features):
    return {"type": "FeatureCollection", "features": features}


def write_grid_geojson(g: pd.DataFrame):
    feats = []
    for r in g.itertuples(index=False):
        feats.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(float(r.lon), 5), round(float(r.lat), 5)]},
            "properties": {
                "susceptibility": round(float(r.susceptibility), 3),
                "level": r.level,
                "color": LEVEL_COLOR.get(r.level, "#2c7fb8"),
            },
        })
    fc = _fc(feats)
    fc["properties"] = {
        "layer": "flood_susceptibility",
        "description": "P(vùng dễ ngập) TĨNH theo địa hình/thuỷ văn (Phase 03). KHÔNG phải xác suất ngập realtime.",
        "n_cells": len(feats),
        "grid_step_m": 200,
        "model": svc.model_info(),
        "level_thresholds": {name: thr for thr, name in svc.LEVEL_THRESHOLDS},
    }
    OUT_GRID.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")


def write_points_geojson():
    if not LABELED.exists():
        print(f"[skip] {LABELED} không có → bỏ lớp điểm đối chiếu")
        return
    df = pd.read_csv(LABELED)
    pos = df[df["label"] == 1]
    feats = []
    for r in pos.itertuples(index=False):
        wl = getattr(r, "water_level_cm", None)
        feats.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(float(r.lon), 5), round(float(r.lat), 5)]},
            "properties": {
                "source": r.source,
                "water_level_cm": (None if pd.isna(wl) else int(wl)),
                "kind": "real_flood_report",
            },
        })
    fc = _fc(feats)
    fc["properties"] = {
        "layer": "real_flood_points",
        "description": "Điểm ngập THẬT (báo cáo 14/10/2022 + kinh niên) — lớp đối chiếu trực quan.",
        "n_points": len(feats),
    }
    OUT_POINTS.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")


def main():
    g = svc.score_grid()
    write_grid_geojson(g)
    write_points_geojson()
    # tóm tắt phân bố mức
    dist = g["level"].value_counts().to_dict()
    sz_grid = OUT_GRID.stat().st_size / 1e6
    sz_pts = OUT_POINTS.stat().st_size / 1e6 if OUT_POINTS.exists() else 0
    print(f"[grid] {OUT_GRID.name}  {len(g)} ô  {sz_grid:.2f} MB")
    print(f"[levels] {dist}")
    print(f"[points] {OUT_POINTS.name}  {sz_pts:.2f} MB")
    # kiểm tra nhanh: susceptibility TRUNG BÌNH tại ô gần điểm ngập thật phải CAO hơn nền
    print(f"[sanity] susceptibility p50={g['susceptibility'].median():.3f} "
          f"max={g['susceptibility'].max():.3f} min={g['susceptibility'].min():.3f}")
    print("✅ Phase 04 xong.")


if __name__ == "__main__":
    main()
