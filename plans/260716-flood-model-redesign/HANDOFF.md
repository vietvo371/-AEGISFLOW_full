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
- **✅ Phase 00 (DONE)** — `lightgbm==4.6.0`+`libgomp1` (đã xác nhận pkl deploy là stacking cần `lgbm`); vá serving-skew trong `flood_calculator.py::extract_timeseries_features` (phân biệt "không có key mưa" vs "mưa=0", phát hiện theo GIÁ TRỊ≠None để reading `rainfall:null` không tái pin về 0); `model_metrics.json` gắn cờ `validated:false`; **thêm honesty fields vào `train_flood_model_v2.py`** để `/api/retrain` không xoá mất; **thêm `pandas==2.2.3`** vào requirements (thiếu → Docker crash lúc import). Đã test hành vi bằng `uv`.
- **✅ Phase 01 (DONE)** — `ai-service/data/build_labeled_dataset.py` → `labeled_points.csv` (**430 positive** = 387 oct14 + 43 chronic; **1075 negative** = 430 hard + 645 easy; đã lọc outlier ngoài bbox Đà Nẵng). Deterministic (sha256 byte-identical qua 2 lần chạy, seed=42). Có `labeled_points_meta.json` (+`quota_met`) và scatter PNG. Load OK qua `train_susceptibility.load_labeled_points` (62 spatial block). **KHÔNG** dùng CSV synthetic.

- **✅ Phase 02 (DONE)** — `ai-service/services/feature_builder.py`: `build_feature_frame(df[['lat','lon']])` → elevation/slope (DEM Copernicus GLO-30 `dem_danang.tif` 30m), dist_coast (sea-mask DEM = **HỢP mọi lobe biển chạm biên**, KHÔNG argmax — bán đảo Sơn Trà chia biển 2 lobe), dist_river (polyline `hydro_geometry.geojson`), historical_score (mật độ báo cáo — LEAK-PRONE, không train). `feature_grid.parquet` (~200m, **11.534 ô đất liền**, commit; ô biển đã loại). `lookup_features()` serve-time parquet + KDTree, KHÔNG cần rasterio/GDAL. Parity build==serve exact.
- **✅ Phase 03 (DONE + honest-eval sau review vòng 2)** — `train_susceptibility.py` → `flood_susceptibility_model.pkl` (fit trên DataFrame → mang `feature_names_in_`, serve name-validate) + `susceptibility_metrics.json` + `model_card.md`. **Champion RandomForest spatial-CV ROC-AUC=0.869 / PR-AUC=0.699.** ⚠️ **Con số THẬT phải đọc kèm geometry baseline:** rf_dist_coast_only ROC=0.780 → **"ML value-added" = 0.780→0.869 (+0.09)**, KHÔNG phải 0.48→0.869 (-elevation là strawman vì hard-neg chọn theo elevation<8m). Độ bất định thật: LOBO pooled ROC=0.838, per-block std=0.128 (0.47–1.0), 78% positive ở ~8 block (1 sự kiện) → ±std 5-fold hẹp giả tạo. **Đã smoke-test .pkl pip-only (sklearn 1.6.0); serve contract raise nếu sai cột.**

⚠️ **CARRY-FORWARD đã XỬ LÝ ở Phase 02/03 (giữ nguyên nguyên tắc cho Phase 04/05):**
- **water_level_cm & source = METADATA, KHÔNG phải feature** — feature_builder chỉ suy từ (lat,lon). ✓
- **`historical_score` BẪY CIRCULAR** → đã **LOẠI khỏi train** (`train_susceptibility.LEAKY_FEATURES`); model chỉ dùng elevation/slope/dist_river/dist_coast (độc lập với inventory). feature_builder VẪN sinh historical_score cho heatmap Phase 04 (đừng train trên nó). ✓
- **Positional gradient** → đã báo PR/ROC-AUC RIÊNG cho hard vs easy negative (OOF) trong metrics; KHÔNG dùng lat/lon thô làm feature. ✓
- **Cầu version:** conda(train) sklearn 1.6.0 == pip(serve) 1.6.0; đã smoke-test. `requirements.txt` thêm `pyarrow` (đọc parquet serve) + `pandas`.

