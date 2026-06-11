# -*- coding: utf-8 -*-
"""
AegisFlow AI — Data Preprocessing Script v2
Tạo dataset huấn luyện với chuỗi thời gian thực tế (episode-based).

Cải tiến v2:
- Thêm features: water_level_trend, rain_6h, soil_saturation
- Dữ liệu dạng episode (chuỗi sự kiện liên tục) thay vì random độc lập
- Class balance tốt hơn cho critical/high
- Mô phỏng mùa lũ Đà Nẵng chính xác hơn (Sep-Dec mưa nhiều, typhoon Jun-Nov)
"""

import json
import random
import math
from datetime import datetime, timedelta
from typing import Optional, Union, List, Dict
from pathlib import Path

import pandas as pd
import numpy as np

random.seed(42)
np.random.seed(42)

SCRIPT_DIR = Path(__file__).parent
CRAWL_DIR = SCRIPT_DIR.parent.parent / "scripts" / "crawled_data"


def load_json(filepath: Union[str, Path]) -> Union[list, dict]:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


# === Load real station locations ===
water_stations_raw = load_json(CRAWL_DIR / "water_stations_all.json")
rain_stations_raw = load_json(CRAWL_DIR / "rain_stations.json")

water_stations = water_stations_raw.get("data", []) if isinstance(water_stations_raw, dict) else water_stations_raw
rain_stations = rain_stations_raw.get("data", []) if isinstance(rain_stations_raw, dict) else (rain_stations_raw if isinstance(rain_stations_raw, list) else [])

print(f"Loaded {len(water_stations)} water stations, {len(rain_stations)} rain stations")


# === VNMHA Flood Thresholds (Da Nang) ===
WL_THRESHOLDS = {"low": 0.5, "medium": 1.5, "high": 3.0, "critical": 4.5}
RAIN_THRESHOLDS = {"low": 20, "medium": 50, "high": 150, "critical": 250}

# Monthly risk weights based on Da Nang historical climate
# (Sep-Dec: heavy rain season, Oct-Nov: typhoon peak)
MONTHLY_RISK_WEIGHT = {
    1: 0.30,  # Jan - dry, cool
    2: 0.20,  # Feb - dry
    3: 0.18,  # Mar - dry
    4: 0.20,  # Apr - transitional
    5: 0.30,  # May - early rain
    6: 0.50,  # Jun - typhoon season begins
    7: 0.55,  # Jul - typhoon
    8: 0.60,  # Aug - typhoon
    9: 0.80,  # Sep - heavy rain begins
    10: 1.00, # Oct - peak flood season
    11: 0.95, # Nov - peak flood season
    12: 0.70, # Dec - late rain season
}


def compute_label(wl: float, rain: float, hours: float, tide: float, hist: float,
                  trend: float = 0.0, rain_6h: float = 0.0, soil_sat: float = 0.0) -> str:
    """
    Physics-based labeling using VNMHA thresholds.
    Bao gồm cả trend và tích lũy mưa.
    """
    score = 0.0

    # Water level component (0-30)
    if wl >= WL_THRESHOLDS["critical"]:
        score += 30
    elif wl >= WL_THRESHOLDS["high"]:
        score += 20
    elif wl >= WL_THRESHOLDS["medium"]:
        score += 10
    elif wl >= WL_THRESHOLDS["low"]:
        score += 4

    # Rainfall component (0-25)
    if rain >= RAIN_THRESHOLDS["critical"]:
        score += 25
    elif rain >= RAIN_THRESHOLDS["high"]:
        score += 15
    elif rain >= RAIN_THRESHOLDS["medium"]:
        score += 7
    elif rain >= RAIN_THRESHOLDS["low"]:
        score += 3

    # Duration (0-10)
    if hours >= 24:
        score += 10
    elif hours >= 12:
        score += 5
    elif hours >= 6:
        score += 2

    # Tide (0-5)
    if tide >= 2.0:
        score += 5
    elif tide >= 1.0:
        score += 2

    # Historical context (0-10)
    if hist >= 70:
        score += 10
    elif hist >= 40:
        score += 5

    # NEW: Water level trend (rising quickly = danger) (0-12)
    if trend >= 0.4:
        score += 12
    elif trend >= 0.2:
        score += 7
    elif trend >= 0.1:
        score += 3
    elif trend <= -0.2:
        score -= 5  # water receding = lower risk

    # NEW: 6-hour cumulative rain (0-10)
    if rain_6h >= 100:
        score += 10
    elif rain_6h >= 50:
        score += 6
    elif rain_6h >= 20:
        score += 2

    # NEW: Soil saturation (0-8)
    if soil_sat >= 80:
        score += 8
    elif soil_sat >= 60:
        score += 4
    elif soil_sat >= 40:
        score += 1

    total = max(0.0, min(100.0, score))

    if total >= 65:
        return "critical"
    elif total >= 45:
        return "high"
    elif total >= 25:
        return "medium"
    else:
        return "low"


