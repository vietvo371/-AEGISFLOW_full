# 🎬 AegisFlow — Kịch bản Demo & Talking Points (SỐ THẬT)

> Tài liệu cho buổi demo/hackathon. **Mọi con số ở đây bảo vệ được trước giám khảo kỹ thuật.**
> Nguồn: `ai-service/models/susceptibility_metrics.json`, `model_card.md`, `plans/260716-flood-model-redesign/`.

---

## 0. Thông điệp một câu (elevator pitch)
> "AegisFlow lập **bản đồ nguy cơ ngập theo vị trí** cho Đà Nẵng bằng AI, huấn luyện trên **430 điểm ngập THẬT** (trận 14/10/2022 + điểm kinh niên), đánh giá bằng **spatial cross-validation trung thực (ROC-AUC ≈ 0.87)** — rồi nhân với **dữ liệu mưa/nước realtime** để ra rủi ro động. Chúng tôi **minh bạch cả hạn chế**, không thổi phồng."

---

## 1. Câu chuyện "trước → sau" (điểm cộng trung thực)

| | Model CŨ (đã loại) | Model MỚI (sản phẩm) |
|---|---|---|
| Loại | Phân loại 4 lớp nguy cơ | **Susceptibility nhị phân** P(vùng dễ ngập) |
| Nhãn | Sinh bằng hàm ngưỡng từ chính feature → **CIRCULAR** | **430 điểm ngập THẬT** (báo cáo dân + kinh niên) |
| Dữ liệu | ~88% synthetic | DEM Copernicus 30m + thuỷ văn + báo cáo thật |
| "Độ chính xác" | **98.81% — ẢO** (học lại quy tắc if-else, rò rỉ train/test) | **ROC-AUC 0.869 spatial-CV — THẬT** |
| Kiểm định | random split (rò rỉ) | **spatial-block CV** (chống rò rỉ không gian) |
| Script train | KHÔNG có (không tái tạo được) | `train_susceptibility.py` (seed cố định, tái tạo 100%) |

**Talking point mở màn:** "Con số 98.81% cũ là *ảo* — nó chỉ học lại chính công thức sinh nhãn. Chúng tôi đã **thay bằng đánh giá trung thực** và sẵn sàng giải thích từng bước."

---

## 2. Kịch bản demo (3 lớp bản đồ)

**Chuẩn bị:** AI service chạy (`:5005`), backend (`:8000`), frontend (`:3000`). Bản đồ Đà Nẵng.

1. **Lớp 1 — Heatmap Susceptibility (tĩnh).**
   - Mở bản đồ → bật lớp *"Nguy cơ ngập nền"* (`GET /api/susceptibility/grid`).
   - Chỉ vào **dải đỏ dọc sông Hàn + ven biển** → "đây là vùng địa hình dễ ngập, model học từ độ cao/độ dốc/khoảng cách sông-biển."
2. **Lớp 2 — Điểm lũ THẬT 14/10/2022 (đối chiếu).**
   - Bật toggle lớp *"Điểm ngập lịch sử"* (430 điểm, `flood_points_reference.geojson`).
   - **Điểm đen trùng khít vùng đỏ** → "model tự học ra đúng nơi từng ngập, không phải tô tay."
3. **Lớp 3 — Rủi ro ĐỘNG realtime.**
   - Bật lớp *"Rủi ro live"* (`GET /api/risk/live/grid`).
   - Ngày khô: rủi ro ≈ nền (hệ số ~0.6).
   - **Kéo thanh "giả lập mưa" lên 120mm** (`?sim_rain_mm=120`) → cả vùng chuyển cam/đỏ → "khi mưa lớn, rủi ro động tăng đúng hướng; công thức minh bạch, không phải hộp đen."

**Câu chốt demo:** "Tĩnh cho biết *ở đâu dễ ngập*; động cho biết *khi nào nguy hiểm*. Cả hai đều **kiểm chứng được**."

---

## 3. Talking points số THẬT (học thuộc)

