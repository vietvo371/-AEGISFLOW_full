# 🔧 Sau khi thực hiện plan — Thay đổi gì & Chạy gì để THẤY

> Runbook thực dụng. Mọi lệnh viết cho **Windows PowerShell** trên máy đã cài sẵn (conda env `aegisflow-flood`).
> Đặt biến cho gọn: `$CONDA = "C:\Users\trumdaden\miniconda3\Scripts\conda.exe"`

---

## 0. Trước → Sau (một bảng)

| | TRƯỚC (v4.1 cũ) | SAU (bản mới) |
|---|---|---|
| Loại model | Phân loại 4 lớp | **Susceptibility nhị phân** P(vùng dễ ngập) |
| Nhãn | circular (hàm của chính feature) | **430 điểm ngập THẬT** (2022-10-14 + kinh niên) |
| Dữ liệu | ~88% synthetic | báo cáo thật + **DEM Copernicus 30m** + thuỷ văn |
| "Điểm số" | 98.81% (ẢO) | **spatial-CV ROC-AUC 0.869** (thật) |
| Script tái tạo | không có | `train_susceptibility.py` (seed cố định) |
| Sản phẩm bản đồ | không | **heatmap 11.534 ô** + **rủi ro động realtime** |
| Endpoint mới | — | `/api/susceptibility/*`, `/api/risk/live/*` |
| Tài liệu số ảo | khoe 98.81% | **9 doc gắn banner "lỗi thời"** + `docs/METRICS_CORRECTION.md` |

---

## 1. HAI môi trường (đọc kỹ — hay nhầm)

| Việc | Môi trường | Vì sao |
|---|---|---|
| **Serve-time** (DÙNG: chạy API, demo, realtime) | **Python + `venv` + `pip install -r requirements.txt`** (hoặc **Docker**) | KHÔNG cần GDAL/conda; chỉ đọc file model precompute |
| **Build-time** (chỉ khi TRAIN LẠI: tạo data, DEM, sinh grid) | **conda `aegisflow-flood`** | cần geospatial (rasterio/GDAL) + sklearn 1.6.0 |

> ⚠️ **`uv` KHÔNG phải công cụ của project** — nó chỉ được dùng khi làm trên máy thiếu Python hệ thống. Máy chỉ có Python: dùng `venv`+`pip` như trên.
> ⚠️ conda env KHÔNG có `fastapi` (dep serve nằm ở pip). Đừng `conda run ... uvicorn`. Xem mục 2.5.
> ✅ Để DÙNG (serve) chỉ cần venv+pip vì artifact `.pkl`/`.parquet`/`.geojson` đã commit sẵn — KHÔNG cần train lại.

---

## 2. Chạy để THẤY từng thay đổi

### 2.1 — Data pipeline nhãn THẬT (Phase 01)
```powershell
& $CONDA run -n aegisflow-flood python ai-service/data/build_labeled_dataset.py --plot --verify
```
**Thấy gì:** `430 positive (387 oct14 + 43 chronic) + 1075 negative (430 hard + 645 easy)`, dòng `[verify] … IDENTICAL ✅` (deterministic). Sinh ra:
- `ai-service/data/labeled_points.csv` — mở xem cột `lat,lon,label,source,water_level_cm`
- `ai-service/data/labeled_points_meta.json` — nguồn + tham số + `quota_met`
- `ai-service/data/labeled_points_scatter.png` — **mở ảnh này**: điểm đỏ (lũ thật) tụ ở lõi sông Hàn, cam (hard-neg) xen kẽ, không có điểm nào ngoài biển.

### 2.2 — Feature builder + DEM + grid (Phase 02)
```powershell
& $CONDA run -n aegisflow-flood python ai-service/services/feature_builder.py --self-test
```
**Thấy gì:** `parity … OK ✅` (build==serve khớp tuyệt đối), và bảng probe: `cho_han` elevation ~11m gần sông/biển, `ba_na` ~300m dốc & xa. Sinh `ai-service/data/feature_grid.parquet` (11.534 ô đất liền) + `hydro_geometry.geojson` + `dem_danang.tif` (nếu chưa có).

