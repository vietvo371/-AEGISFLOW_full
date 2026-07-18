---
phase: 0
title: "Vá nhanh chặn rủi ro"
status: done
priority: P1
effort: "2-3h"
dependencies: []
---

# Phase 00: Vá nhanh chặn rủi ro

## Overview
Ba lỗi độc lập, ít rủi ro, cần vá ngay bất kể hướng đi: model im lặng rơi fallback, serving-skew lệch LOW, và metrics.json khoe số ảo. Chạy song song với Phase 01.

## Requirements
- Functional: model stacking load được trên máy sạch; feature realtime không bị pin về 0; metrics.json phản ánh sự thật.
- Non-functional: không phá vỡ API hiện có.

## Architecture
Không đổi kiến trúc — chỉ sửa dependency, một hàm feature, và một file metadata.

## Related Code Files
- Modify: `ai-service/requirements.txt` (thêm `lightgbm==4.6.0`)
- Modify: `ai-service/Dockerfile` (apt thêm `libgomp1`)
- Modify: `ai-service/services/flood_calculator.py` (hàm `extract_timeseries_features` — phân biệt "không có dữ liệu mưa" vs "mưa=0")
- Modify: `ai-service/models/model_metrics.json` (thêm `label_source`, `synthetic_fraction`, `data_quality_note`; đánh dấu số cũ là "rule-recovery, not validated")

## Implementation Steps
1. `requirements.txt`: thêm `lightgbm==4.6.0`; `Dockerfile`: `apt-get install -y ... libgomp1`. Rebuild, xác nhận `import lightgbm` OK và model load nhánh `model_type=='stacking'` không rơi fallback.
2. `flood_calculator.py`: trong `extract_timeseries_features`, tính `has_rain_data = any('rainfall' in r or 'rainfall_mm' in r for r in recent_readings)`. Nếu không có → `rain_6h = min(rainfall_mm*2, 500)`, `soil_saturation = min(100, rain_6h*0.5 + trend*15)` thay vì để 0.
3. `model_metrics.json`: thêm trường trung thực; giữ số cũ nhưng gắn nhãn rõ "measures rule-recovery on ~88% synthetic data; NOT validated on independent floods".

## Success Criteria
- [ ] `python -c "import lightgbm"` OK trong container; log load model không thấy "fallback".
- [ ] Với payload chỉ có `value`+`recorded_at` (giống backend), `rain_6h`/`soil_saturation` KHÔNG còn = 0.
- [ ] `model_metrics.json` có `label_source` + `synthetic_fraction` + `data_quality_note`.

## Risk Assessment
- Rủi ro: version pkl vs lightgbm lệch → pin đúng version lúc train. Mitigation: nếu pkl train bằng lightgbm khác, thử vài version hoặc chấp nhận model mới ở Phase 03 sẽ thay thế.
