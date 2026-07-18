---
phase: 6
title: "Tích hợp demo + câu chuyện"
status: pending
priority: P2
effort: "0.5-1d"
dependencies: [4, 5]
---

# Phase 06: Tích hợp demo end-to-end + câu chuyện số thật

## Overview
Ghép heatmap + realtime vào mobile map, chuẩn bị kịch bản demo và talking points dựa trên CON SỐ THẬT; loại bỏ/ẩn classifier circular cũ.

## Requirements
- Functional: luồng end-to-end chạy trên mobile (heatmap tĩnh + lớp rủi ro động + điểm lũ lịch sử).
- Non-functional: thông điệp trung thực, bảo vệ được trước câu hỏi giám khảo.

## Architecture
Mobile map = 3 lớp: (1) susceptibility heatmap, (2) rủi ro động live, (3) 391 điểm lũ thật 2022. Backend/AI phục vụ dữ liệu.

## Related Code Files
- Modify: mobile map layer (`mobile/src/...` map screen), service gọi endpoint mới
- Modify: retire/flag endpoint dự báo cũ dùng model circular (giữ để so sánh nếu muốn, nhưng không phải "sản phẩm chính")
- Create: `docs/demo_script.md` (kịch bản + talking points)

## Implementation Steps
1. Mobile: thêm/đổi layer bản đồ đọc `susceptibility_grid.geojson` + endpoint `/risk/live`; toggle lớp điểm lũ lịch sử.
2. Kịch bản demo: mở heatmap → chỉ vùng nguy cơ cao trùng điểm lũ thật → bật mưa live → rủi ro động thay đổi.
3. Talking points TRUNG THỰC: "AUC 0.8x spatial-CV trên 391 điểm lũ thật 14/10/2022" thay cho 98.81%; nêu rõ phương pháp + hạn chế (điểm cộng minh bạch với giám khảo kỹ thuật).
4. Ẩn/ghi chú model 4-lớp cũ để tránh bị hỏi xoáy về số ảo.
5. Smoke test toàn luồng: AI service → backend → mobile.

## Success Criteria
- [ ] Demo chạy end-to-end trên mobile, 3 lớp hiển thị đúng.
- [ ] `docs/demo_script.md` có talking points số thật + trả lời câu hỏi khó (pseudo-absence, 1 sự kiện).
- [ ] Không còn chỗ nào quảng bá 98.81% như năng lực dự báo thật.

## Risk Assessment
- Tích hợp mobile tốn thời gian hơn dự kiến → ưu tiên heatmap tĩnh (chắc chắn ăn hình) trước, realtime là bonus.
- Giám khảo hỏi "sao AUC thấp hơn 98%?" → đã có talking point: số cũ ảo do circular; số mới thật + kiểm định nghiêm.
