# Thiết kế lại mô hình AI ngập lụt AegisFlow — Combo 1+2

**Ngày:** 2026-07-16 · **Bối cảnh:** Hackathon/Demo · **Quyết định:** Bỏ classifier 4-lớp circular, chuyển sang Flood Susceptibility Mapping (lõi AI) + Realtime monitoring (lớp thời gian thực).

## 1. Vấn đề (đã audit)
Số 98.81% ảo do: nhãn circular (hàm của chính feature), 51% dòng trùng lặp rò rỉ train/test, ~88% synthetic, không script train, lightgbm thiếu, train/serve skew. → Con số vô nghĩa cho dự báo thật.

## 2. Dữ liệu thật khả dụng
- **391 điểm ngập thật 14/10/2022** (tọa độ + độ sâu 0–450cm) — `scripts/crawled_data/flood_reports_2022_oct14.json`
- **77 điểm ngập kinh niên** (`is_frequent`) — `flood_reports.json`
- **93 trạm nước + 82 trạm mưa thật** (tọa độ, loại tháp báo ngập) — `water_stations_all.json`, `rain_stations.json`
- **API live muangap** (`fetch_live_muangap.py`) — snapshot mực nước/mưa realtime
- Độ cao node từ `danang_flood_graph.json`; DEM SRTM/Copernicus miễn phí
- ❌ KHÔNG có chuỗi thời gian nhiều sự kiện → không train forecast realtime lúc này.

## 3. Kiến trúc giải pháp

### Phần A — Flood Susceptibility Model (lõi AI, offline train)
- **Bài toán:** phân loại nhị phân `P(vùng dễ ngập)` theo vị trí (grid ~100–250m phủ Đà Nẵng).
- **Positive:** ~450 điểm ngập thật (391 + 77, dedup). Tùy chọn: dùng độ sâu làm target hồi quy ở v2.
- **Negative (pseudo-absence):** lấy mẫu điểm KHÔNG có báo cáo ngập, ưu tiên vùng cao/xa sông, buffer loại trừ quanh positive; tỉ lệ ~2–3× positive. **Đây là rủi ro phương pháp lớn nhất** (presence-only) → phải nêu caveat.
- **Feature (tĩnh, theo vị trí):** elevation, slope, khoảng cách tới sông, khoảng cách tới biển, mật độ thoát nước/TWI (nếu kịp), historical_score. Bắt đầu tối giản: elevation + dist_river + dist_coast + slope + historical_score.
- **Model:** RandomForest hoặc XGBoost nhị phân (KHÔNG stacking 5 tầng — YAGNI). Kèm SHAP để giải thích cho giám khảo.
- **Đánh giá TRUNG THỰC:** spatial block CV (giấu quận/ô lưới, dự báo ô đó); báo ROC-AUC + PR-AUC + reliability curve; xuất **confusion trên điểm lũ thật held-out**. Kỳ vọng AUC ~0.78–0.88.
- **Output:** `susceptibility_grid.geojson` (heatmap) + `flood_susceptibility_model.pkl` + `model_card.md` trung thực.

### Phần B — Realtime layer (online, minh bạch)
- Cron `fetch_live_muangap.py` → mực nước/mưa hiện tại theo trạm.
- **Rủi ro động = susceptibility(vị trí) × f(mưa/nước live gần nhất)** — công thức minh bạch, không giả vờ ML.
- Ngưỡng cảnh báo từ loại trạm ("tháp báo ngập" flood_1m5...).
- Phủ 391 điểm lịch sử + 77 điểm đen làm lớp nền bản đồ.

## 4. Sản phẩm bàn giao
1. `train_susceptibility.py` — trainer tái tạo được (nguồn chân lý duy nhất).
2. Module `feature_builder.py` dùng CHUNG train + serve (chống skew).
3. `susceptibility_grid.geojson` cho bản đồ mobile.
4. Endpoint realtime kết hợp susceptibility + live data.
5. `model_card.md` — nêu rõ nguồn nhãn, caveat pseudo-absence, metric thật.

## 5. Câu chuyện demo
Heatmap nguy cơ ngập toàn thành phố + "AUC 0.8x dự báo đúng vùng ngập trên 391 điểm lũ thật 14/10/2022 (spatial CV)" + lớp mưa live. Thay thế hoàn toàn con số 98.81%.

## 6. Rủi ro & giảm thiểu
| Rủi ro | Giảm thiểu |
|---|---|
| Pseudo-absence bias (lớn nhất) | Lấy mẫu âm theo địa hình + buffer; nêu caveat trong model card |
| Chỉ 1 sự kiện lũ | Susceptibility khái quát theo KHÔNG GIAN; nêu rõ hiệu chỉnh theo 1 trận |
| Lấy DEM/sông/biển geometry | DEM SRTM free; sông/bờ biển từ OSM/geojson sẵn có |
| Positive nhỏ (~450) | Model đơn giản + spatial CV, tránh overfit |

## 7. Việc vá nhanh song song (bất kể hướng)
- Thêm `lightgbm` + `libgomp1`; vá serving-skew `rain_6h`/`soil_saturation`; cập nhật metrics.json ngừng khoe 98.81%.
