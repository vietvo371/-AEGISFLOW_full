# 🧭 HANDOFF — Đọc file này ĐẦU TIÊN (cho session Claude mới trên máy Windows)

> **Vì sao có file này:** auto-memory của Claude nằm trong `~/.claude` trên máy Mac cũ — **KHÔNG theo git**. File này là "bộ nhớ di động" chứa toàn bộ ngữ cảnh để một session Claude MỚI (trên Windows) tiếp tục được ngay mà không cần lịch sử chat.

## 0. Cách tiếp tục (TL;DR)
1. Đọc file này + `plan.md` (cùng thư mục) + `../../docs/brainstorm_flood_redesign_2026-07-16.md`.
2. Cook theo thứ tự phase trong `plan.md`. Có thể dùng: `/cke-cook plans/260716-flood-model-redesign/plan.md`
3. **Đường tới hạn tiếp theo:** Phase 01 → 02 → 03 (Phase 00 chạy song song).

## 1. BỐI CẢNH SỐNG CÒN (đừng bỏ qua)
- **Mục đích:** Hackathon/Demo. Dự án AegisFlow — dự báo ngập Đà Nẵng.
- **Model cũ (v4.1, "98.81% accuracy") là ẢO — TUYỆT ĐỐI KHÔNG trích dẫn như năng lực thật.** Lý do (đã audit trên code):
  1. Nhãn circular: `ai-service/data/preprocessing.py::compute_label()` sinh nhãn bằng hàm ngưỡng từ CHÍNH các feature đầu vào → model chỉ học lại quy tắc if-else.
  2. 51% dòng trùng lặp do oversample-trước-split → rò rỉ train/test.
  3. ~88% dữ liệu synthetic; không có script train; `lightgbm` thiếu trong requirements → model âm thầm rơi fallback.
- **QUYẾT ĐỊNH đã chốt:** bỏ classifier 4-lớp, làm **Combo 1+2**:
  - **Phần A (lõi AI):** Flood Susceptibility Mapping — phân loại nhị phân `P(vùng dễ ngập)` theo vị trí.
  - **Phần B (realtime):** `rủi ro = susceptibility × f(mưa/nước live muangap)`, ngưỡng minh bạch.

## 2. DỮ LIỆU THẬT (nguồn nhãn — KHÔNG dùng CSV synthetic cũ)
- `scripts/crawled_data/flood_reports_2022_oct14.json` — **391 điểm ngập THẬT 14/10/2022** (tọa độ + độ sâu 0–450cm) → POSITIVE.
- `scripts/crawled_data/flood_reports.json` — lọc `is_frequent=true` → **77 điểm kinh niên** → POSITIVE.
- `scripts/crawled_data/water_stations_all.json` (93 trạm nước), `rain_stations.json` (82 trạm mưa) — mạng lưới thật + ngưỡng.
- `scripts/fetch_live_muangap.py` — crawl LIVE (chỉ hiện tại, KHÔNG có lịch sử → chưa train forecast theo giờ được).
- Elevation: `ai-service/data/danang_flood_graph.json`; DEM SRTM/Copernicus (free) cho Phase 02.
- ❌ `ai-service/data/flood_danang_*.csv` = ~88% synthetic + nhãn circular → **KHÔNG dùng làm nhãn.**

## 3. LUẬT BẤT DI BẤT DỊCH (tránh lặp lỗi cũ)
- **KHÔNG** dùng nhãn circular / CSV synthetic làm ground truth.
- **KHÔNG** oversample nhân bản dòng; cân bằng bằng `class_weight`/`scale_pos_weight`.
- **Split TRƯỚC, cân bằng SAU**; dedup; đánh giá bằng **spatial block CV** (không random split); metric chính = **PR-AUC**.
- **Pseudo-absence phải trộn ~40% hard negatives** (gần sông, elevation trung bình) — nếu chỉ lấy negative vùng cao/xa, model học "cao=an toàn" tầm thường (AUC ảo).
- **Feature builder DÙNG CHUNG train==serve**; geospatial chỉ build-time; production đọc `feature_grid.parquet` (không cần GDAL trong Docker).
- **CẦU NỐI VERSION:** `.pkl` train bằng `scikit-learn=1.6.0` → ai-service (pip) cũng phải `1.6.0`, nếu không load lỗi. Smoke-test load pkl trong env pip trước khi coi là xong.

## 4. TRẠNG THÁI HIỆN TẠI (tính đến khi handoff)
✅ **Đã xong (có trong repo):**
- `plan.md` + 7 phase file (00→06) — kế hoạch chi tiết.
- `docs/brainstorm_flood_redesign_2026-07-16.md` — design.
- `ai-service/environment.yml` — conda env `aegisflow-flood` (Windows).
- `ai-service/models/train_susceptibility.py` — **khung trainer đã validate** (self-test pass): spatial CV, RF vs XGBoost, PR-AUC, baseline, ghi version, `--self-test`.

⏳ **Chưa làm (việc tiếp theo):**
- **Phase 00** — vá nhanh: `lightgbm==4.6.0`+`libgomp1`; vá serving-skew `rain_6h`/`soil_saturation` trong `ai-service/services/flood_calculator.py`; sửa `model_metrics.json` thôi khoe 98.81%.
- **Phase 01** — `ai-service/data/build_labeled_dataset.py` → `labeled_points.csv` (391+77 positive + pseudo-absence có hard-negative).
- **Phase 02** — `ai-service/services/feature_builder.py` (hàm `build_feature_frame(df[['lat','lon']]) -> DataFrame[elevation,slope,dist_river,dist_coast,historical_score]`) + `feature_grid.parquet`.
- **Phase 03** — chạy `train_susceptibility.py` với dữ liệu thật → `.pkl` + metrics + model_card (khung đã sẵn, chỉ chờ input Phase 01/02).
- **Phase 04–06** — heatmap, realtime, demo.

> ⚠️ `train_susceptibility.py` sẽ báo lỗi rõ ràng chỉ vào Phase 01 (thiếu `labeled_points.csv`) hoặc Phase 02 (thiếu `feature_builder.py`) — đó là bình thường cho tới khi 2 phase đó xong.

## 5. Môi trường trên Windows 4080
```powershell
conda env create -f ai-service/environment.yml
conda activate aegisflow-flood
python ai-service/models/train_susceptibility.py --self-test   # test môi trường (data giả)
```
GPU 4080 KHÔNG dùng (RF = CPU vài giây); chọn máy vì workstation ổn định + conda cài geospatial mượt.

## 6. Contract giao diện giữa các phase (để không lệch)
- Phase 01 xuất `labeled_points.csv` cột: `lat, lon, label`(1/0)`, source[, water_level_cm]`.
- Phase 02 xuất `feature_builder.build_feature_frame(df[['lat','lon']])` → DataFrame đúng các cột: `elevation, slope, dist_river, dist_coast, historical_score`.
- Phase 03 (`train_susceptibility.py`) đọc 2 thứ trên → không cần sửa khung nếu contract khớp.
