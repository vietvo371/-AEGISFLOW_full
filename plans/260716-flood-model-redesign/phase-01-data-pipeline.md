---
phase: 1
title: "Data pipeline nhãn thật"
status: pending
priority: P1
effort: "0.5-1d"
dependencies: []
---

# Phase 01: Data pipeline nhãn thật (positive + pseudo-absence)

## Overview
Xây tập điểm gắn nhãn TRUNG THỰC từ dữ liệu ngập thật, thay hoàn toàn CSV synthetic. Đây là nền cho toàn bộ mô hình.

## Requirements
- Functional: sinh `labeled_points` gồm positive (ngập thật) + negative (pseudo-absence) tái tạo được (seed cố định).
- Non-functional: minh bạch nguồn từng điểm; không rò rỉ nhãn.

## Architecture
Presence-only → presence/pseudo-absence. Positive từ báo cáo thật; negative lấy mẫu có kiểm soát theo địa hình để giảm bias.

## Related Code Files
- Create: `ai-service/data/build_labeled_dataset.py`
- Create output: `ai-service/data/labeled_points.csv` (cols: `lat, lon, label, source, water_level_cm?`)
- Read: `scripts/crawled_data/flood_reports_2022_oct14.json` (391 positive), `scripts/crawled_data/flood_reports.json` (lọc `is_frequent=True` → 77 positive)
- Read: `scripts/crawled_data/water_stations_all.json` (bbox/tọa độ tham chiếu), `ai-service/data/danang_flood_graph.json` (elevation node)

## Implementation Steps
1. Parse positive: gộp 391 điểm Oct14 + 77 điểm kinh niên → dedup theo (lat,lon) làm tròn ~5 chữ số → ~450 positive. Giữ `water_level` (cm) nếu có (dùng cho v2 hồi quy).
2. Xác định bbox/ranh giới Đà Nẵng từ station coords (hoặc polygon hành chính nếu có).
3. Pseudo-absence: lấy mẫu ngẫu nhiên trong bbox, **loại trừ buffer ~300–500m quanh mọi positive**. Tỉ lệ negative:positive = 2–3×. Seed cố định.
   - ⚠️ **BẪY phải tránh:** KHÔNG lấy negative toàn ở vùng cao/xa → model chỉ học "cao = an toàn", AUC đẹp nhưng tầm thường (lặp lại lỗi trivially-separable). **Trộn negative theo 2 nhóm:** (a) ~60% "easy" (vùng cao/xa sông), (b) ~40% "hard negative" (elevation trung bình, gần sông nhưng ngoài buffer positive). Ép model học ranh giới thật, không chỉ độ cao.
4. Ghi `labeled_points.csv` + `labeled_points_meta.json` (số positive/negative, tham số buffer/tỉ lệ/seed).

## Success Criteria
- [ ] `labeled_points.csv` có ~450 positive + ~900–1350 negative, cột `source` rõ ràng.
- [ ] KHÔNG dùng bất kỳ dòng nào từ `flood_danang_*.csv`.
- [ ] Chạy lại script → kết quả giống hệt (deterministic).
- [ ] Bản đồ nhanh (scatter) cho thấy positive trùng vùng ngập thật, negative rải vùng cao/xa.

## Risk Assessment
- Pseudo-absence bias: buffer + elevation-informed sampling; ghi rõ tham số. Sẽ validate ở Phase 03 (PR-AUC + reliability).
- Positive trùng lặp/địa chỉ tuyến đường (flood_type='street') là 1 polyline → lấy điểm đại diện (centroid) tránh nhân bản.