- **✅ Phase 04 (DONE)** — `ai-service/services/susceptibility_service.py` (score_points/score_grid, serve pip-only) + `ai-service/scripts/generate_susceptibility_grid.py` → `susceptibility_grid.geojson` (11.534 ô, 1.93MB) + `flood_points_reference.geojson` (430 điểm thật). Heatmap trùng trực quan với điểm lũ thật (red band = hành lang sông Hàn). Endpoint `/api/susceptibility/{info,point,grid}`.
- **✅ Phase 05 (DONE)** — `ai-service/services/realtime_risk.py`: `dynamic_risk = clip(susceptibility × f_live, 0,1)`, `f_live = 0.6..1.5` từ mưa 24h + mực nước trạm gần nhất (ngưỡng flood_1m5=1.5m), **rule minh bạch KHÔNG train**. Fallback factor=1.0 khi thiếu snapshot. Endpoint `/api/risk/live[,/grid,/status]` (có `sim_rain_mm` để demo). Seed `ai-service/data/latest_snapshot.json`. Đã test pip-only (fastapi): khô→0.59 "high", mưa 120mm→1.0 "critical", monotonic, fallback OK; 6/6 route đăng ký. Router wire trong `main.py`. **Đã qua review vòng 2 + vá:** water_norm CHỈ dùng THÁP BÁO NGẬP (flood_1m5/flood_3m) — loại gauge mực nước/hồ (vd hồ Đồng Nghệ 32m) để ngày khô không cảnh báo ảo (714 ô saturate → 0); snapshot có thêm `station_type`; `sim_rain_mm` chạy cả khi thiếu snapshot; cache `dynamic_risk_grid`.

- **✅ Phase 06 (DONE)** — `docs/demo_script.md` (talking points số THẬT + kịch bản 3 lớp + trả lời 7 câu hỏi khó); `docs/METRICS_CORRECTION.md` + banner "CHỈ SỐ ĐÃ LỖI THỜI" trên 9 doc marketing (retire 98.81/F1 0.9886/AUC 0.9996). **Backend proxy** (`SusceptibilityController` + `AIServiceClient::getSusceptibilityGrid/getRiskLiveGrid` + route `/api/public/susceptibility/geojson`, `/api/public/risk/live/geojson`). **Mobile** (`MapScreen.tsx` layer `flood_susceptibility` opt-in + `mapService.getSusceptibility/getRiskLive`). Endpoint AI đã smoke-test HTTP đầy đủ (TestClient, pip env).

🎉 **TOÀN BỘ PLAN (Phase 00–06) ĐÃ XONG.**

⏳ **Còn lại (ngoài phạm vi AI — cần môi trường của bạn):**
- **Kiểm thử runtime UI:** máy này KHÔNG có PHP/RN toolchain → code backend (Laravel) + mobile (RN) đã viết theo ĐÚNG pattern hiện có nhưng CHƯA build/chạy được ở đây. Cần `php artisan serve` + build RN để xác nhận lớp bản đồ hiển thị.
- (Tùy chọn) cron chạy `scripts/fetch_live_muangap.py` cập nhật `ai-service/data/latest_snapshot.json`; web `frontend/` (submodule rỗng trong checkout này) nếu là đích demo thay vì mobile.
- **Chưa commit gì** — commit khi bạn sẵn sàng (`.gitignore` đã cho phép `.pkl`).

## 5. Môi trường trên Windows (ĐÃ CÀI trên máy này)
- **conda**: Miniconda3 tại `C:\Users\trumdaden\miniconda3` (cài qua winget). ⚠️ `.condarc` đã set `default_channels: [conda-forge]` để né Anaconda ToS/license — GIỮ NGUYÊN, đừng thêm kênh `defaults`.
- **env**: `aegisflow-flood` (conda-forge, `nodefaults`). Chạy script:
```powershell
& "C:\Users\trumdaden\miniconda3\Scripts\conda.exe" run -n aegisflow-flood python <script>
# (chạy python.exe của env trực tiếp từ Git Bash bị lỗi DLL 127 — dùng `conda run`)
```
- Máy KHÔNG có system Python; cho tác vụ chỉ cần numpy/pandas có thể dùng `uv run --with ...`.
GPU 4080 KHÔNG dùng (RF = CPU vài giây).

## 6. Contract giao diện giữa các phase (để không lệch)
- Phase 01 xuất `labeled_points.csv` cột: `lat, lon, label`(1/0)`, source[, water_level_cm]`.
- Phase 02 xuất `feature_builder.build_feature_frame(df[['lat','lon']])` → DataFrame đúng các cột: `elevation, slope, dist_river, dist_coast, historical_score`.
- Phase 03 (`train_susceptibility.py`) đọc 2 thứ trên → không cần sửa khung nếu contract khớp.
