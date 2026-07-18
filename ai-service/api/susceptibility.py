#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — API: Flood Susceptibility (Phase 04) + Realtime dynamic risk (Phase 05)
====================================================================================
Endpoints (mounted dưới /api):
  GET /susceptibility/info                     — thông tin model (feature, version, caveat)
  GET /susceptibility/point?lat=&lon=          — susceptibility TĨNH 1 điểm
  GET /susceptibility/grid                     — heatmap tĩnh (GeoJSON precompute)
  GET /risk/live/status                        — trạng thái snapshot live
  GET /risk/live?lat=&lon=[&sim_rain_mm=]      — rủi ro ĐỘNG 1 điểm (susceptibility × live)
  GET /risk/live/grid?[sim_rain_mm=&min_risk=] — heatmap rủi ro động (GeoJSON)
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from services import susceptibility_service as svc
from services import realtime_risk as rr

router = APIRouter()

_DATA = Path(__file__).resolve().parent.parent / "data"
_GRID_GEOJSON = _DATA / "susceptibility_grid.geojson"

_DANANG_BBOX = {"lat": (15.90, 16.20), "lon": (108.0, 108.35)}


def _check_bbox(lat: float, lon: float):
    la = _DANANG_BBOX["lat"]; lo = _DANANG_BBOX["lon"]
    if not (la[0] <= lat <= la[1] and lo[0] <= lon <= lo[1]):
        raise HTTPException(status_code=422, detail=f"(lat,lon) ngoài phạm vi Đà Nẵng {_DANANG_BBOX}")


@router.get("/susceptibility/info")
def susceptibility_info():
    try:
        return svc.model_info()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/susceptibility/point")
def susceptibility_point(lat: float = Query(...), lon: float = Query(...)):
    _check_bbox(lat, lon)
    try:
        row = svc.score_points(_one(lat, lon)).iloc[0]
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"lat": lat, "lon": lon,
            "susceptibility": float(row["susceptibility"]), "level": row["level"]}


@router.get("/susceptibility/grid")
def susceptibility_grid():
    if not _GRID_GEOJSON.exists():
        raise HTTPException(
            status_code=503,
            detail="Chưa có susceptibility_grid.geojson. Chạy scripts/generate_susceptibility_grid.py.",
        )
    return FileResponse(str(_GRID_GEOJSON), media_type="application/geo+json")


@router.get("/risk/live/status")
def risk_live_status():
    return rr.live_status()


@router.get("/risk/live")
def risk_live(lat: float = Query(...), lon: float = Query(...),
              sim_rain_mm: float = Query(None, ge=0, le=500,
                                         description="DEMO: giả lập mưa 24h (mm) đều toàn vùng")):
    _check_bbox(lat, lon)
    try:
        return rr.dynamic_risk(lat, lon, sim_rain_mm=sim_rain_mm)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/risk/live/grid")
def risk_live_grid(sim_rain_mm: float = Query(None, ge=0, le=500),
                   min_risk: float = Query(0.0, ge=0, le=1,
                                           description="Chỉ trả ô có dynamic_risk >= ngưỡng (giảm tải)")):
    try:
        g = rr.dynamic_risk_grid(sim_rain_mm=sim_rain_mm)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    if min_risk > 0:
        g = g[g["dynamic_risk"] >= min_risk]
    feats = [{
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [round(float(r.lon), 5), round(float(r.lat), 5)]},
        "properties": {"dynamic_risk": round(float(r.dynamic_risk), 3),
                       "level": r.dynamic_level,
                       "susceptibility": round(float(r.susceptibility), 3),
                       "live_factor": round(float(r.live_factor), 3)},
    } for r in g.itertuples(index=False)]
    return {
        "type": "FeatureCollection",
        "properties": {
            "layer": "dynamic_flood_risk",
            "n_cells": len(feats),
            "simulated_rain_mm": sim_rain_mm,
            "live": rr.live_status(),
            "formula": ("dynamic_risk = clip(susceptibility × f_live, 0,1); "
                        "f_live rule minh bạch (mưa 24h + mực nước trạm gần nhất). KHÔNG train."),
        },
        "features": feats,
    }


def _one(lat: float, lon: float):
    import pandas as pd
    return pd.DataFrame({"lat": [lat], "lon": [lon]})
