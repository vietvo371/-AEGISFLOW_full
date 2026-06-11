#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Live Data Fetcher từ muangap.danang.gov.vn
Lấy dữ liệu mực nước + lượng mưa thời gian thực từ API công khai của Đà Nẵng.

Chạy: python scripts/fetch_live_muangap.py
Output: scripts/crawled_data/live_water_<timestamp>.json
        scripts/crawled_data/live_rain_<timestamp>.json
        scripts/crawled_data/latest_snapshot.json  ← dùng cho AI service
"""

import json
import time
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("muangap-fetcher")

BASE_URL = "https://muangap.danang.gov.vn"
OUTPUT_DIR = Path(__file__).parent / "crawled_data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": BASE_URL,
}

# ── API Endpoints discovered từ Playwright intercept ──────────────────────────
ENDPOINTS = {
    "water_stations": "/api/water-station-types/stations",
    "water_stations_v2": "/api/stations",
    "rain_stations": "/api/rain-stations",
    "flood_reports": "/api/flood-reports",
    "flood_predictions": "/api/flood-predictions",
    "shelters": "/api/shelters",
    "sos": "/api/sos-requests",
    "emergency": "/api/emergency-numbers",
}

# Fallback: các tham số query thường gặp
QUERY_PARAMS = {
    "water_stations": {"limit": 200, "page": 1},
    "rain_stations": {"limit": 200, "page": 1},
    "flood_reports": {"limit": 500, "year": datetime.now().year},
    "flood_predictions": {"limit": 200},
}


def fetch_endpoint(session: requests.Session, path: str, params: dict = None) -> Optional[dict]:
    url = BASE_URL + path
    try:
        resp = session.get(url, headers=HEADERS, params=params or {}, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.HTTPError as e:
        log.warning(f"HTTP {e.response.status_code} — {url}")
    except requests.exceptions.RequestException as e:
        log.warning(f"Request failed — {url}: {e}")
    except json.JSONDecodeError:
        log.warning(f"Non-JSON response — {url}")
    return None


def extract_stations_list(raw) -> list:
    """Normalize various API response shapes to list."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for key in ("data", "stations", "items", "results"):
            if key in raw and isinstance(raw[key], list):
                return raw[key]
    return []


