---
phase: 2
title: "Feature builder (build-time, Windows+conda)"
status: done
priority: P1
effort: "0.5-1d"
dependencies: [1]
---

# Phase 02: Feature builder — build-time trên Windows/conda, serve đọc precompute

## Overview
Sinh feature TĨNH theo vị trí ở **build-time trên máy Windows 4080 (conda)**. Vì feature tĩnh (không đổi theo thời gian) → **precompute một lần thành lưới, commit về repo**; inference chỉ **tra cứu ô gần nhất** → (1) production Docker KHÔNG cần GDAL, (2) parity train==serve tuyệt đối (cùng đọc một nguồn precompute).

## Requirements
- Functional: `feature_builder.py` (build-time) sinh vector từ (lat,lon); export `feature_grid.parquet` phủ Đà Nẵng; hàm `lookup_features(lat,lon)` (serve-time) tra cứu ô gần nhất — KHÔNG cần rasterio/GDAL.
- Non-functional: DRY (một công thức); geospatial chỉ ở build-time; reproducible (seed/nguồn DEM ghi rõ).

## Môi trường (Windows 4080 + conda) ⭐
Toàn bộ geospatial cài qua **conda-forge** (né địa ngục GDAL của pip trên Windows). Tạo `ai-service/environment.yml`:

```yaml
name: aegisflow-flood
channels: [conda-forge]
dependencies:
  - python=3.12            # khớp runtime ai-service (Dockerfile python:3.12) cho pickle an toàn
  - scikit-learn=1.6.0     # ⚠️ BẮT BUỘC khớp ai-service để .pkl load được ở production
  - xgboost>=2.0,<3
  - numpy=2.0.*            # khớp ai-service (numpy 2.0.2); nới nếu solver conda kẹt
  - pandas
  - scipy
  - joblib
  - shap
  - geopandas
  - rasterio
  - gdal
  - pyproj
  - shapely
  - fiona
  - pyarrow            # ghi/đọc parquet
  - matplotlib
  - jupyterlab
```

Cài (Anaconda Prompt / PowerShell đã `conda init`):
```
conda env create -f ai-service/environment.yml
conda activate aegisflow-flood
```
> Lưu ý cầu nối train↔serve: production Docker vẫn dùng **pip (`requirements.txt`)**, KHÔNG dùng conda. Nên `scikit-learn` ở conda env này PHẢI trùng version với `requirements.txt` (1.6.0), nếu không `.pkl` train ra sẽ không load được trong ai-service.

## Architecture
- **Build-time (Windows/conda):** DEM + geometry sông/biển → `feature_builder.build_feature_vector(lat,lon)` → tính elevation/slope/dist_river/dist_coast/historical_score.
- **Precompute:** chạy trên lưới ~150–250m phủ bbox Đà Nẵng → `feature_grid.parquet` (commit về repo).
- **Serve-time (Docker, nhẹ):** `lookup_features(lat,lon)` = nearest-cell trên `feature_grid.parquet` (chỉ cần pandas/pyarrow, KHÔNG GDAL).

## Related Code Files
- Create: `ai-service/environment.yml` (conda env — nguồn chân lý môi trường)
- Create: `ai-service/services/feature_builder.py` (build-time: công thức feature; serve-time: `lookup_features`)
- Create: `ai-service/data/dem_danang.tif` (DEM SRTM/Copernicus bbox Đà Nẵng)
- Create: `ai-service/data/hydro_geometry.geojson` (sông + bờ biển)
- Create output: `ai-service/data/feature_grid.parquet` (feature tĩnh precompute — commit)
- Modify (Phase 03/05 import): trainer + `flood_calculator.py` (chỉ import `lookup_features`)

## Implementation Steps
1. `conda env create` như trên; xác nhận `python -c "import rasterio, geopandas, sklearn; print(sklearn.__version__)"` ra `1.6.0`.
2. Lấy DEM bbox Đà Nẵng (SRTM 30m / Copernicus). Fallback: elevation từ `danang_flood_graph.json` nội suy nearest-node nếu tải DEM chậm.
3. Trích sông + bờ biển (OSM/geometry sẵn) → `hydro_geometry.geojson`.
4. `feature_builder.py` (KISS): `elevation`, `slope` (từ DEM), `dist_river`, `dist_coast` (m, tới polyline gần nhất), `historical_score` (mật độ báo cáo lịch sử lân cận). Tùy chọn: `TWI`, `drainage_density`.
5. Script precompute → `feature_grid.parquet` phủ bbox; loại điểm trên biển (tái dùng `DaNangLandMask`).
6. `lookup_features(lat,lon)` đọc parquet, trả ô gần nhất (KDTree). Unit test: `build_feature_vector` (build) và `lookup_features` (serve) khớp nhau tại các điểm lưới.

## Success Criteria
- [ ] `conda activate aegisflow-flood` chạy được trên Windows; `sklearn.__version__ == "1.6.0"`.
- [ ] `feature_grid.parquet` sinh được, commit về repo (<vài chục MB).
- [ ] `lookup_features` chạy KHÔNG cần rasterio/GDAL (test trong môi trường pip-only).
- [ ] Trainer (Phase 03) và `flood_calculator.py` (Phase 05) đều dùng CÙNG nguồn feature (grid) — parity đảm bảo.
- [ ] Xử lý điểm ngoài phạm vi DEM (giá trị biên có kiểm soát).

## Risk Assessment
- Tải DEM/sông chậm → fallback elevation từ graph + khoảng cách hình học. Ghi rõ nguồn dùng thực tế.
- Sai hệ toạ độ (WGS84 vs projected) khi tính mét → dùng `pyproj`/haversine nhất quán, có test.
- Solver conda kẹt khi ghim cả `scikit-learn=1.6.0` + `numpy=2.0.*` + geospatial → nới `numpy` trước, giữ chặt `scikit-learn=1.6.0` (ưu tiên tương thích pkl).
- Grid precompute lệch độ phân giải so với lúc train → dùng CHUNG một script/tham số lưới cho cả train và serve.
