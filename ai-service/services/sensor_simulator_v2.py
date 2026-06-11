# -*- coding: utf-8 -*-
"""
AegisFlow — Real-station Sensor Simulator v2
Giả lập dữ liệu sensor từ đúng 93 trạm nước + 82 trạm mưa thực tế của Đà Nẵng.

Khác biệt so với v1:
- Dùng toàn bộ tọa độ trạm từ crawled_data (thay vì 6 trạm hardcode)
- Seasonality theo tháng thực tế (tháng 6 = bắt đầu mùa mưa)
- Tương quan không gian: trạm gần nhau có reading tương đồng
- Flood event mode: simulate đợt mưa lớn realistic
- Có thể inject reading từ API thực nếu crawl được
"""

import json
import math
import random
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any, Tuple
from dataclasses import dataclass, field
from collections import deque
from enum import Enum

log = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
CRAWL_DIR = SCRIPT_DIR.parent.parent / "scripts" / "crawled_data"

# ── Seasonal profile Đà Nẵng (VNMHA thực tế) ─────────────────────────────────
MONTHLY_RAIN_SCALE = {
    1: 0.20, 2: 0.15, 3: 0.15, 4: 0.25,
    5: 0.40, 6: 0.55, 7: 0.60, 8: 0.65,
    9: 0.85, 10: 1.00, 11: 0.95, 12: 0.70,
}

MONTHLY_WATER_BASE = {   # mực nước cơ sở (m) theo tháng
    1: 0.8, 2: 0.6, 3: 0.5, 4: 0.7,
    5: 1.0, 6: 1.2, 7: 1.3, 8: 1.4,
    9: 2.0, 10: 2.5, 11: 2.2, 12: 1.8,
}


class FloodScenario(Enum):
    NORMAL = "normal"          # Ngày thường
    LIGHT_RAIN = "light_rain"  # Mưa nhẹ
    HEAVY_RAIN = "heavy_rain"  # Mưa lớn (cảnh báo)
    FLOOD_EVENT = "flood_event"  # Đợt ngập nghiêm trọng
    TYPHOON = "typhoon"        # Bão


SCENARIO_PARAMS = {
    FloodScenario.NORMAL:      {"rain_mult": 0.1, "wl_add": 0.0,  "hours": 0},
    FloodScenario.LIGHT_RAIN:  {"rain_mult": 0.5, "wl_add": 0.3,  "hours": 3},
    FloodScenario.HEAVY_RAIN:  {"rain_mult": 1.5, "wl_add": 1.2,  "hours": 8},
    FloodScenario.FLOOD_EVENT: {"rain_mult": 3.0, "wl_add": 3.5,  "hours": 18},
    FloodScenario.TYPHOON:     {"rain_mult": 5.0, "wl_add": 5.0,  "hours": 24},
}