- **Nhãn:** 430 điểm ngập thật = **387** điểm trận 14/10/2022 + **43** điểm kinh niên. 1075 điểm "không ngập" (pseudo-absence) lấy mẫu theo địa hình, **40% là "hard negative"** (đất thấp gần điểm ngập) để model không học kiểu "cao = an toàn" tầm thường.
- **Feature (4):** elevation, slope, dist_river, dist_coast — từ **DEM Copernicus GLO-30 (30m)** + thuỷ văn. *(historical_score bị LOẠI khỏi train vì gây rò rỉ — xem Q4.)*
- **Đánh giá (spatial-block CV ~3km):**
  - **ROC-AUC 0.869**, PR-AUC 0.699.
  - Điểm ước lượng bền: **leave-one-block-out ROC 0.838**.
  - **Minh bạch:** baseline hình học *dist_coast-only* đã đạt **0.780** → **"giá trị ML thêm" thật = +0.09** (0.78 → 0.87), KHÔNG phải 0.48 → 0.87.
- **SHAP:** dist_coast > elevation > dist_river > slope (đúng trực giác: gần biển/sông + đất thấp = dễ ngập).
- **Realtime:** `rủi ro động = clip(susceptibility × hệ_số_live, 0..1)`; `hệ_số_live ∈ [0.6, 1.5]` từ **mưa 24h** + **độ sâu tháp báo ngập** gần nhất. **Rule minh bạch, KHÔNG train** — ta không giả vờ đây là ML.

---

## 4. Trả lời câu hỏi KHÓ (giám khảo kỹ thuật)

**Q1. "Sao AUC mới (0.87) thấp hơn 98.81% cũ?"**
> 98.81% là **ảo**: nhãn cũ sinh bằng hàm ngưỡng từ chính feature (circular) + oversample trước split gây rò rỉ (51% dòng trùng) + 88% synthetic. Model chỉ "học vẹt" quy tắc. 0.869 là con số **trung thực** trên điểm lũ THẬT, kiểm định **spatial-CV** (giấu cả cụm không gian khỏi tập test). Thấp hơn nhưng **thật và bảo vệ được**.

**Q2. "Pseudo-absence bias — 'không có báo cáo' đâu phải 'không ngập'?"**
> Đúng, đây là hạn chế cố hữu của dữ liệu presence-only. Chúng tôi giảm thiểu: (a) **buffer 400m** quanh mọi điểm ngập; (b) **40% hard-negative** ở đất thấp gần điểm ngập; (c) báo **PR-AUC** (nhạy imbalance) và **tách AUC hard vs easy**. Và chúng tôi **ghi rõ caveat này trong model_card** — không giấu.

**Q3. "Chỉ 1 trận lũ thì khái quát được gì?"**
> Model khái quát theo **KHÔNG GIAN** (vùng nào dễ ngập), hiệu chỉnh mức độ theo trận lớn 14/10/2022 + điểm kinh niên. Chúng tôi **KHÔNG** khẳng định dự báo theo thời gian. Độ bất định không gian được báo trung thực: **~78% điểm nằm trong ~8 cụm**, hiệu năng theo khu vực dao động 0.47–1.0 (ghi rõ trong metrics).

**Q4. "0.87 này có phải chỉ là khoảng-cách-tới-biển?"**
> Câu hỏi hay — và chúng tôi **chủ động minh bạch**: dist_coast-only đã cho 0.78 vì điểm "không ngập" được lấy mẫu rải toàn thành phố (xa bờ hơn). **Giá trị ML thật là +0.09** (đa biến trên hình học). Chúng tôi **báo cáo con số này thay vì che** — đó là điểm khác biệt so với "98.81%".

**Q5. "historical_score đâu? Mật độ báo cáo lịch sử hẳn là feature mạnh?"**
> Chính vì **quá mạnh một cách gian lận**: nó suy từ chính nhãn + buffer tạo ranh giới cứng → dùng nó sẽ **circular**, đúng lỗi model cũ. Chúng tôi **LOẠI khỏi train** (chỉ dùng để vẽ heatmap tham khảo). Đây là quyết định *chống rò rỉ* có chủ đích.

