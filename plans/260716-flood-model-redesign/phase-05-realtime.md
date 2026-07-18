---
phase: 5
title: "Realtime layer (Phần B)"
status: pending
priority: P2
effort: "0.5-1d"
dependencies: [3, 4]
---

# Phase 05: Realtime layer — rủi ro động = susceptibility × live

## Overview
Kết hợp susceptibility TĨNH với dữ liệu mưa/nước LIVE từ muangap → rủi ro động theo thời gian thực, công thức minh bạch (không giả vờ ML).

## Requirements
- Functional: endpoint trả rủi ro động theo vị trí/khu vực, dùng dữ liệu live gần nhất.
- Non-functional: công thức minh bạch, ghi tài liệu; fallback khi API live chết.

## Architecture
`risk(loc, t) = susceptibility(loc) × f(live_rain, live_water gần nhất)`. Ngưỡng cảnh báo từ loại trạm ("tháp báo ngập" flood_1m5...). Không train — chỉ tổ hợp có kiểm soát.

## Related Code Files
- Modify/Create: `ai-service/services/realtime_prediction.py` hoặc endpoint mới trong `ai-service/api/`
- Reuse: `scripts/fetch_live_muangap.py` (crawl live) → chạy cron/định kỳ
- Import: model + `feature_builder` (susceptibility), `scripts/crawled_data/water_station_types.json` (ngưỡng)
- Backend: `ai-service` trả về → `flood_calculator`/endpoint → mobile map

## Implementation Steps
1. Định kỳ (cron/queue) chạy `fetch_live_muangap.py` → `latest_snapshot.json` (mưa/nước theo trạm).
2. Hàm `f(live)`: chuẩn hoá mưa 24h + mực nước trạm gần nhất → hệ số 0.5–1.5 (thấp khi khô, cao khi mưa lớn). Ghi rõ công thức.
3. `dynamic_risk = clip(susceptibility × f_live, 0, 1)`; map sang mức (low/med/high/critical) bằng ngưỡng minh bạch từ `water_station_types`.
4. Endpoint `/risk/live` trả GeoJSON/điểm rủi ro động cho mobile; fallback = susceptibility tĩnh nếu live lỗi.
5. (Tùy chọn) phát alert khi vượt ngưỡng — nối vào cơ chế alert backend sẵn có.

## Success Criteria
- [ ] Endpoint trả rủi ro động kết hợp đúng static × live; có tài liệu công thức.
- [ ] API live chết → fallback susceptibility tĩnh, không crash.
- [ ] Ngày khô (snapshot ~0) → rủi ro về gần susceptibility nền; giả lập mưa lớn → rủi ro tăng đúng hướng.

## Risk Assessment
- Snapshot chỉ 1 thời điểm, nhiều trạm =0 → f_live phải xử lý thiếu dữ liệu (dùng trạm gần nhất có số / trung bình khu vực).
- Đừng biến thành "ML giả" — giữ công thức minh bạch, nêu rõ đây là rule tổ hợp.
