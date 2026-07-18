#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Phase 05: Realtime dynamic risk (Phần B)
====================================================
Kết hợp susceptibility TĨNH (Phase 03/04) với dữ liệu mưa/nước LIVE từ muangap:

    dynamic_risk(loc) = clip( susceptibility(loc) × f_live(loc), 0, 1 )

f_live là RULE MINH BẠCH (KHÔNG train, không giả vờ ML):
    rain_norm  = clip(rain_24h / RAIN_HEAVY_MM, 0, 1)      # mưa 24h của trạm mưa gần nhất
    water_norm = clip(water_m  / FLOOD_TOWER_M, 0, 1)      # mực nước trạm gần nhất (ngưỡng 'Tháp báo ngập' 1.5m)
    intensity  = clip(max(rain_norm, water_norm) + 0.3·min(rain_norm, water_norm), 0, 1)
    f_live     = F_MIN + (F_MAX − F_MIN)·intensity          # khô→F_MIN, cực đoan→F_MAX

Fallback: thiếu/khô snapshot → f_live≈F_MIN (khô) hoặc 1.0 (thiếu hẳn) → rủi ro về gần susceptibility nền.
Nguồn snapshot: env AEGIS_SNAPSHOT_PATH → ai-service/data/latest_snapshot.json → scripts/crawled_data/… (dev).
Snapshot sinh bởi scripts/fetch_live_muangap.py (chạy cron/định kỳ).
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent            # ai-service/services
# Cho phép import sibling (susceptibility_service) cả khi chạy script LẪN khi app import qua `services`.
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import susceptibility_service as svc  # noqa: E402
AI_ROOT = HERE.parent                              # ai-service
REPO_ROOT = AI_ROOT.parent

# ── Tham số công thức (minh bạch, tài liệu hoá) ──────────────────────────────
RAIN_HEAVY_MM = 80.0       # mưa 24h ~ "mưa rất to" ở Đà Nẵng → rain_norm=1
FLOOD_TOWER_M = 1.5        # ngưỡng 'Tháp báo ngập' (water_station_types: flood_1m5) → water_norm=1
F_MIN, F_MAX = 0.6, 1.5    # dải hệ số live: khô 0.6 … cực đoan 1.5
# CHỈ dùng THÁP BÁO NGẬP (đo ĐỘ SÂU ngập, ~0 khi khô) cho water_norm. LOẠI trạm đo mực nước/hồ
# (water_level/reservoir_waterlevel) vì chúng báo CAO ĐỘ TUYỆT ĐỐI nhiều mét (vd hồ Đồng Nghệ 32m)
# → nếu tính như độ sâu ngập sẽ làm cả vùng quanh đập/sông cảnh báo cực đại NGAY CẢ NGÀY KHÔ.
FLOOD_DEPTH_TYPES = {"flood_1m5", "flood_3m"}
WATER_CAP_M = 3.5          # trần hợp lý cho reading tháp (flood_3m max 3m); trên mức này = gauge tuyệt đối → bỏ
STATION_MAX_KM = 8.0       # bán kính coi là "trạm gần" (ngoài dải → coi như không có số)
STALE_HOURS = 6.0          # snapshot cũ hơn mốc này → gắn cờ live_stale (vẫn dùng)
EARTH_R_KM = 6371.0088

# Ngưỡng mức rủi ro ĐỘNG (0..1) — minh bạch.
DYN_LEVELS = [(0.75, "critical"), (0.50, "high"), (0.25, "medium"), (0.0, "low")]

_snap_cache: Dict[str, Any] = {"path": None, "mtime": None, "data": None}


# ══════════════════════════════════════════════════════════════════════════════
def _snapshot_candidates():
    env = os.environ.get("AEGIS_SNAPSHOT_PATH")
    cands = []
    if env:
        cands.append(Path(env))
    cands.append(AI_ROOT / "data" / "latest_snapshot.json")
    cands.append(REPO_ROOT / "scripts" / "crawled_data" / "latest_snapshot.json")
    return cands


def load_snapshot() -> Optional[dict]:
    """Đọc snapshot (cache theo mtime). None nếu không tìm thấy file nào."""
    for p in _snapshot_candidates():
        if p.exists():
            mt = p.stat().st_mtime
            if _snap_cache["path"] == str(p) and _snap_cache["mtime"] == mt:
                return _snap_cache["data"]
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                continue
            _snap_cache.update(path=str(p), mtime=mt, data=data)
            return data
    return None