def _pick_station_coords(stations: list) -> tuple:
    """Pick random station coordinates."""
    if not stations:
        return 16.0544 + random.uniform(-0.15, 0.15), 108.2022 + random.uniform(-0.2, 0.2)
    s = random.choice(stations)
    if s.get("_type") == "water":
        return s.get("latitude", 16.0544), s.get("longitude", 108.2022)
    loc = s.get("location", {}).get("coordinates", [108.2022, 16.0544])
    return (loc[1], loc[0]) if len(loc) == 2 else (16.0544, 108.2022)


def generate_flood_episode(
    start_time: datetime,
    station_coords: tuple,
    episode_type: str,  # "normal", "light_rain", "moderate_flood", "heavy_flood", "extreme"
    month: int,
) -> List[Dict]:
    """
    Tạo một chuỗi sự kiện (episode) liên tục theo thời gian.
    Mỗi episode gồm nhiều bước hourly readings.
    """
    lat, lon = station_coords
    weight = MONTHLY_RISK_WEIGHT[month]
    records = []

    # Episode parameters
    if episode_type == "normal":
        n_steps = random.randint(3, 8)
        base_wl = random.uniform(0.0, 0.4)
        base_rain = random.uniform(0, 15)
        trend_pattern = "stable"
        base_soil = random.uniform(0, 25)

    elif episode_type == "light_rain":
        n_steps = random.randint(4, 10)
        base_wl = random.uniform(0.2, 0.8)
        base_rain = random.uniform(10, 45)
        trend_pattern = "rising_slow"
        base_soil = random.uniform(10, 40)

    elif episode_type == "moderate_flood":
        n_steps = random.randint(6, 14)
        base_wl = random.uniform(0.8, 2.0)
        base_rain = random.uniform(40, 120)
        trend_pattern = "rising_then_peak"
        base_soil = random.uniform(30, 65)

    elif episode_type == "heavy_flood":
        n_steps = random.randint(8, 20)
        base_wl = random.uniform(1.5, 3.5)
        base_rain = random.uniform(100, 250)
        trend_pattern = "rapid_rise"
        base_soil = random.uniform(55, 85)

    else:  # extreme
        n_steps = random.randint(10, 24)
        base_wl = random.uniform(3.0, 5.5)
        base_rain = random.uniform(200, 400)
        trend_pattern = "extreme_rise"
        base_soil = random.uniform(75, 100)

    # Apply seasonal amplification
    base_rain *= (0.7 + weight * 0.6)
    base_wl *= (0.8 + weight * 0.4)

    # Generate time steps
    wl = base_wl
    rain_hourly = base_rain / max(1, n_steps)
    soil = base_soil
    rain_6h_buffer = [0.0] * 6
    prev_wl = wl

    for step in range(n_steps):
        current_time = start_time + timedelta(hours=step)

        # Evolve water level based on pattern
        if trend_pattern == "stable":
            wl += random.gauss(0, 0.05)
        elif trend_pattern == "rising_slow":
            peak = n_steps * 0.6
            if step < peak:
                wl += random.uniform(0.02, 0.12)
            else:
                wl -= random.uniform(0.01, 0.08)
        elif trend_pattern == "rising_then_peak":
            peak = n_steps * 0.65
            if step < peak:
                wl += random.uniform(0.05, 0.25)
            else:
                wl -= random.uniform(0.02, 0.18)
        elif trend_pattern == "rapid_rise":
            peak = n_steps * 0.7
            if step < peak:
                wl += random.uniform(0.15, 0.50)
            else:
                wl -= random.uniform(0.05, 0.25)
        else:  # extreme_rise
            peak = n_steps * 0.75
            if step < peak:
                wl += random.uniform(0.25, 0.80)
            else:
                wl -= random.uniform(0.10, 0.40)

        wl = max(0.0, wl + random.gauss(0, 0.08))

        # Rain variation
        rain_step = max(0.0, rain_hourly * random.uniform(0.5, 1.8) + random.gauss(0, 3))

        # Update 6h buffer
        rain_6h_buffer = rain_6h_buffer[1:] + [rain_step]
        rain_6h = sum(rain_6h_buffer)

        # Soil saturation increases with rain, decreases slowly
        soil = min(100.0, max(0.0, soil + rain_step * 0.15 - 0.5))

        # Water level trend (m/h)
        trend = wl - prev_wl
        prev_wl = wl

        # Cumulative hours_rain
        hours_rain = min(48, step + 1) if rain_step > 5 else max(0, step - 2)

        # Tide level (tidal cycle simulation)
        tide_cycle = 0.8 + 0.7 * math.sin(2 * math.pi * (step / 12 + random.uniform(0, 0.3)))
        tide_level = max(0.0, tide_cycle + random.gauss(0, 0.05))

        # Historical score based on zone characteristics
        historical_score = random.uniform(40, 80) if episode_type in ("heavy_flood", "extreme") else random.uniform(10, 55)
        historical_score = min(100, max(0, historical_score + random.gauss(0, 5)))

        risk_level = compute_label(
            wl, rain_step * 3, hours_rain, tide_level, historical_score,
            trend, rain_6h, soil
        )

        records.append({
            "latitude": round(lat + random.gauss(0, 0.001), 6),
            "longitude": round(lon + random.gauss(0, 0.001), 6),
            "water_level_m": round(max(0.0, wl), 3),
            "rainfall_mm": round(max(0.0, rain_step * 3), 2),  # 3h equivalent
            "hours_rain": int(hours_rain),
            "tide_level": round(tide_level, 3),
            "historical_score": round(historical_score, 1),
            "water_level_trend": round(float(np.clip(trend, -1.0, 1.5)), 4),
            "rain_6h": round(float(np.clip(rain_6h, 0, 500)), 2),
            "soil_saturation": round(float(np.clip(soil, 0, 100)), 1),
            "risk_level": risk_level,
            "timestamp": current_time.isoformat(),
        })

    return records


