# -*- coding: utf-8 -*-
"""
AegisFlow AI — Data Preprocessing Script
Tạo dataset huấn luyện từ dữ liệu thực và synthetic data.
"""

import json
import random
import math
from datetime import datetime, timedelta
from typing import Union
from pathlib import Path

import pandas as pd
import numpy as np


random.seed(42)
np.random.seed(42)

# === Load real data ===
SCRIPT_DIR = Path(__file__).parent
CRAWL_DIR = SCRIPT_DIR.parent.parent / "scripts" / "crawled_data"


def load_json(filepath: Union[str, Path]) -> Union[list, dict]:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2 * R * math.asin(math.sqrt(a))


# === Load real station locations ===
water_stations_raw = load_json(CRAWL_DIR / "water_stations_all.json")
rain_stations_raw = load_json(CRAWL_DIR / "rain_stations.json")

# Rain stations has {status, data} wrapper
# Water stations also has {status, data} wrapper
water_stations = water_stations_raw.get("data", []) if isinstance(water_stations_raw, dict) else water_stations_raw
rain_stations = rain_stations_raw.get("data", []) if isinstance(rain_stations_raw, dict) else (rain_stations_raw if isinstance(rain_stations_raw, list) else [])

print(f"Loaded {len(water_stations)} water stations, {len(rain_stations)} rain stations")

# === VNMHA Flood Thresholds ===
# Water level thresholds (m) for Da Nang
WL_THRESHOLDS = {
    "low": 0.5,
    "medium": 1.5,
    "high": 3.0,
    "critical": 4.5,
}

# Rainfall thresholds (mm/24h)
RAIN_THRESHOLDS = {
    "low": 20,
    "medium": 50,
    "high": 150,
    "critical": 250,
}


def compute_label(wl, rain, hours, tide, hist):
    """
    Physics-based labeling using VNMHA thresholds.
    Returns: low / medium / high / critical
    """
    score = 0

    if wl >= WL_THRESHOLDS["critical"]: score += 30
    elif wl >= WL_THRESHOLDS["high"]: score += 20
    elif wl >= WL_THRESHOLDS["medium"]: score += 10

    if rain >= RAIN_THRESHOLDS["critical"]: score += 25
    elif rain >= RAIN_THRESHOLDS["high"]: score += 15
    elif rain >= RAIN_THRESHOLDS["medium"]: score += 7

    if hours >= 24: score += 10
    elif hours >= 12: score += 5

    if tide >= 2.0: score += 5
    elif tide >= 1.0: score += 2

    if hist >= 70: score += 10
    elif hist >= 40: score += 5

    # Normalize to 0-100
    total = min(100, score)

    if total >= 65: return "critical"
    elif total >= 45: return "high"
    elif total >= 25: return "medium"
    else: return "low"


def generate_synthetic_record(idx: int, station_water=None, station_rain=None) -> dict:
    """
    Generate one synthetic record based on real station location
    with correlated flood conditions.
    """
    # Choose a real station for realistic lat/lon
    if station_water:
        lat = station_water.get("latitude", 16.0544)
        lon = station_water.get("longitude", 108.2022)
    elif station_rain:
        loc = station_rain.get("location", {})
        coords = loc.get("coordinates", [108.2022, 16.0544])
        lon, lat = coords[0], coords[1]
    else:
        lat = 16.0544 + random.uniform(-0.15, 0.15)
        lon = 108.2022 + random.uniform(-0.2, 0.2)

    # Generate correlated flood scenario
    # 20% chance of elevated conditions
    scenario = random.random()

    if scenario < 0.05:  # critical
        water_level_m = random.uniform(3.5, 5.0)
        rainfall_mm = random.uniform(180, 350)
        hours_rain = random.randint(18, 48)
        tide_level = random.uniform(1.5, 2.5)
        historical_score = random.uniform(70, 100)
    elif scenario < 0.15:  # high
        water_level_m = random.uniform(2.0, 3.5)
        rainfall_mm = random.uniform(80, 180)
        hours_rain = random.randint(8, 24)
        tide_level = random.uniform(0.8, 1.8)
        historical_score = random.uniform(40, 80)
    elif scenario < 0.35:  # medium
        water_level_m = random.uniform(0.8, 2.0)
        rainfall_mm = random.uniform(30, 100)
        hours_rain = random.randint(4, 16)
        tide_level = random.uniform(0.3, 1.2)
        historical_score = random.uniform(20, 60)
    elif scenario < 0.60:  # low
        water_level_m = random.uniform(0.2, 1.0)
        rainfall_mm = random.uniform(10, 50)
        hours_rain = random.randint(1, 8)
        tide_level = random.uniform(0.1, 0.8)
        historical_score = random.uniform(5, 40)
    else:  # normal
        water_level_m = random.uniform(0.0, 0.5)
        rainfall_mm = random.uniform(0, 20)
        hours_rain = random.randint(0, 4)
        tide_level = random.uniform(0.0, 0.5)
        historical_score = random.uniform(0, 30)

    # Add noise
    water_level_m += random.gauss(0, 0.1)
    rainfall_mm += random.gauss(0, 5)
    hours_rain = max(0, int(hours_rain + random.gauss(0, 1)))
    tide_level = max(0, tide_level + random.gauss(0, 0.05))
    historical_score = max(0, min(100, historical_score + random.gauss(0, 3)))

    risk_level = compute_label(water_level_m, rainfall_mm, hours_rain, tide_level, historical_score)

    return {
        "id": idx,
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "water_level_m": round(max(0, water_level_m), 3),
        "rainfall_mm": round(max(0, rainfall_mm), 2),
        "hours_rain": hours_rain,
        "tide_level": round(max(0, tide_level), 3),
        "historical_score": round(historical_score, 1),
        "risk_level": risk_level,
    }