### 2.3 — Train + SỐ TRUNG THỰC (Phase 03)
```powershell
& $CONDA run -n aegisflow-flood python ai-service/models/train_susceptibility.py
```
**Thấy gì (in ra màn hình):**
```
[cv:random_forest] PR-AUC=0.699… ROC-AUC=0.869…
[geometry baselines] rf_dist_coast_only ROC≈0.780   ← baseline công bằng
[block uncertainty] LOBO pooled ROC≈0.838, per-block std 0.128
```
Sinh: `flood_susceptibility_model.pkl`, `susceptibility_metrics.json`, `model_card.md`. **Mở `ai-service/models/model_card.md`** để đọc bản "số thật + hạn chế".

### 2.4 — Heatmap GeoJSON (Phase 04)
```powershell
& $CONDA run -n aegisflow-flood python ai-service/scripts/generate_susceptibility_grid.py
```
**Thấy gì:** `11534 ô … 1.93 MB`, phân bố mức `low/medium/high/critical`. Sinh `ai-service/data/susceptibility_grid.geojson` + `flood_points_reference.geojson`.

### 2.5 — Chạy API cho DEMO (Phase 04/05)
**Cách CHUẨN (chỉ cần Python + pip) — server demo tối giản, đọc file model đã precompute:**
```powershell
cd ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1          # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn serve_susceptibility:app --host 0.0.0.0 --port 5005
cd ..
```
> Cách khác: `docker compose up ai-service` (full app). Nếu máy CÓ SẴN `uv`: `uv run --with-requirements requirements.txt uvicorn serve_susceptibility:app --port 5005` (khỏi tạo venv). `uv` KHÔNG bắt buộc — project dùng pip/venv + Docker.
Mở trình duyệt: `http://localhost:5005/` (danh sách endpoint) và `http://localhost:5005/docs` (thử trực tiếp).

Gọi thử ở cửa sổ PowerShell khác:
```powershell
curl "http://localhost:5005/api/susceptibility/point?lat=16.055&lon=108.216"        # susceptibility cao (~0.97)
curl "http://localhost:5005/api/risk/live?lat=16.055&lon=108.216"                    # khô → level "high"
curl "http://localhost:5005/api/risk/live?lat=16.055&lon=108.216&sim_rain_mm=120"    # mưa → "critical"
```
> **Full app** (mọi router) chạy qua Docker: `docker compose up ai-service` (dùng `requirements.txt`). Bản proxy Laravel: `GET /api/public/susceptibility/geojson` → cần `php artisan serve`.

### 2.6 — Vá serving-skew (Phase 00) — kiểm tra hành vi
Đặc trưng realtime từng bị "kẹt về 0" khi backend gửi readings chỉ có mực nước:
```powershell
& $CONDA run -n aegisflow-flood python -c "import sys; sys.path.insert(0,'ai-service/services'); from flood_calculator import extract_timeseries_features as f; print(f([{'value':1.5-i*0.05,'recorded_at':str(i)} for i in range(8)], 1.5, 30.0))"
```
**Thấy gì:** `rain_6h=60.0, soil_saturation=30.75` (TRƯỚC khi vá: cả hai = 0 dù đang mưa 30mm).

### 2.7 — Số ảo đã bị DỌN (Phase 00/06)
```powershell
Select-String -Path docs/*.md,*.md,ai-service/README_MODELS.md -Pattern "LỖI THỜI" | Select-Object -First 12
```
**Thấy gì:** banner "CHỈ SỐ ĐÃ LỖI THỜI" đầu 9 tài liệu. Đọc `docs/METRICS_CORRECTION.md` (bản đính chính chính thức) và `docs/demo_script.md` (kịch bản + trả lời câu hỏi khó).

### 2.8 — VẬN HÀNH lớp REALTIME (live)
> ⚠️ Khác biệt cốt lõi: model TĨNH dùng ngay (chỉ chạy service); realtime cần **bơm dữ liệu live định kỳ**.
> Luồng: `fetch_live_muangap.py` → `latest_snapshot.json` → `/api/risk/live/grid` → app.