def generate_time_series_dataset(n_samples: int = 5000) -> pd.DataFrame:
    """
    Tạo dataset với episode-based time series.
    Đảm bảo class balance tốt cho critical và high.
    """
    # Combine all stations
    all_stations = []
    for ws in water_stations:
        ws["_type"] = "water"
        all_stations.append(ws)
    for rs in rain_stations:
        rs["_type"] = "rain"
        all_stations.append(rs)

    seen = set()
    unique_stations = []
    for s in all_stations:
        if s["_type"] == "water":
            key = (s.get("latitude"), s.get("longitude"))
        else:
            loc = s.get("location", {}).get("coordinates", [None, None])
            key = (loc[1], loc[0]) if len(loc) == 2 else (None, None)
        if key not in seen and key[0] is not None:
            seen.add(key)
            unique_stations.append(s)

    print(f"Unique stations: {len(unique_stations)}")

    # Target distribution: more balanced than before
    # Each episode_type produces multiple records
    episode_targets = {
        "normal": 0.30,          # 30% low risk records
        "light_rain": 0.25,      # 25% low-medium
        "moderate_flood": 0.22,  # 22% medium-high
        "heavy_flood": 0.15,     # 15% high-critical
        "extreme": 0.08,         # 8% critical (amplified for rare class)
    }

    all_records = []
    base_date = datetime(2019, 1, 1)

    for episode_type, fraction in episode_targets.items():
        target_count = int(n_samples * fraction * 1.5)  # overshoot, will trim
        generated = 0

        while generated < target_count:
            # Random date weighted by month
            days_offset = random.randint(0, 2190)  # 6 years
            event_time = base_date + timedelta(days=days_offset, hours=random.randint(0, 23))
            month = event_time.month

            coords = _pick_station_coords(unique_stations)
            records = generate_flood_episode(event_time, coords, episode_type, month)
            all_records.extend(records)
            generated += len(records)

    df = pd.DataFrame(all_records)

    # Shuffle and trim to target
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    df["id"] = range(len(df))

    # Trim to n_samples but ensure minimum class representation
    min_per_class = {"critical": 150, "high": 200, "medium": 400, "low": 0}
    final_dfs = []
    for cls, min_count in min_per_class.items():
        cls_df = df[df["risk_level"] == cls]
        if min_count > 0 and len(cls_df) < min_count:
            # Oversample if needed
            cls_df = cls_df.sample(n=min_count, replace=True, random_state=42)
        final_dfs.append(cls_df)
    df_balanced = pd.concat(final_dfs).sample(frac=1, random_state=42).reset_index(drop=True)

    # Merge remaining low/medium
    remaining = df[~df.index.isin(df_balanced.index)].head(n_samples - len(df_balanced))
    df_final = pd.concat([df_balanced, remaining]).sample(frac=1, random_state=42).reset_index(drop=True)
    df_final["id"] = range(len(df_final))

    return df_final.head(n_samples + 500)  # slight overshoot trimmed later


