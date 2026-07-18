---
title: "AegisFlow — Thiết kế lại mô hình AI ngập lụt (Flood Susceptibility + Realtime)"
status: done   # Phase 00–06 DONE (xem HANDOFF). Còn lại: build RN/PHP để kiểm thử UI runtime.
created: 2026-07-16
scope: project
context: Hackathon/Demo
source: skill:cke-plan (after cke-brainstorm)
design_doc: docs/brainstorm_flood_redesign_2026-07-16.md
blockedBy: []
blocks: []
---

# AegisFlow — Thiết kế lại mô hình AI ngập lụt

> 🧭 **SESSION MỚI / MÁY WINDOWS: đọc [`HANDOFF.md`](./HANDOFF.md) TRƯỚC** — chứa toàn bộ ngữ cảnh (auto-memory không theo git). Trạng thái: xong plan+design+env+khung train; việc tiếp theo = Phase 00 (song song) + Phase 01→02→03.

## Mục tiêu
Thay bộ classifier 4-lớp **circular (98.81% ảo)** bằng một mô hình AI **trung thực, đánh giá được**:
- **Lõi AI (Phần A):** Flood Susceptibility Mapping — `P(vùng dễ ngập)` theo vị trí, nhãn = **391 điểm lũ thật 14/10/2022 + 77 điểm kinh niên**, đánh giá bằng **spatial CV → AUC thật ~0.78–0.88**.
- **Realtime (Phần B):** kết hợp susceptibility tĩnh × dữ liệu mưa/nước **live** từ muangap → rủi ro động, ngưỡng minh bạch.

**Nguyên tắc:** YAGNI/KISS/DRY. Không dùng lại CSV synthetic. Feature builder DÙNG CHUNG train+serve (chống skew). Mọi con số phải bảo vệ được trước giám khảo.

## Môi trường train (đã chốt)
- **Máy:** Windows + RTX 4080, dùng **conda** (`ai-service/environment.yml`, env `aegisflow-flood`). GPU KHÔNG dùng cho RF — chọn máy này vì workstation cố định + conda-forge cài geospatial mượt, không vì GPU.
- **Geospatial chỉ ở build-time** (Windows/conda). Production Docker giữ nhẹ (pip), inference đọc feature precompute → không cần GDAL, không skew.
- ⚠️ **Cầu nối sống còn:** ghim `scikit-learn=1.6.0` ở CẢ conda env (train) lẫn `requirements.txt` (serve) để `.pkl` load được. Smoke-test load pkl trong môi trường pip trước khi coi là xong.

## Không làm (out of scope lúc này)
- Forecast mực nước theo giờ (thiếu chuỗi thời gian nhiều sự kiện) → để Phần 3-tương-lai sau khi cron tích luỹ dữ liệu.
- Stacking ensemble 5 tầng (overkill).

## Phases

| # | Phase | Ưu tiên | Phụ thuộc | DoD ngắn |
|---|-------|---------|-----------|----------|
| 00 | Vá nhanh chặn rủi ro | P1 | — | lightgbm+libgomp1; hết serving-skew; metrics.json thôi khoe 98.81% |
| 01 | Data pipeline nhãn thật | P1 | — | `labeled_points` (positive thật + pseudo-absence) tái tạo được |
| 02 | Feature builder dùng chung | P1 | 01 | `build_feature_vector(lat,lon)` train==serve parity |
| 03 | Train + đánh giá trung thực | P1 | 01,02 | model.pkl + spatial-CV AUC/PR + model_card caveat |
| 04 | Heatmap susceptibility | P2 | 03 | `susceptibility_grid.geojson` render trên map |
| 05 | Realtime layer (Phần B) | P2 | 03,04 | endpoint rủi ro động = susceptibility × live |
| 06 | Tích hợp demo + câu chuyện | P2 | 04,05 | end-to-end trên mobile + talking points số thật |

**Đường tới hạn (critical path):** 01 → 02 → 03 → 04 → 05 → 06. Phase 00 chạy song song ngay từ đầu.

## Thứ tự khuyến nghị cho hackathon
1. Ngày 1: Phase 00 (song song) + Phase 01.
2. Ngày 2: Phase 02 + 03 → **có ngay con số AUC thật** (mốc quan trọng nhất: biết mô hình thật mạnh cỡ nào).
3. Ngày 3: Phase 04 (heatmap) + 05 (realtime).
4. Ngày 4: Phase 06 (demo) + đệm rủi ro.

## Rủi ro tổng thể
- **Pseudo-absence bias (lớn nhất):** nhãn presence-only, "không báo cáo" ≠ "không ngập". → lấy mẫu âm theo địa hình + nêu caveat trong model_card; báo cả PR-AUC (nhạy với imbalance).
- **Chỉ 1 sự kiện lũ:** susceptibility khái quát theo KHÔNG GIAN, hiệu chỉnh mức độ theo 1 trận → nói rõ, không thổi phồng.
- **Lấy DEM/sông/biển:** nếu tải DEM chậm → fallback dùng elevation node trong `danang_flood_graph.json` + khoảng cách hình học tới polyline sông/bờ biển.
- **Positive nhỏ (~450):** giữ model đơn giản, spatial CV, tránh overfit.

## Tham chiếu
- Design: `docs/brainstorm_flood_redesign_2026-07-16.md`
- Audit gốc (task): workflow `wksb6nmj4` — bằng chứng nhãn circular + leakage.
- Dữ liệu thật: `scripts/crawled_data/*.json`; inference hiện tại: `ai-service/services/flood_calculator.py`.