**Bước 1 — cập nhật snapshot** (crawl muangap; đã sửa để ghi CẢ `ai-service/data/` → service dùng data mới ngay, không dính seed cũ):
```powershell
# trong venv đã cài requirements.txt ở mục 2.5 (đã có 'requests'):
python scripts/fetch_live_muangap.py                        # 1 lần
python scripts/fetch_live_muangap.py --loop --interval 900  # tự động 15'/lần
```
> Không vào được `muangap.danang.gov.vn` → script tự fallback file trạm tham chiếu (snapshot vẫn hợp lệ, giá trị ~0).

**Bước 2 — gọi endpoint** (AI service đang chạy — xem 2.5):
```powershell
curl "http://localhost:5005/api/risk/live/grid?min_risk=0.5"       # heatmap RỦI RO ĐỘNG (GeoJSON)
curl "http://localhost:5005/api/risk/live?lat=16.055&lon=108.216"  # 1 điểm + giải thích công thức
curl "http://localhost:5005/api/risk/live/status"                  # snapshot còn tươi hay 'stale'?
```

**Bước 3 — demo không cần chờ trời mưa:** thêm `?sim_rain_mm=120` → giả lập mưa lớn → rủi ro nhảy "critical".

**Fallback (không crash):** thiếu snapshot → tự về susceptibility TĨNH (hệ số 1.0); snapshot cũ → gắn cờ `stale` trong response.

**Tự động hoá (chọn 1):** dev/demo → chạy `--loop`; máy Windows → Task Scheduler gọi lệnh fetch mỗi 15'; production → thêm scheduled command vào Laravel `routes/console.php` shell ra python fetch (đồng bộ các cron sẵn có).

---

## 3. File thay đổi (54 file: 21 mới, 33 sửa)

**Mới — lõi AI/model**
- `ai-service/data/build_labeled_dataset.py`, `labeled_points.csv`, `*_meta.json`, `*_scatter.png`
- `ai-service/services/feature_builder.py`, `data/dem_danang.tif`, `data/feature_grid.parquet`, `data/hydro_geometry.geojson`
- `ai-service/models/train_susceptibility.py`, `flood_susceptibility_model.pkl`, `susceptibility_metrics.json`, `model_card.md`
- `ai-service/scripts/generate_susceptibility_grid.py`, `data/susceptibility_grid.geojson`, `data/flood_points_reference.geojson`
- `ai-service/services/susceptibility_service.py`, `services/realtime_risk.py`, `api/susceptibility.py`, `serve_susceptibility.py`, `data/latest_snapshot.json`

**Mới — tài liệu**
- `docs/demo_script.md`, `docs/METRICS_CORRECTION.md`, `docs/CHANGES_AND_RUN.md` (file này)
- `backend/app/Http/Controllers/Api/SusceptibilityController.php`

**Sửa**
- Phase 00: `ai-service/requirements.txt` (+lightgbm/pandas/pyarrow), `Dockerfile` (+libgomp1), `services/flood_calculator.py` (serving-skew), `models/model_metrics.json` + `models/train_flood_model_v2.py` (honesty), `.gitignore` (cho commit .pkl)
- Phase 06: `main.py` (+router), `backend/routes/api.php` + `AIServiceClient.php` (proxy), `mobile/src/screens/main/MapScreen.tsx` + `services/mapService.ts` (layer), `scripts/fetch_live_muangap.py` (station_type)
- 9 tài liệu marketing + `plans/260716-flood-model-redesign/*` (banner + trạng thái)

---

## 4. Build lại TOÀN BỘ từ số 0 (một mạch)
```powershell
$CONDA = "C:\Users\trumdaden\miniconda3\Scripts\conda.exe"
& $CONDA run -n aegisflow-flood python ai-service/data/build_labeled_dataset.py --verify      # 1. nhãn thật
& $CONDA run -n aegisflow-flood python ai-service/services/feature_builder.py --build-grid    # 2. feature + grid
& $CONDA run -n aegisflow-flood python ai-service/models/train_susceptibility.py              # 3. train + metrics
& $CONDA run -n aegisflow-flood python ai-service/scripts/generate_susceptibility_grid.py     # 4. heatmap geojson
# 5. chạy API demo: xem mục 2.5
```
> Nếu chưa có conda env: `& $CONDA env create -f ai-service/environment.yml` (đã cài `default_channels: conda-forge` để né Anaconda ToS — giữ nguyên).