def normalize_water_reading(station: dict) -> dict:
    """Chuẩn hóa record trạm nước thành format thống nhất."""
    loc = station.get("location", {})
    coords = loc.get("coordinates", [None, None]) if isinstance(loc, dict) else [None, None]
    lng = station.get("longitude") or (coords[0] if coords else None)
    lat = station.get("latitude") or (coords[1] if coords else None)

    return {
        "station_id": station.get("id") or station.get("_id") or station.get("code"),
        "name": station.get("name", "Unknown"),
        "district": station.get("district") or station.get("area", ""),
        "latitude": lat,
        "longitude": lng,
        "water_level_m": float(station.get("depth") or station.get("waterLevel") or 0),
        "status": station.get("status", "active"),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def normalize_rain_reading(station: dict) -> dict:
    loc = station.get("location", {})
    coords = loc.get("coordinates", [None, None]) if isinstance(loc, dict) else [None, None]

    return {
        "station_id": station.get("id") or station.get("_id") or station.get("code"),
        "name": station.get("name", "Unknown"),
        "district": station.get("district") or station.get("area", ""),
        "latitude": coords[1] if coords else None,
        "longitude": coords[0] if coords else None,
        "rainfall_mm": float(station.get("depth") or station.get("rainfall") or 0),
        "rainfall_24h": float(station.get("total_depth_24_hours") or station.get("rainfall24h") or 0),
        "intensity": float(station.get("depth_intensity") or 0),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_all(session: requests.Session) -> dict:
    log.info("Fetching water stations...")
    water_raw = None
    for ep in ["water_stations", "water_stations_v2"]:
        water_raw = fetch_endpoint(session, ENDPOINTS[ep], QUERY_PARAMS.get("water_stations"))
        if water_raw:
            break

    log.info("Fetching rain stations...")
    rain_raw = fetch_endpoint(session, ENDPOINTS["rain_stations"], QUERY_PARAMS.get("rain_stations"))

    log.info("Fetching flood reports...")
    reports_raw = fetch_endpoint(session, ENDPOINTS["flood_reports"], QUERY_PARAMS.get("flood_reports"))

    log.info("Fetching flood predictions...")
    predictions_raw = fetch_endpoint(session, ENDPOINTS["flood_predictions"], QUERY_PARAMS.get("flood_predictions"))

    water_list = [normalize_water_reading(s) for s in extract_stations_list(water_raw)]
    rain_list = [normalize_rain_reading(s) for s in extract_stations_list(rain_raw)]

    # Dùng local crawled data làm fallback nếu API không trả
    if not water_list:
        log.info("Water API empty — loading from local crawled_data/water_stations_all.json")
        local_path = OUTPUT_DIR / "water_stations_all.json"
        if local_path.exists():
            with open(local_path, encoding="utf-8") as f:
                local = json.load(f)
            water_list = [normalize_water_reading(s) for s in (local if isinstance(local, list) else local.get("data", []))]
            log.info(f"  Loaded {len(water_list)} stations from local file")

    if not rain_list:
        log.info("Rain API empty — loading from local crawled_data/rain_stations.json")
        local_path = OUTPUT_DIR / "rain_stations.json"
        if local_path.exists():
            with open(local_path, encoding="utf-8") as f:
                local = json.load(f)
            raw_list = local if isinstance(local, list) else local.get("data", [])
            rain_list = [normalize_rain_reading(s) for s in raw_list]
            log.info(f"  Loaded {len(rain_list)} stations from local file")

    log.info(f"  Water stations: {len(water_list)}")
    log.info(f"  Rain stations:  {len(rain_list)}")

    return {
        "water": water_list,
        "rain": rain_list,
        "flood_reports": extract_stations_list(reports_raw) if reports_raw else [],
        "predictions": extract_stations_list(predictions_raw) if predictions_raw else [],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source": "muangap.danang.gov.vn",
    }


def save_snapshot(data: dict, timestamped: bool = True):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    if timestamped:
        water_path = OUTPUT_DIR / f"live_water_{ts}.json"
        rain_path = OUTPUT_DIR / f"live_rain_{ts}.json"
        with open(water_path, "w", encoding="utf-8") as f:
            json.dump(data["water"], f, ensure_ascii=False, indent=2)
        with open(rain_path, "w", encoding="utf-8") as f:
            json.dump(data["rain"], f, ensure_ascii=False, indent=2)
        log.info(f"Saved: {water_path.name}, {rain_path.name}")

    # Latest snapshot (overwrite) — dùng cho AI service
    latest_path = OUTPUT_DIR / "latest_snapshot.json"
    summary = {
        "fetched_at": data["fetched_at"],
        "source": data["source"],
        "water_stations_count": len(data["water"]),
        "rain_stations_count": len(data["rain"]),
        "water_stations": data["water"],
        "rain_stations": data["rain"],
    }
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    log.info(f"Updated: {latest_path.name}")
    return latest_path


def run_once():
    with requests.Session() as session:
        data = fetch_all(session)
    path = save_snapshot(data)
    log.info(f"Done — snapshot at {path}")
    return data


def run_loop(interval_seconds: int = 300):
    """Polling mode: fetch mỗi `interval_seconds` giây."""
    log.info(f"Polling mode — interval: {interval_seconds}s (Ctrl+C để dừng)")
    while True:
        try:
            run_once()
        except Exception as e:
            log.error(f"Fetch error: {e}")
        log.info(f"Next fetch in {interval_seconds}s...")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch live data from muangap.danang.gov.vn")
    parser.add_argument("--loop", action="store_true", help="Polling mode (không dừng)")
    parser.add_argument("--interval", type=int, default=300, help="Polling interval (giây), default=300")
    parser.add_argument("--no-timestamp", action="store_true", help="Không lưu file có timestamp")
    args = parser.parse_args()

    if args.loop:
        run_loop(args.interval)
    else:
        run_once()
