#!/usr/bin/env python3
"""
Lấy và lọc data lũ lịch sử ngày 14/10/2022
Timestamp 1665723600 = 14/10/2022 00:00:00 UTC+7
"""
import json
import requests
from pathlib import Path
from datetime import datetime

OUTPUT_DIR = Path("scripts/crawled_data")
BASE_API = "https://muangap-api.danang.gov.vn"

def fetch(url):
    r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    return r.json()

# Lấy danh sách các đợt lũ
print("📋 Các đợt lũ lịch sử:")
periods = fetch(f"{BASE_API}/v1/flood/periods")
for p in periods:
    ts = p.get('_id', '')
    print(f"  - {p['_id']}: {p['description']}")

# Lấy data lũ 2022 (filter theo timestamp)
# 14/10/2022 00:00 UTC+7 = 1665676800 UTC
# 15/10/2022 00:00 UTC+7 = 1665763200 UTC
FLOOD_2022_START = 1665676800  # 14/10/2022 00:00 UTC
FLOOD_2022_END   = 1665763200  # 15/10/2022 00:00 UTC

print(f"\n🌊 Lấy data lũ 14/10/2022...")
url = f"{BASE_API}/v1/flood/reports?flood_period_id=FLOOD-14102022"
data = fetch(url)

all_reports = data.get("data", []) if isinstance(data, dict) else data
print(f"  Total records: {len(all_reports)}")

# Filter chỉ lấy records của ngày 14/10/2022
flood_2022 = []
for r in all_reports:
    create_time = r.get("create_time", 0)
    flood_start = r.get("flood_time", {}).get("start_time", 0) if r.get("flood_time") else 0
    
    # Lấy records được tạo trong ngày 14/10/2022 HOẶC có flood_time trong ngày đó
    if (FLOOD_2022_START <= create_time <= FLOOD_2022_END) or \
       (FLOOD_2022_START <= flood_start <= FLOOD_2022_END):
        flood_2022.append(r)

print(f"  Records ngày 14/10/2022: {len(flood_2022)}")

# Lưu toàn bộ (không filter)
with open(OUTPUT_DIR / "flood_reports_2022_all.json", "w", encoding="utf-8") as f:
    json.dump(all_reports, f, ensure_ascii=False, indent=2)
print(f"  ✅ Saved: flood_reports_2022_all.json ({len(all_reports)} records)")

# Lưu chỉ ngày 14/10/2022
with open(OUTPUT_DIR / "flood_reports_2022_oct14.json", "w", encoding="utf-8") as f:
    json.dump(flood_2022, f, ensure_ascii=False, indent=2)
print(f"  ✅ Saved: flood_reports_2022_oct14.json ({len(flood_2022)} records)")

# Thống kê
if flood_2022:
    districts = {}
    for r in flood_2022:
        loc = r.get("location", {})
        district = loc.get("district_name", "Unknown")
        districts[district] = districts.get(district, 0) + 1
    
    print(f"\n📊 Phân bố theo quận/huyện (14/10/2022):")
    for d, count in sorted(districts.items(), key=lambda x: -x[1])[:10]:
        print(f"  {d}: {count} điểm ngập")
    
    water_levels = [r.get("water_level", 0) for r in flood_2022 if r.get("water_level")]
    if water_levels:
        print(f"\n💧 Mực nước:")
        print(f"  Min: {min(water_levels)} cm")
        print(f"  Max: {max(water_levels)} cm")
        print(f"  Avg: {sum(water_levels)/len(water_levels):.1f} cm")

print(f"\n✅ Hoàn thành!")
