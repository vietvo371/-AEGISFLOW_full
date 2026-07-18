---
phase: 4
title: "Heatmap susceptibility"
status: done
priority: P2
effort: "0.5d"
dependencies: [3]
---

# Phase 04: Heatmap nguy cơ ngập (susceptibility grid)

## Overview
Chấm điểm mô hình trên lưới phủ Đà Nẵng → GeoJSON heatmap — sản phẩm trực quan ăn điểm demo.

## Requirements
- Functional: sinh `susceptibility_grid.geojson` (mỗi ô có `susceptibility` 0–1) render được trên map.
- Non-functional: đủ nhẹ để mobile map load mượt.

## Architecture
Lưới đều (~150–250m) trong bbox Đà Nẵng → `feature_builder` → model.predict_proba → GeoJSON (polygon ô hoặc điểm có weight cho heatmap).

## Related Code Files
- Create: `ai-service/scripts/generate_susceptibility_grid.py`
- Create output: `ai-service/data/susceptibility_grid.geojson`
- Serve: endpoint mới trong `ai-service/api/` HOẶC file tĩnh backend `public/`; mobile đọc như layer bản đồ
- Import: `ai-service/services/feature_builder.py`, model từ Phase 03

## Implementation Steps
1. Sinh lưới điểm/ô trong bbox (loại điểm ngoài đất liền — tái dùng logic land-mask nếu có ở backend `DaNangLandMask`).
2. Với mỗi ô: `feature_builder` → `model.predict_proba` → gán `susceptibility`.
3. Xuất GeoJSON (bin màu 4–5 mức) + phủ lớp 391 điểm lũ thật + 77 điểm đen để đối chiếu trực quan.
4. Wire vào map: endpoint `/susceptibility/grid` hoặc file tĩnh; mobile thêm layer.

## Success Criteria
- [ ] `susceptibility_grid.geojson` sinh được, kích thước hợp lý (<vài MB).
- [ ] Heatmap render trên mobile map, vùng nguy cơ cao trùng trực quan với điểm lũ thật.
- [ ] Có toggle bật/tắt lớp điểm lũ lịch sử.

## Risk Assessment
- Grid quá mịn → file nặng/chậm. Mitigation: chọn độ phân giải cân bằng; simplify polygon.
- Điểm trên mặt nước/biển gây nhiễu → land-mask.
