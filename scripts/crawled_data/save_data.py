#!/usr/bin/env python3
"""Save all crawled API data to JSON files"""
import json
import requests
from pathlib import Path

OUTPUT_DIR = Path("scripts/crawled_data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BASE_API = "https://muangap-api.danang.gov.vn"

def fetch(url):
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        return r.json()
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def save(name, data):
    if data is None:
        return
    path = OUTPUT_DIR / f"{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    count = len(data) if isinstance(data, list) else data.get("total", "?") if isinstance(data, dict) else "?"
    print(f"  ✅ {name}.json ({count} records)")

endpoints = [
    ("rain_stations",       f"{BASE_API}/v1/stations?page=0&size=-1"),
    ("water_stations_all",  f"{BASE_API}/v2/client/water_station/list_all"),
    ("water_station_types", f"{BASE_API}/v2/client/water_station/type"),
    ("emergency_numbers",   f"{BASE_API}/v1/flood/emergency-numbers"),
    ("flood_reports",       f"{BASE_API}/v1/flood/reports?flood_location_details=&from_time=1700000000&to_time=1776963599"),
    ("sos_requests",        f"{BASE_API}/v1/flood/reports-sos"),
    ("flood_predictions",   f"{BASE_API}/v2/client/flood_prediction_period/list"),
]

print("🚀 Saving crawled data...")
for name, url in endpoints:
    print(f"  Fetching: {url[:70]}...")
    data = fetch(url)
    save(name, data)

print(f"\n✅ Done! Files saved to: {OUTPUT_DIR.absolute()}")
for f in sorted(OUTPUT_DIR.glob("*.json")):
    print(f"   • {f.name} ({f.stat().st_size:,} bytes)")