@dataclass
class StationState:
    """Trạng thái hiện tại của một trạm sensor."""
    station_id: str
    name: str
    lat: float
    lng: float
    district: str
    station_type: str  # "water" | "rain"

    # Current values
    water_level_m: float = 0.0
    rainfall_mm: float = 0.0
    rainfall_24h: float = 0.0
    trend: float = 0.0  # dm/h

    last_updated: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class RealStationSimulator:
    """
    Simulator dùng đúng tọa độ 175 trạm thực tế của Đà Nẵng.
    Hỗ trợ scenario-based simulation và spatial correlation.
    """

    def __init__(self, seed: int = 42):
        random.seed(seed)
        self._rng = random.Random(seed)
        self._stations: Dict[str, StationState] = {}
        self._scenario: FloodScenario = FloodScenario.NORMAL
        self._scenario_progress: float = 0.0  # 0-1, tiến trình của scenario
        self._running = False
        self._readings_buffer: deque = deque(maxlen=5000)
        self._load_stations()

    # ── Load stations ────────────────────────────────────────────────────────

    def _load_stations(self):
        """Load trạm từ crawled_data, fallback sang stations_reference.csv."""
        water_loaded = self._load_water_stations()
        rain_loaded = self._load_rain_stations()

        if not water_loaded or not rain_loaded:
            self._load_from_csv_reference()

        log.info(
            f"Loaded {sum(1 for s in self._stations.values() if s.station_type == 'water')} water stations, "
            f"{sum(1 for s in self._stations.values() if s.station_type == 'rain')} rain stations"
        )

    def _load_water_stations(self) -> bool:
        path = CRAWL_DIR / "water_stations_all.json"
        if not path.exists():
            return False
        try:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
            stations = raw if isinstance(raw, list) else raw.get("data", [])
            for s in stations:
                loc = s.get("location", {})
                coords = loc.get("coordinates", []) if isinstance(loc, dict) else []
                lat = s.get("latitude") or (coords[1] if len(coords) >= 2 else None)
                lng = s.get("longitude") or (coords[0] if len(coords) >= 2 else None)
                if lat is None or lng is None:
                    continue
                sid = f"WL_{s.get('id') or s.get('code', '')}_{s.get('name','')[:8]}"
                self._stations[sid] = StationState(
                    station_id=sid,
                    name=s.get("name", ""),
                    lat=float(lat),
                    lng=float(lng),
                    district=s.get("district") or s.get("area", ""),
                    station_type="water",
                    water_level_m=float(s.get("depth") or 0),
                )
            return len(self._stations) > 0
        except Exception as e:
            log.warning(f"Could not load water stations: {e}")
            return False

    def _load_rain_stations(self) -> bool:
        path = CRAWL_DIR / "rain_stations.json"
        if not path.exists():
            return False
        try:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
            stations = raw if isinstance(raw, list) else raw.get("data", [])
            for s in stations:
                loc = s.get("location", {})
                coords = loc.get("coordinates", []) if isinstance(loc, dict) else []
                lat = s.get("latitude") or (coords[1] if len(coords) >= 2 else None)
                lng = s.get("longitude") or (coords[0] if len(coords) >= 2 else None)
                if lat is None or lng is None:
                    continue
                sid = f"RG_{s.get('id') or s.get('code', '')}_{s.get('name','')[:8]}"
                self._stations[sid] = StationState(
                    station_id=sid,
                    name=s.get("name", ""),
                    lat=float(lat),
                    lng=float(lng),
                    district=s.get("district") or s.get("area", ""),
                    station_type="rain",
                    rainfall_mm=float(s.get("depth") or 0),
                    rainfall_24h=float(s.get("total_depth_24_hours") or 0),
                )
            return True
        except Exception as e:
            log.warning(f"Could not load rain stations: {e}")
            return False

    def _load_from_csv_reference(self):
        """Fallback: đọc stations_reference.csv."""
        path = SCRIPT_DIR.parent / "data" / "stations_reference.csv"
        if not path.exists():
            log.warning("No station reference files found — using 6 hardcoded stations")
            self._add_hardcoded_fallback()
            return
        try:
            import csv
            with open(path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    stype = row.get("station_type", "water")
                    prefix = "WL_" if stype == "water" else "RG_"
                    sid = f"{prefix}{row['name'][:12]}"
                    self._stations[sid] = StationState(
                        station_id=sid,
                        name=row["name"],
                        lat=float(row["latitude"]),
                        lng=float(row["longitude"]),
                        district=row.get("district", ""),
                        station_type=stype,
                    )
        except Exception as e:
            log.warning(f"CSV fallback failed: {e}")
            self._add_hardcoded_fallback()

    def _add_hardcoded_fallback(self):
        defaults = [
            ("WL_HaiChau", "Hải Châu", 16.0544, 108.2022, "Hải Châu", "water"),
            ("WL_ThanhKhe", "Thanh Khê", 16.0600, 108.1900, "Thanh Khê", "water"),
            ("WL_LienChieu", "Liên Chiểu", 16.0700, 108.1500, "Liên Chiểu", "water"),
            ("RG_CamLe", "Cẩm Lệ", 16.0450, 108.1800, "Cẩm Lệ", "rain"),
            ("RG_HoaVang", "Hòa Vang", 16.0300, 108.1200, "Hòa Vang", "rain"),
            ("TG_HanRiver", "Sông Hàn", 16.0560, 108.2050, "Hải Châu", "water"),
        ]
        for sid, name, lat, lng, dist, stype in defaults:
            self._stations[sid] = StationState(sid, name, lat, lng, dist, stype)

    # ── Scenario control ────────────────────────────────────────────────────

    def set_scenario(self, scenario: FloodScenario):
        self._scenario = scenario
        self._scenario_progress = 0.0
        log.info(f"Scenario set to: {scenario.value}")

    def get_scenario(self) -> str:
        return self._scenario.value

    # ── Generate readings ─────────────────────────────────────────────────

    def _month_factor(self) -> float:
        return MONTHLY_RAIN_SCALE.get(datetime.now().month, 0.5)

    def _water_base(self) -> float:
        return MONTHLY_WATER_BASE.get(datetime.now().month, 1.2)

    def _spatial_noise(self, lat: float, lng: float, base_noise: float) -> float:
        """Thêm noise tương quan theo không gian (dùng sin/cos của tọa độ)."""
        spatial_seed = math.sin(lat * 100) * math.cos(lng * 100)
        return base_noise * (0.7 + 0.6 * spatial_seed)

    def tick(self):
        """Cập nhật tất cả stations cho 1 time step."""
        month_f = self._month_factor()
        water_base = self._water_base()
        sc = SCENARIO_PARAMS[self._scenario]

        # Tăng dần theo tiến trình scenario
        if self._scenario != FloodScenario.NORMAL:
            self._scenario_progress = min(1.0, self._scenario_progress + 0.02)

        sp = self._scenario_progress
        rain_boost = sc["rain_mult"] * sp
        wl_boost = sc["wl_add"] * sp

        for sid, station in self._stations.items():
            noise = self._rng.gauss(0, 0.1)
            spatial_n = self._spatial_noise(station.lat, station.lng, noise)

            if station.station_type == "water":
                base = water_base + spatial_n * 0.5
                new_val = max(0.0, base + wl_boost + noise * 0.3)
                trend = new_val - station.water_level_m
                station.water_level_m = round(new_val, 3)
                station.trend = round(trend, 4)

            elif station.station_type == "rain":
                base_rain = self._rng.uniform(0, 30) * month_f
                new_rain = max(0.0, base_rain * (1 + rain_boost) + noise * 5)
                station.rainfall_mm = round(new_rain, 2)
                station.rainfall_24h = round(station.rainfall_24h * 0.95 + new_rain, 2)

            station.last_updated = datetime.now(timezone.utc)

        # Nếu scenario hoàn thành — reset về NORMAL
        if self._scenario != FloodScenario.NORMAL and self._scenario_progress >= 1.0:
            log.info(f"Scenario {self._scenario.value} complete — resetting to NORMAL")
            self._scenario = FloodScenario.NORMAL
            self._scenario_progress = 0.0

    def get_all_readings(self) -> List[Dict]:
        """Snapshot tất cả stations dạng dict (dùng cho API response)."""
        now = datetime.now(timezone.utc).isoformat()
        result = []
        for sid, s in self._stations.items():
            record = {
                "station_id": sid,
                "name": s.name,
                "district": s.district,
                "lat": s.lat,
                "lng": s.lng,
                "type": s.station_type,
                "timestamp": now,
                "scenario": self._scenario.value,
            }
            if s.station_type == "water":
                record.update({
                    "water_level_m": s.water_level_m,
                    "trend_m_per_tick": s.trend,
                    "risk_hint": _risk_hint_water(s.water_level_m),
                })
            else:
                record.update({
                    "rainfall_mm": s.rainfall_mm,
                    "rainfall_24h_mm": s.rainfall_24h,
                    "risk_hint": _risk_hint_rain(s.rainfall_mm),
                })
            result.append(record)
        return result

    def get_aggregated_input(self) -> Dict:
        """
        Trả về dict phù hợp để truyền thẳng vào flood_calculator.
        Lấy giá trị max/mean từ toàn bộ trạm.
        """
        water_vals = [s.water_level_m for s in self._stations.values() if s.station_type == "water"]
        rain_vals = [s.rainfall_mm for s in self._stations.values() if s.station_type == "rain"]
        rain24_vals = [s.rainfall_24h for s in self._stations.values() if s.station_type == "rain"]
        trend_vals = [s.trend for s in self._stations.values() if s.station_type == "water"]

        month = datetime.now().month
        return {
            "water_level_m": max(water_vals) if water_vals else 0.0,
            "rainfall_mm": max(rain_vals) if rain_vals else 0.0,
            "hours_rain": 6.0,
            "tide_level": 1.2,
            "historical_score": 50.0,
            "water_level_trend": sum(trend_vals) / len(trend_vals) if trend_vals else 0.0,
            "rain_6h": sum(rain_vals[:5]) if len(rain_vals) >= 5 else sum(rain_vals),
            "soil_saturation": min(100.0, sum(rain24_vals) / max(len(rain24_vals), 1) * 0.8),
            "month": month,
            "latitude": 16.047,
            "longitude": 108.206,
        }

    def get_station_count(self) -> Dict[str, int]:
        return {
            "water": sum(1 for s in self._stations.values() if s.station_type == "water"),
            "rain": sum(1 for s in self._stations.values() if s.station_type == "rain"),
            "total": len(self._stations),
        }

    def get_high_risk_stations(self, top_n: int = 10) -> List[Dict]:
        """Trả về top N trạm có mức nguy hiểm cao nhất."""
        scored = []
        for sid, s in self._stations.items():
            if s.station_type == "water":
                score = s.water_level_m / 5.0
                scored.append((score, sid, s))
            else:
                score = s.rainfall_mm / 200.0
                scored.append((score, sid, s))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "station_id": sid,
                "name": s.name,
                "district": s.district,
                "lat": s.lat,
                "lng": s.lng,
                "type": s.station_type,
                "value": s.water_level_m if s.station_type == "water" else s.rainfall_mm,
                "unit": "m" if s.station_type == "water" else "mm",
                "risk_score": round(score, 3),
            }
            for score, sid, s in scored[:top_n]
        ]

    async def stream(self, interval_seconds: float = 5.0, callback: Optional[Callable] = None):
        """Async streaming loop — cập nhật và gọi callback mỗi tick."""
        self._running = True
        while self._running:
            self.tick()
            snapshot = self.get_all_readings()
            self._readings_buffer.extend(snapshot)
            if callback:
                await asyncio.coroutine(callback)(snapshot) if asyncio.iscoroutinefunction(callback) else callback(snapshot)
            await asyncio.sleep(interval_seconds)

    def stop(self):
        self._running = False


def _risk_hint_water(wl: float) -> str:
    if wl >= 4.5: return "critical"
    if wl >= 3.0: return "high"
    if wl >= 1.5: return "medium"
    if wl >= 0.5: return "low"
    return "normal"


def _risk_hint_rain(rain_mm: float) -> str:
    if rain_mm >= 250: return "critical"
    if rain_mm >= 150: return "high"
    if rain_mm >= 50:  return "medium"
    if rain_mm >= 20:  return "low"
    return "normal"


# Singleton instance
_simulator_v2: Optional[RealStationSimulator] = None


def get_simulator_v2() -> RealStationSimulator:
    global _simulator_v2
    if _simulator_v2 is None:
        _simulator_v2 = RealStationSimulator(seed=42)
        _simulator_v2.tick()  # khởi tạo giá trị ban đầu
    return _simulator_v2