def _snapshot_age_hours(snap: dict) -> Optional[float]:
    ts = snap.get("fetched_at")
    if not ts:
        return None
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return max(0.0, (now - dt).total_seconds() / 3600.0)
    except Exception:
        return None


def _haversine_km(lon1, lat1, lon2, lat2):
    p1 = np.radians(lat1); p2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1); dl = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * EARTH_R_KM * np.arcsin(np.sqrt(a))


def _stations_array(snap: dict, kind: str, value_key: str):
    """Trả (lon[], lat[], val[]) cho trạm có toạ độ + value số. kind: 'water_stations'/'rain_stations'.
    Với water_stations: CHỈ giữ tháp báo ngập (flood_1m5/flood_3m); bỏ gauge mực nước tuyệt đối."""
    is_water = kind == "water_stations"
    lon, lat, val = [], [], []
    for s in snap.get(kind, []) or []:
        la, lo = s.get("latitude"), s.get("longitude")
        v = s.get(value_key)
        if la is None or lo is None or not isinstance(v, (int, float)):
            continue
        if is_water:
            st = s.get("station_type")
            if st is not None and st not in FLOOD_DEPTH_TYPES:
                continue                      # gauge mực nước/hồ (cao độ tuyệt đối) → bỏ
            if float(v) > WATER_CAP_M:
                continue                      # reading phi lý (snapshot cũ không type, hoặc lỗi) → bỏ
        lon.append(float(lo)); lat.append(float(la)); val.append(float(v))
    return np.asarray(lon), np.asarray(lat), np.asarray(val)


def _nearest_value(qlon, qlat, slon, slat, sval, max_km):
    """Với mỗi điểm truy vấn, giá trị của trạm GẦN NHẤT trong max_km; NaN nếu không có."""
    q = np.atleast_1d
    qlon = q(np.asarray(qlon, float)); qlat = q(np.asarray(qlat, float))
    out = np.full(len(qlon), np.nan)
    if len(slon) == 0:
        return out
    for i in range(len(qlon)):
        d = _haversine_km(qlon[i], qlat[i], slon, slat)
        j = int(np.argmin(d))
        if d[j] <= max_km:
            out[i] = sval[j]
    return out


# ══════════════════════════════════════════════════════════════════════════════
def live_factor_frame(lat, lon, snap: Optional[dict], sim_rain_mm: Optional[float] = None) -> pd.DataFrame:
    """Tính hệ số live cho mảng điểm. Trả DataFrame[rain_24h, water_m, rain_norm, water_norm, intensity, factor]."""
    lat = np.atleast_1d(np.asarray(lat, float)); lon = np.atleast_1d(np.asarray(lon, float))
    n = len(lat)

    if snap is None and sim_rain_mm is None:
        # thiếu hẳn dữ liệu live VÀ không giả lập → hệ số TRUNG TÍNH 1.0 (rủi ro = susceptibility nền)
        return pd.DataFrame({
            "rain_24h": np.full(n, np.nan), "water_m": np.full(n, np.nan),
            "rain_norm": np.zeros(n), "water_norm": np.zeros(n),
            "intensity": np.zeros(n), "factor": np.ones(n),
        })

    if snap is None:
        # có sim_rain_mm nhưng KHÔNG có snapshot → vẫn cho DEMO chạy (mưa giả lập, nước=0).
        empty = np.array([])
        r_lon = r_lat = r_val = empty
        w_lon = w_lat = w_val = empty
    else:
        r_lon, r_lat, r_val = _stations_array(snap, "rain_stations", "rainfall_24h")
        w_lon, w_lat, w_val = _stations_array(snap, "water_stations", "water_level_m")

    if sim_rain_mm is not None:
        rain_24h = np.full(n, float(sim_rain_mm))     # DEMO: giả lập mưa đều toàn vùng
    else:
        rain_24h = _nearest_value(lon, lat, r_lon, r_lat, r_val, STATION_MAX_KM)
    water_m = _nearest_value(lon, lat, w_lon, w_lat, w_val, STATION_MAX_KM)

    rain_norm = np.clip(np.nan_to_num(rain_24h, nan=0.0) / RAIN_HEAVY_MM, 0, 1)
    water_norm = np.clip(np.nan_to_num(water_m, nan=0.0) / FLOOD_TOWER_M, 0, 1)
    hi = np.maximum(rain_norm, water_norm); lo = np.minimum(rain_norm, water_norm)
    intensity = np.clip(hi + 0.3 * lo, 0, 1)
    factor = F_MIN + (F_MAX - F_MIN) * intensity
    return pd.DataFrame({
        "rain_24h": rain_24h, "water_m": water_m,
        "rain_norm": np.round(rain_norm, 3), "water_norm": np.round(water_norm, 3),
        "intensity": np.round(intensity, 3), "factor": np.round(factor, 3),
    })