def generate_time_series_dataset(n_samples: int = 2000) -> pd.DataFrame:
    """
    Tạo dataset với nhiều bản ghi hơn, sử dụng real station locations.
    """
    records = []
    idx = 0

    # Combine water + rain stations
    all_stations = []
    for ws in water_stations:
        ws["_type"] = "water"
        all_stations.append(ws)
    for rs in rain_stations:
        rs["_type"] = "rain"
        all_stations.append(rs)

    # Remove duplicates by coords
    seen = set()
    unique_stations = []
    for s in all_stations:
        if s["_type"] == "water":
            key = (s.get("latitude"), s.get("longitude"))
        else:
            loc = s.get("location", {}).get("coordinates", [None, None])
            key = (loc[1], loc[0]) if len(loc) == 2 else (None, None)
        if key not in seen and key != (None, None):
            seen.add(key)
            unique_stations.append(s)

    print(f"Unique stations: {len(unique_stations)}")

    # Generate records cycling through stations
    for i in range(n_samples):
        station = random.choice(unique_stations)
        rec = generate_synthetic_record(idx, station_water=station if station["_type"] == "water" else None,
                                        station_rain=station if station["_type"] == "rain" else None)

        # Add time dimension (spread over 2020-2024)
        base_date = datetime(2020, 1, 1)
        days_offset = random.randint(0, 1825)  # ~5 years
        timestamp = base_date + timedelta(days=days_offset)
        rec["timestamp"] = timestamp.isoformat()

        records.append(rec)
        idx += 1

    df = pd.DataFrame(records)
    return df


def compute_class_weights(df: pd.DataFrame) -> dict:
    """Compute class weights for imbalanced dataset."""
    counts = df["risk_level"].value_counts()
    n_samples = len(df)
    n_classes = len(counts)
    weights = {}
    for cls, cnt in counts.items():
        weights[cls] = n_samples / (n_classes * cnt)
    return weights


def main():
    print("=== AegisFlow AI — Dataset Generator ===")
    print(f"Started at: {datetime.now().isoformat()}")

    # Generate 3000 synthetic records
    n_samples = 3000
    print(f"\nGenerating {n_samples} synthetic records...")
    df = generate_time_series_dataset(n_samples=n_samples)

    # Drop id and timestamp for training (lat/lon kept for geo features)
    features = ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score"]
    X = df[features]
    y = df["risk_level"]

    # Show distribution
    print("\nRisk level distribution:")
    print(y.value_counts())
    print(f"\nClass weights: {compute_class_weights(df)}")

    # Save full dataset
    output_path = SCRIPT_DIR / "flood_danang_2019_2024.csv"
    df.to_csv(output_path, index=False)
    print(f"\nDataset saved to: {output_path}")
    print(f"Total records: {len(df)}")
    print(f"Features: {features}")
    print(f"Label: risk_level")

    # Save feature stats
    print("\nFeature statistics:")
    print(X.describe())

    # Save station locations for reference
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
    stations_path = SCRIPT_DIR / "stations_reference.csv"
    stations_df.to_csv(stations_path, index=False)
    print(f"\nStations reference saved to: {stations_path}")

    print(f"\nCompleted at: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
