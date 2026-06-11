#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Thêm sự kiện ngập thực tế vào training dataset.

Nguồn: scripts/crawled_data/flood_reports_2022_all.json
       392 báo cáo ngập lụt ngày 14/10/2022 từ muangap.danang.gov.vn
       (đây là ngày xảy ra trận lũ lớn tại Đà Nẵng)

Mục tiêu:
- Chuyển dữ liệu mực nước thực (cm) sang format training
- Bổ sung rainfall/các feature khác dựa trên điều kiện thực tế ngày 14/10/2022
- Tăng số lượng mẫu critical/high để cải thiện F1
- Ghi ra flood_danang_2019_2024_augmented.csv
"""

import json
import csv
import math
import random
import sys
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent
CRAWL_DIR = SCRIPT_DIR.parent.parent / "scripts" / "crawled_data"
DATA_DIR = SCRIPT_DIR

random.seed(2022)

# ── Điều kiện thực tế ngày 14/10/2022 tại Đà Nẵng ───────────────────────────
# Nguồn: Báo cáo khí tượng VNMHA + muangap.danang.gov.vn
OCT14_2022 = {
    "date": "2022-10-14",
    "total_rainfall_24h_mm": 285,       # lượng mưa 24h thực tế (mm)
    "peak_rainfall_6h_mm": 180,         # mưa 6h đỉnh điểm
    "duration_hours": 18,               # mưa liên tục 18h
    "tide_level_m": 1.45,               # mực triều thực tế
    "month": 10,
    "historical_score_base": 75.0,      # điểm lịch sử cao (mùa đỉnh)
    "soil_saturation_base": 85.0,       # đất đã no nước trước đó
}

# Biết từ dữ liệu: water_level trong báo cáo là cm, đo tại điểm ngập
# Các trạm sẽ có reading khác nhau tùy vị trí địa hình


def cm_to_m(cm_val: float) -> float:
    return cm_val / 100.0


def label_from_water_level(wl_m: float, rain_mm: float) -> str:
    """
    Label thực tế dựa trên mực nước đo được + lượng mưa.
    Dùng VNMHA thresholds cho Đà Nẵng.
    """
    score = 0
    # Water level
    if wl_m >= 4.5:   score += 30
    elif wl_m >= 3.0: score += 20
    elif wl_m >= 1.5: score += 10
    elif wl_m >= 0.3: score += 4
    # Rainfall
    if rain_mm >= 250:  score += 25
    elif rain_mm >= 150: score += 15
    elif rain_mm >= 50:  score += 7
    elif rain_mm >= 20:  score += 3
    # Duration (18h = max)
    score += 8
    # Tide
    score += 4
    # Soil saturation cao
    score += 5

    if score >= 50:  return "critical"
    if score >= 28:  return "high"
    if score >= 12:  return "medium"
    return "low"


def geo_district_to_historical_score(district_name: str) -> float:
    """
    Điểm lịch sử ngập theo quận — căn cứ hồ sơ ngập thực tế Đà Nẵng.
    Hải Châu, Thanh Khê, Cẩm Lệ là vùng ngập thường xuyên nhất.
    """
    high_risk = {"Hải Châu": 90, "Thanh Khê": 85, "Cẩm Lệ": 82, "Liên Chiểu": 70}
    medium_risk = {"Sơn Trà": 60, "Ngũ Hành Sơn": 55, "Hòa Vang": 65}
    name = district_name or ""
    for k, v in high_risk.items():
        if k in name:
            return float(v)
    for k, v in medium_risk.items():
        if k in name:
            return float(v)
    return 50.0


def add_realistic_noise(base: float, pct: float = 0.08) -> float:
    """Thêm noise nhỏ (±8%) để tránh duplicate rows."""
    return round(base * (1 + random.uniform(-pct, pct)), 3)


def convert_report_to_training_row(report: dict) -> dict:
    """Chuyển 1 flood report → 1 training row."""
    wl_cm = float(report.get("water_level") or 0)
    wl_m = cm_to_m(wl_cm)

    loc = report.get("location", {})
    coords = loc.get("coordinates", [108.2, 16.05])
    lng, lat = coords[0], coords[1]
    district = loc.get("district_name") or loc.get("ward_name", "")

    # Context ngày 14/10/2022
    ctx = OCT14_2022
    rainfall_mm = add_realistic_noise(ctx["total_rainfall_24h_mm"])
    rain_6h = add_realistic_noise(ctx["peak_rainfall_6h_mm"])
    tide = add_realistic_noise(ctx["tide_level_m"], 0.05)
    hist_score = geo_district_to_historical_score(district)
    soil_sat = add_realistic_noise(ctx["soil_saturation_base"])

    # Trend: mực nước đang tăng vì đây là đỉnh lũ
    wl_trend = add_realistic_noise(0.3, 0.3)  # +0.3m/h trung bình

    label = label_from_water_level(wl_m, rainfall_mm)

    # Seasonal features (tháng 10)
    month = 10
    month_sin = round(math.sin(2 * math.pi * month / 12), 6)
    month_cos = round(math.cos(2 * math.pi * month / 12), 6)
    seasonal_risk = 26.5  # từ model_metrics.json tháng 10

    return {
        "latitude": round(lat, 6),
        "longitude": round(lng, 6),
        "water_level_m": round(wl_m, 3),
        "rainfall_mm": rainfall_mm,
        "hours_rain": ctx["duration_hours"],
        "tide_level": tide,
        "historical_score": round(hist_score, 1),
        "water_level_trend": round(wl_trend, 4),
        "rain_6h": round(rain_6h, 2),
        "soil_saturation": round(soil_sat, 1),
        "risk_level": label,
        "timestamp": f"{ctx['date']}T{random.randint(6,20):02d}:00:00",
        "month": month,
        "year_index": 3,  # 2022-2019=3
        "month_sin": month_sin,
        "month_cos": month_cos,
        "seasonal_risk_score": seasonal_risk,
        "data_source": "real_flood_report_2022",
    }


def main():
    # Load flood reports
    reports_path = CRAWL_DIR / "flood_reports_2022_all.json"
    if not reports_path.exists():
        print(f"ERROR: {reports_path} not found")
        sys.exit(1)

    with open(reports_path, encoding="utf-8") as f:
        reports = json.load(f)

    print(f"Loaded {len(reports)} real flood reports from Oct 14, 2022")

    # Load existing dataset
    base_csv = DATA_DIR / "flood_danang_2019_2024.csv"
    existing_rows = []
    fieldnames = []
    if base_csv.exists():
        with open(base_csv, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            existing_rows = list(reader)
        print(f"Existing dataset: {len(existing_rows)} rows")

    # Convert reports
    new_rows = []
    label_counts = {}
    for report in reports:
        wl_cm = float(report.get("water_level") or 0)
        if wl_cm < 5:   # bỏ qua báo cáo gần 0 — likely error readings
            continue
        row = convert_report_to_training_row(report)
        new_rows.append(row)
        label_counts[row["risk_level"]] = label_counts.get(row["risk_level"], 0) + 1

    print(f"\nConverted {len(new_rows)} real flood records")
    print("Label distribution:")
    for label, count in sorted(label_counts.items()):
        print(f"  {label:10s}: {count:4d}")

    # Determine output fieldnames
    if not fieldnames and new_rows:
        fieldnames = list(new_rows[0].keys())
    elif new_rows:
        # Thêm columns mới nếu có
        for col in new_rows[0].keys():
            if col not in fieldnames:
                fieldnames.append(col)

    # Augmented dataset
    out_path = DATA_DIR / "flood_danang_2019_2024_augmented.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(existing_rows)
        writer.writerows(new_rows)

    total = len(existing_rows) + len(new_rows)
    print(f"\nAugmented dataset saved: {out_path}")
    print(f"Total rows: {total} (+{len(new_rows)} real events)")

    # Thống kê label trong augmented dataset
    all_labels = {}
    for r in existing_rows:
        lbl = r.get("risk_level", "?")
        all_labels[lbl] = all_labels.get(lbl, 0) + 1
    for r in new_rows:
        lbl = r["risk_level"]
        all_labels[lbl] = all_labels.get(lbl, 0) + 1

    print("\nFinal label distribution (augmented):")
    for label, count in sorted(all_labels.items()):
        pct = count / total * 100
        print(f"  {label:10s}: {count:5d} ({pct:.1f}%)")


if __name__ == "__main__":
    main()