def compute_class_weights(df: pd.DataFrame) -> dict:
    counts = df["risk_level"].value_counts()
    n_samples = len(df)
    n_classes = len(counts)
    return {cls: n_samples / (n_classes * cnt) for cls, cnt in counts.items()}


def main():
    print("=== AegisFlow AI — Enhanced Dataset Generator v2 ===")
    print(f"Started at: {datetime.now().isoformat()}")

    n_samples = 5000
    print(f"\nGenerating {n_samples} episode-based records...")
    df = generate_time_series_dataset(n_samples=n_samples)

    features = [
        "water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score",
        "water_level_trend", "rain_6h", "soil_saturation",
    ]
    X = df[features]
    y = df["risk_level"]

    print("\nRisk level distribution:")
    print(y.value_counts())
    print(f"\nClass weights: {compute_class_weights(df)}")

    output_path = SCRIPT_DIR / "flood_danang_2019_2024.csv"
    df.to_csv(output_path, index=False)
    print(f"\nDataset saved to: {output_path}")
    print(f"Total records: {len(df)}")
    print(f"Features: {features}")

    print("\nFeature statistics:")
    print(X.describe())

    # Save station reference
    station_data = []
    for ws in water_stations:
        station_data.append({
            "station_type": "water",
            "name": ws.get("name", ""),
            "latitude": ws.get("latitude"),
            "longitude": ws.get("longitude"),
            "district": ws.get("district", ""),
            "city": ws.get("city", ""),
        })
    for rs in rain_stations:
        loc = rs.get("location", {}).get("coordinates", [None, None])
        station_data.append({
            "station_type": "rain",
            "name": rs.get("name", ""),
            "latitude": loc[1] if len(loc) == 2 else None,
            "longitude": loc[0] if len(loc) == 2 else None,
            "district": rs.get("area", ""),
            "city": rs.get("city", ""),
        })
    stations_df = pd.DataFrame(station_data)
    stations_df.to_csv(SCRIPT_DIR / "stations_reference.csv", index=False)

    print(f"\nCompleted at: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