**Q6. "Realtime có phải ML không?"**
> Không, và chúng tôi **nói thẳng**: đó là **rule tổ hợp minh bạch** `susceptibility × f(mưa, nước)`. Ngưỡng lấy từ loại trạm thật ("Tháp báo ngập" 1.5m). Chỉ dùng **tháp báo ngập** (đo độ sâu), loại trạm đo mực nước hồ/sông (cao độ tuyệt đối) để không cảnh báo ảo ngày khô.

**Q7. "Tái tạo được không?"**
> 100%. `python ai-service/models/train_susceptibility.py` (seed 42) ra đúng con số; pipeline nhãn deterministic (sha256 khớp qua 2 lần chạy); version thư viện ghi trong artifact; đã smoke-test load `.pkl` trong môi trường production (pip, sklearn 1.6.0).

---

## 5. Checklist smoke-test trước demo

```bash
# 1) Sinh lại artifact (nếu cần) — máy Windows + conda env aegisflow-flood
conda run -n aegisflow-flood python ai-service/services/feature_builder.py --build-grid
conda run -n aegisflow-flood python ai-service/models/train_susceptibility.py
conda run -n aegisflow-flood python ai-service/scripts/generate_susceptibility_grid.py

# 2) Chạy AI service (pip/prod)
cd ai-service && uvicorn main:app --port 5005

# 3) Kiểm tra endpoint
curl "http://localhost:5005/api/susceptibility/info"
curl "http://localhost:5005/api/susceptibility/point?lat=16.055&lon=108.216"      # kỳ vọng susceptibility cao
curl "http://localhost:5005/api/risk/live?lat=16.055&lon=108.216"                  # khô → high
curl "http://localhost:5005/api/risk/live?lat=16.055&lon=108.216&sim_rain_mm=120"  # mưa → critical
curl "http://localhost:5005/api/risk/live/grid?min_risk=0.6" -o /dev/null -w "%{size_download} bytes\n"
```

**Điểm cần thấy:** heatmap trùng điểm lũ thật; khô→nền, mưa→tăng; endpoint trả GeoJSON hợp lệ.

---

## 6. Danh sách endpoint (cho frontend/mobile)

**Kiến trúc:** mobile/web → **Laravel `:8000`** (proxy) → **AI service `:5005`**. Client gọi route `/api/public/...` của Laravel.

| Client (Laravel `:8000`) | Nguồn (AI `:5005`) | Lớp bản đồ |
|---|---|---|
| `GET /api/public/susceptibility/geojson` | `/api/susceptibility/grid` (11.534 ô + `susceptibility`,`level`,`color`) | Heatmap nền |
| `GET /api/public/risk/live/geojson[?sim_rain_mm=&min_risk=]` | `/api/risk/live/grid` | Heatmap live |
| *(gọi thẳng AI khi dev)* | `/api/susceptibility/point?lat=&lon=` | Tap-to-query |
| *(gọi thẳng AI khi dev)* | `/api/risk/live?lat=&lon=[&sim_rain_mm=]` | Popup 1 điểm + công thức |
| *(gọi thẳng AI khi dev)* | `/api/risk/live/status` | Badge "live/stale" |
| lớp điểm lũ | `ai-service/data/flood_points_reference.geojson` (430 điểm) | Toggle lịch sử |

**Mobile (RN):** lớp `flood_susceptibility` đã thêm trong `mobile/src/screens/main/MapScreen.tsx` (toggle, mặc định TẮT) +
`mapService.getSusceptibility()/getRiskLive()`. Proxy Laravel: `SusceptibilityController` + `AIServiceClient::getSusceptibilityGrid/getRiskLiveGrid`.
⚠️ Cần build RN/PHP để kiểm thử runtime (AI service đã test HTTP đầy đủ).

---

## 7. HẠN CHẾ (chủ động nêu — ăn điểm minh bạch)
1. Presence-only pseudo-absence có bias (Q2).
2. Một sự kiện lũ lớn → khái quát không gian, không dự báo thời gian (Q3).
3. Phần lớn AUC đến từ hình học lấy mẫu; ML thêm +0.09 (Q4).
4. DEM 30m + thuỷ văn hand-digitized thô → độ phân giải giới hạn.
5. Realtime là rule minh bạch, không ML; snapshot live có thể cũ (có cờ `stale`).