def _dyn_level(v: float) -> str:
    for thr, name in DYN_LEVELS:
        if v >= thr:
            return name
    return "low"


def dynamic_risk(lat: float, lon: float, sim_rain_mm: Optional[float] = None) -> Dict[str, Any]:
    """Rủi ro động cho 1 điểm. Fallback về susceptibility tĩnh nếu thiếu/khô live."""
    snap = load_snapshot()
    scored = svc.score_points(pd.DataFrame({"lat": [lat], "lon": [lon]}))
    susc = float(scored["susceptibility"].iloc[0])
    lf = live_factor_frame([lat], [lon], snap, sim_rain_mm).iloc[0].to_dict()
    dyn = float(np.clip(susc * lf["factor"], 0, 1))

    age = _snapshot_age_hours(snap) if snap else None
    return {
        "lat": lat, "lon": lon,
        "susceptibility": round(susc, 4),
        "susceptibility_level": svc.level_for(susc),
        "live_factor": lf["factor"],
        "dynamic_risk": round(dyn, 4),
        "dynamic_level": _dyn_level(dyn),
        "live": {
            "available": snap is not None,
            "stale": (age is not None and age > STALE_HOURS),
            "age_hours": (round(age, 1) if age is not None else None),
            "simulated_rain_mm": sim_rain_mm,
            "rain_24h_mm": (None if np.isnan(lf["rain_24h"]) else round(lf["rain_24h"], 1)),
            "water_level_m": (None if np.isnan(lf["water_m"]) else round(lf["water_m"], 2)),
            "rain_norm": lf["rain_norm"], "water_norm": lf["water_norm"], "intensity": lf["intensity"],
        },
        "formula": ("dynamic_risk = clip(susceptibility × f_live, 0,1); "
                    f"f_live = {F_MIN}+{F_MAX-F_MIN:.1f}·clip(max(rain/{RAIN_HEAVY_MM:.0f},water/{FLOOD_TOWER_M})"
                    "+0.3·min(...),0,1). Rule minh bạch — KHÔNG train."),
    }


_grid_risk_cache: Dict[str, Any] = {"key": None, "df": None}


def dynamic_risk_grid(sim_rain_mm: Optional[float] = None) -> pd.DataFrame:
    """Rủi ro động trên TOÀN lưới (heatmap động). Trả grid + susceptibility + factor + dynamic_risk + level.
    Cache theo (snapshot mtime, sim_rain_mm) → lần gọi lặp cùng tham số trả tức thì."""
    snap = load_snapshot()
    key = (_snap_cache.get("path"), _snap_cache.get("mtime"), sim_rain_mm)
    if _grid_risk_cache["key"] == key and _grid_risk_cache["df"] is not None:
        return _grid_risk_cache["df"]
    g = svc.score_grid().copy()
    lf = live_factor_frame(g["lat"].to_numpy(), g["lon"].to_numpy(), snap, sim_rain_mm)
    dyn = np.clip(g["susceptibility"].to_numpy() * lf["factor"].to_numpy(), 0, 1)
    g["live_factor"] = lf["factor"].to_numpy()
    g["dynamic_risk"] = np.round(dyn, 4)
    g["dynamic_level"] = [_dyn_level(v) for v in dyn]
    _grid_risk_cache.update(key=key, df=g)
    return g


def live_status() -> Dict[str, Any]:
    snap = load_snapshot()
    if snap is None:
        return {"available": False, "note": "Không tìm thấy latest_snapshot.json → fallback susceptibility tĩnh."}
    age = _snapshot_age_hours(snap)
    return {
        "available": True,
        "source": snap.get("source"),
        "fetched_at": snap.get("fetched_at"),
        "age_hours": (round(age, 1) if age is not None else None),
        "stale": (age is not None and age > STALE_HOURS),
        "water_stations": snap.get("water_stations_count"),
        "rain_stations": snap.get("rain_stations_count"),
    }
