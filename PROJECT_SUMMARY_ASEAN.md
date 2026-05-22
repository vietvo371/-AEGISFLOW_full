# AegisFlow AI - Tóm tắt Dự án Chi tiết (ASEAN Digital Award)

## 1. TỔNG QUAN DỰ ÁN

**AegisFlow AI** là nền tảng AI hỗ trợ quản lý thiên tai lũ lụt đô thị, được thiết kế cho các thành phố Đông Nam Á, triển khai thí điểm tại Đà Nẵng, Việt Nam.

### Vấn đề cần giải quyết

1. **Khoảng trống cảnh báo sớm**: Cảnh báo lũ hiện tại đến quá muộn (thường <30 phút trước khi ngập) khiến người dân không kịp sơ tán
2. **Khoảng trống phối hợp**: Các đội cứu hộ thiếu tối ưu hóa điều phối theo thời gian thực, dẫn đến thời gian phản ứng chậm
3. **Khoảng trống thông tin**: Người dân thiếu thông tin ngập lụt thời gian thực và tuyến sơ tán an toàn

### Giải pháp

AegisFlow AI tích hợp dữ liệu cảm biến IoT, mô hình AI dự đoán, giao tiếp WebSocket thời gian thực, và giao diện di động/web để cung cấp quản lý thiên tai lũ lụt toàn diện — từ dự đoán sớm, qua phối hợp cứu hộ, đến phân tích sau sự kiện.

---

## 2. DANH SÁCH TÍNH NĂNG ĐẦY ĐỦ

### A. Dự đoán Ngập lụt bằng AI (AI-Powered Flood Prediction)

- Mô hình RandomForest Classifier được huấn luyện trên 3.000 mẫu dữ liệu lũ Đà Nẵng (2019-2024)
- 5 đặc trưng đầu vào: mực nước (water_level_m), lượng mưa (rainfall_mm), thời gian mưa (hours_rain), mức thủy triều (tide_level), điểm lịch sử (historical_score)
- 4 mức rủi ro: thấp, trung bình, cao, nghiêm trọng (low, medium, high, critical)
- Hiệu suất mô hình: Chính xác 98.8%, F1 trọng số 0.9886, AUC-ROC 0.9996
- Hệ số trọng số: Mực nước (40%), Lượng mưa (30%), Thời gian mưa (15%), Thủy triều (10%), Lịch sử (5%)
- Hệ thống dự phòng rule-based khi mô hình ML không khả dụng (thiết kế fail-safe)
- Tự động dự đoán mỗi 15 phút qua Laravel scheduled jobs

### B. Tính toán Ưu tiên Cứu hộ (Rescue Priority Calculation)

- Điểm ưu tiên đa yếu tố (0-100) để phân loại yêu cầu cứu hộ
- Các yếu tố: mức độ khẩn cấp (tối đa 30 điểm), nhóm dễ bị tổn thương — người già/khuyết tật/trẻ em/phụ nữ mang thai (tối đa 25 điểm), số người (tối đa 15 điểm), mức nước (tối đa 15 điểm), thời gian chờ (tối đa 10 điểm), sự cố liên quan (tối đa 5 điểm)
- Phân loại tự động: nghiêm trọng (>=80), cao (>=60), trung bình (>=40), thấp (<40)

### C. Tối ưu hóa Tuyến Sơ tán (Evacuation Route Optimization)

- Tính khoảng cách Haversine giữa các tọa độ
- Đánh giá an toàn tuyến đường dựa trên khoảng cách đến vùng ngập
- Tính toán đường vòng (tăng 30% độ dài tuyến cho mỗi vùng ngập giao nhau)
- Ước tính tốc độ đi bộ 4 km/h (điều kiện khẩn cấp)
- Định tuyến dựa trên đồ thị NetworkX (với bản đồ đồ thị tĩnh cho Đà Nẵng)

### D. Đánh giá Nơi Trú ẩn (Shelter Suitability Scoring)

- Đánh giá dựa trên khoảng cách (50 điểm tối đa — dưới 2km được điểm tối đa)
- Phân tích sức chứa (30 điểm — kiểm tra sức chứa còn lại vs. yêu cầu)
- Khớp cơ sở vật chất (20 điểm — khớp danh mục yêu cầu với tiện nghi cần thiết như sơ cứu, nhà bếp, nước sạch)

### E. Chatbot AI Hỗ trợ (AI Assistant Chatbot)

- Tích hợp Groq LLM (mô hình Llama 3.1 8B Instant)
- Cung cấp ngữ cảnh kiểu RAG với dữ liệu cảm biến và dự đoán thời gian thực
- 4 chế độ ngữ cảnh chuyên biệt: lũ lụt, cứu hộ, sơ tán, tổng quát
- System prompt chuyên biệt với kiến thức lũ Đà Nẵng (ngưỡng VNMHA, tọa độ quận, số khẩn cấp)
- Phản hồi dự phòng dựa trên từ khóa khi Groq API không khả dụng
- Song ngữ: Tiếng Việt và Tiếng Anh

### F. Bảng điều khiển Giám sát Thời gian thực (Real-Time Dashboard)

- Bản đồ tương tác (OpenMapVN/MapLibre GL) với nhiều lớp GeoJSON:
  - Đường/điểm ngập, trạm cảm biến (mưa, ngập 1.5m, ngập 3m, mực nước, hồ chứa)
  - Sự cố, nơi trú ẩn, đội cứu hộ, vùng ngập
- Panel dự báo: dữ liệu thời tiết trực tiếp, cảm biến mực nước, dự đoán rủi ro AI
- Panel điều phối cứu trợ: chọn tuyến sơ tán, theo dõi đội cứu hộ
- Phân tích: xu hướng sự cố (7 ngày), phân bố mức độ nghiêm trọng, biểu đồ mực nước
- Trung tâm thông báo với huy hiệu số chưa đọc
- Hỗ trợ giao diện sáng/tối

### G. Ứng dụng Di động Citizen (React Native Mobile App)

- 42 màn hình trong 13 lĩnh vực chức năng
- Màn hình chính: hành động nhanh (báo cáo ngập, SOS cứu hộ, tìm nơi trú ẩn, xem bản đồ), tóm tắt thời tiết, cảnh báo đang hoạt động
- Luồng xác thực đầy đủ: đăng nhập, đăng ký, xác minh OTP, quên/đặt lại mật khẩu, hướng dẫn sử dụng
- Màn hình bản đồ: xem cụm, heatmap, báo cáo overlay, tuyến sơ tán
- Gửi yêu cầu SOS/cứu hộ với lựa chọn nhóm dễ bị tổn thương
- Tìm nơi trú ẩn với thông tin sức chứa
- Chi tiết thời tiết, cảnh báo theo mức độ nghiêm trọng
- Tạo/chỉnh sửa báo cáo sự cố ngập
- Quản lý hồ sơ, cài đặt ngôn ngữ (Tiếng Việt/Tiếng Anh), trung tâm trợ giúp
- Push notification qua Firebase Cloud Messaging (FCM)
- Tích hợp Mapbox/OpenMapVN qua @rnmapbox/maps

### H. Trang Quản trị Dashboard (Web Admin)

- `/dashboard` — Trung tâm điều hành chính với bản đồ + các panel
- `/dashboard/incidents` — Quản lý sự cố
- `/dashboard/alerts` — Quản lý cảnh báo
- `/dashboard/flood-zones` — Quản lý vùng ngập
- `/dashboard/predictions` — Lịch sử dự đoán AI và xác minh
- `/dashboard/recommendations` — Khuyến nghị hành động do AI tạo
- `/dashboard/rescue-requests` — Quản lý và điều phối yêu cầu cứu hộ
- `/dashboard/rescue-teams` — Theo dõi đội cứu hộ
- `/dashboard/sensors` — Giám sát cảm biến
- `/dashboard/shelters` — Quản lý nơi trú ẩn
- `/dashboard/analytics` — Tổng quan phân tích
- `/dashboard/notifications` — Trung tâm thông báo
- `/dashboard/admin/users` — Quản lý người dùng (chỉ admin)

### I. Giao diện Điều phối Đội (Team Dispatch Interface)

- `/team/dispatch` — Điều phối đội cứu hộ
- `/team/requests` — Yêu cầu cứu hộ đến cho thành viên đội

### J. Hệ thống Tự động (Automated Systems)

- **FloodAutoDetector**: Xử lý đọc số cảm biến, kiểm tra ngưỡng nguy hiểm, tự động tạo sự cố khi phát hiện điều kiện nghiêm trọng
- **RecommendationGenerator**: Tự động tạo khuyến nghị hành động từ dự đoán — tuyến ưu tiên, lệnh sơ tán, cảnh báo, chuyển hướng giao thông dựa trên ngưỡng xác suất
- **Tác vụ Định kỳ**: Dự đoán AI mỗi 15 phút, lấy thời tiết mỗi 30 phút, kiểm tra sức khỏe cảm biến mỗi 10 phút, dọn dẹp dự đoán hết hạn hàng ngày, dọn cảnh báo hết hạn mỗi giờ

### K. Quản lý Chuỗi Cung ứng Cứu trợ (Supply Chain Management)

- Theo dõi kho cứu trợ (danh mục, số lượng, ngày hết hạn, vị trí lưu trữ)
- Quản lý tồn kho theo nơi trú ẩn/đội
- Quy trình phân bổ: chờ duyệt -> đã phát -> đã giao
- Cảnh báo mức tồn kho tối thiểu

---

## 3. KIẾN TRÚC VÀ THIẾT KẾ HỆ THỐNG

### Stack Công nghệ

| Thành phần | Công nghệ | Cổng | Ghi chú |
|-----------|-----------|------|---------|
| Backend API | Laravel (PHP 8.3+) với Sanctum auth | 8000 | API, WebSocket, Job Queue |
| Frontend Dashboard | Next.js (React 19) + TypeScript + next-intl | 3000 | Dashboard, Citizen/Admin/Team UI |
| AI Service | Python FastAPI + scikit-learn + NetworkX | 5005 | Flood prediction, route optimization |
| Mobile App | React Native + React Navigation + i18next | — | 42 screens, push notifications |
| Database | MySQL 8.0 (tương thích PostgreSQL/PostGIS) | 3306 | Lưu trữ dữ liệu chính |
| Cache/Queue | Redis Alpine | 6379 | Cache, session, queue |
| WebSocket | Laravel Reverb | 8080 | Giao tiếp thời gian thực |
| Bản đồ | OpenMapVN (MapLibre GL) + Mapbox (mobile) | — | Bản đồ Việt Nam |
| LLM | Groq API (Llama 3.1 8B) | — | Chatbot AI |
| Push Notifications | Firebase Cloud Messaging | — | Thông báo đẩy |
| Weather API | OpenWeatherMap | — | Dữ liệu thời tiết |
| UI Components | shadcn/ui + Tailwind CSS (web) | — | Giao diện hiện đại |

### Luồng Dữ liệu Kiến trúc

```
Cảm biến IoT → Backend API → FloodAutoDetector → Tự động tạo Sự cố
                    |
                    ↓
         CallAIPrediction Job (mỗi 15 phút)
                    |
                    ↓
         AI Service (FastAPI) — predict-risk
                    |
                    ↓
         Lưu Prediction vào DB
                    |
                    ↓
         RecommendationGenerator → Tự động tạo Khuyến nghị
                    |
                    ↓
         Event Broadcasting (Laravel Reverb WebSocket)
                    |
                    ├→ Frontend Dashboard (cập nhật thời gian thực)
                    ├→ Mobile App (push notification qua FCM)
                    └→ Citizen Web Interface
```

### Hệ thống Sự kiện Thời gian thực

- **Kênh**: `flood` (kênh công khai cho tất cả sự kiện liên quan đến lũ)
- **Các sự kiện phát sóng**: IncidentCreated, IncidentResolved, AlertCreated, AlertUpdated, AlertResolved, RescueRequestCreated, RescueRequestUpdated, PredictionReceived, SensorReadingReceived, FloodZoneUpdated
- **Frontend**: Laravel Echo + Pusher.js kết nối Reverb WebSocket
- **Mobile**: Laravel Echo tích hợp cập nhật thời gian thực
- **AlertCreated**: Lưu notification vào DB, gửi FCM push cho mức độ cao/nghiêm trọng

### Phân quyền Dựa trên Vai trò (Role-Based Access Control)

| Vai trò | Quyền hạn |
|---------|-----------|
| citizen | Xem cảnh báo, gửi yêu cầu cứu hộ, xem bản đồ, truy cập giao diện citizen |
| rescue_team / rescue_operator | Quản lý yêu cầu cứu hộ, cập nhật vị trí đội, kích hoạt dự đoán, nhập dữ liệu cảm biến |
| city_admin | Toàn quyền — quản lý người dùng, thống kê hệ thống, toàn bộ CRUD |

---

## 4. NĂNG LỰC AI/ML CHI TIẾT

### Mô hình Dự đoán Rủi ro Ngập lụt

- **Thuật toán**: RandomForest Classifier (scikit-learn)
- **Siêu tham số**: 200 cây quyết định, max_depth=15, min_samples_split=5, min_samples_leaf=2, class_weight='balanced'
- **Dữ liệu huấn luyện**: 3.000 mẫu từ `flood_danang_2019_2024.csv` (dữ liệu tổng hợp dựa trên ngưỡng vật lý VNMHA - Trung tâm Khí tượng Thủy văn Quốc gia Việt Nam)
- **Tầm quan trọng đặc trưng**: water_level_m (0.3634), rainfall_mm (0.3202), historical_score (0.1555), tide_level (0.0809), hours_rain (0.0800)
- **Hiệu suất**: Accuracy 98.83%, F1 weighted 0.9886, AUC-ROC 0.9996, Cross-validation 5-fold F1 mean 0.9886 ± 0.0038
- **Hiệu suất theo lớp**:
  - Critical: Precision=1.0, Recall=1.0
  - High: Precision=1.0, Recall=0.94
  - Low: Precision=1.0, Recall=0.99
  - Medium: Precision=0.88, Recall=1.0
- **Triển khai**: Tải lazy từ pickle file, đánh giá rủi ro có trọng số xác suất

### Chiến lược Dự đoán Kép (Dual Prediction Strategy)

1. **ML-first**: Mô hình RandomForest đã huấn luyện với điểm tin cậy dựa trên xác suất
2. **Rule-based fallback**: Đánh giá tuyến tính có trọng số khi mô hình không khả dụng — đảm bảo nền tảng KHÔNG BAO GIỜ thất bại trong việc đánh giá rủi ro

### Quy trình Tích hợp AI (Backend)

1. `CallAIPrediction` job thu thập đọc số cảm biến + dữ liệu thời tiết theo vùng ngập
2. Gửi đến FastAPI `/api/predict-risk` endpoint
3. Lưu prediction với thời gian xử lý, độ tin cậy, phân loại mức độ
4. `RecommendationGenerator` tự động tạo khuyến nghị hành động:
   - Xác suất >= 80% + mức nghiêm trọng/cao: kích hoạt tuyến ưu tiên + cảnh báo khẩn cấp + chuẩn bị sơ tán
   - Xác suất >= 60% + mức cao: chuyển hướng giao thông + thông báo cư dân
   - Xác suất >= 40%: cập nhật tuyến đường

### AI Chatbot (Groq/Llama)

- Phản hồi nhận biết ngữ cảnh sử dụng system prompt chuyên biệt
- Grounding dữ liệu thời gian thực từ cảm biến và dự đoán
- Quy tắc phản hồi khẩn cấp (đánh dấu nghiêm trọng bằng emoji, khuyến nghị 114/115 cho tình huống đe dọa tính mạng)
- Fallback khớp từ khóa khi API không khả dụng

---

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU

### 28 Models Cơ sở dữ liệu

Các bảng chính với quan hệ:

| Model | Mô tả | Quan hệ chính |
|-------|--------|--------------|
| users | Xác thực, vai trò (admin, citizen, team) | → districts, wards, devices (FCM tokens) |
| incidents | Sự kiện ngập lụt | → districts, wards, flood_zones, events, photos; hỗ trợ PostGIS geometry |
| rescue_requests | Yêu cầu cứu hộ từ citizen | → incidents, rescue_teams, districts; điểm ưu tiên |
| rescue_teams | Đội ứng cứu khẩn cấp | → members, districts; theo dõi vị trí thời gian thực |
| shelters | Nơi trú ẩn | → districts, wards; theo dõi sức chứa/tình trạng, danh sách tiện nghi |
| flood_zones | Vùng ngập đã lập bản đồ | → districts, sensors; giám sát mực nước, phân loại rủi ro |
| sensors | Nguồn dữ liệu IoT | → flood_zones, districts; ngưỡng cấu hình, phát hiện bất thường |
| sensor_readings | Đọc số cảm biến | → sensors; phân vùng thời gian theo tháng (PostgreSQL) |
| predictions | Kết quả mô hình AI | → ai_models, flood_zones, incidents, prediction_details |
| alerts | Cảnh báo thời gian thực | → predictions, incidents; quận/phường/vùng bị ảnh hưởng (JSON), PostGIS geometry |
| evacuation_routes | Tuyến sơ tán | → map_nodes (điểm đầu/cuối), flood_zones, shelters, segments |
| map_nodes/map_edges | Mạng đồ thị cho định tuyến | Edges có mật độ, tốc độ, cờ flood_prone |
| relief_supplies | Hàng cứu trợ | → supply_stocks → supply_allocations (chuỗi logistics) |
| weather_data | Dữ liệu thời tiết | → districts; nhiệt độ, độ ẩm, gió, lượng mưa, áp suất, UV |
| notifications | Thông báo | → alerts; theo dõi gửi/nhận/đọc đa kênh |
| ai_models | Mô hình AI | → datasets; versioning, performance metrics, cờ active/production |

### Tính năng Không gian (Spatial)

- Hỗ trợ PostGIS: Cột geometry có điều kiện khi phát hiện PostgreSQL
- Chỉ mục không gian qua PostGIS (GIST indexes trên cột geometry)
- Sensor readings: Phân vùng thời gian theo tháng trên PostgreSQL cho hiệu suất

---

## 6. API ENDPOINTS CHÍNH

### Xác thực (Authentication)
- `POST /api/auth/login` — Đăng nhập
- `POST /api/auth/register` — Đăng ký
- `POST /api/auth/logout` — Đăng xuất
- `POST /api/auth/forgot-password` — Quên mật khẩu
- `POST /api/auth/reset-password` — Đặt lại mật khẩu

### Tài nguyên Chính
- `GET/POST /api/incidents` — Quản lý sự cố
- `GET/POST /api/alerts` — Quản lý cảnh báo
- `GET /api/alerts/geojson` — GeoJSON cho bản đồ
- `GET /api/flood-zones/geojson` — Vùng ngập GeoJSON
- `GET/POST /api/rescue-requests` — Yêu cầu cứu hộ
- `GET/POST /api/predictions` — Dự đoán AI
- `POST /api/predictions/run` — Kích hoạt dự đoán AI
- `GET/POST /api/sensors` — Quản lý cảm biến
- `POST /api/sensors/{id}/readings` — Nhập đọc số cảm biến
- `GET/POST /api/shelters` — Quản lý nơi trú ẩn
- `GET /api/rescue-teams` — Quản lý đội cứu hộ
- `GET/POST /api/recommendations` — Khuyến nghị AI
- `GET /api/weather` — Dữ liệu thời tiết
- `POST /api/chatbot/message` — AI Chatbot

### API Công khai (Không cần xác thực)
- `GET /api/public/incidents` — Sự cố công khai
- `GET /api/public/alerts/geojson` — Cảnh báo GeoJSON
- `GET /api/public/flood-zones/geojson` — Vùng ngập GeoJSON

### Push Notifications
- `POST /api/devices/register` — Đăng ký thiết bị FCM
- `DELETE /api/devices/{token}` — Hủy đăng ký
- `POST /api/notifications/dispatch` — Gửi notification (admin)

---

## 7. ĐỔI MỚI VÀ LỢI THẾ CẠNH TRANH

1. **Chiến lược AI Kép**: Mô hình ML với fallback rule-based đảm bảo khả năng dự đoán không gián đoạn (zero-downtime)
2. **Nền tảng End-to-End**: Một hệ thống duy nhất bao phủ dự đoán → cảnh báo → điều phối → sơ tán → quản lý cứu trợ (đối thủ thường chỉ giải quyết 1-2 trong số này)
3. **Kiến trúc Thời gian thực**: Truyền sự kiện dưới 1 giây từ đọc số cảm biến đến thông báo người dùng qua WebSocket + FCM
4. **Đa Nền tảng**: Dashboard web (admin/operator), giao diện web citizen, ứng dụng di động native — tất cả chia sẻ cùng pipeline dữ liệu thời gian thực
5. **AI Chatbot Chuyên biệt Domain**: Trợ lý được cấp nguồn Groq với kiến thức lũ Đà Nẵng, giao thức phản hồi khẩn cấp, và grounding dữ liệu thời gian thực
6. **Phát hiện Sự cố Tự động**: FloodAutoDetector tạo sự cố tự động từ bất thường cảm biến — không cần can thiệp con người cho phát hiện ban đầu
7. **Khuyến nghị AI Tự động**: RecommendationGenerator tạo khuyến nghị hành động có phân tầng (sơ tán, chuyển hướng, cảnh báo) dựa trên mức độ nghiêm trọng
8. **Hỗ trợ Dữ liệu Không gian**: Schema sẵn sàng PostGIS cho lập bản đồ polygon vùng ngập chính xác, vị trí cảm biến, và geometries tuyến đường
9. **Định tuyến Dựa trên Đồ thị**: Tích hợp NetworkX cho tối ưu tuyến sơ tán xem xét đoạn đường ngập
10. **Ưu tiên Nhóm Dễ bị tổn thương**: Thuật toán cứu hộ ưu tiên rõ ràng người già, khuyết tật, trẻ em, và phụ nữ mang thai

---

## 8. ĐỐI TƯỢNG NGƯỜI DÙNG VÀ TRƯỜNG HỢP SỬ DỤNG

| Vai trò | Giao diện | Trường hợp Sử dụng Chính |
|---------|-----------|--------------------------|
| Quản trị viên Thành phố | Web Dashboard | Giám sát vùng ngập, quản lý cảnh báo, xem phân tích, phê duyệt khuyến nghị AI, quản lý người dùng |
| Nhân viên Điều phối Cứu hộ | Web Dashboard | Điều phối đội cứu hộ, quản lý yêu cầu cứu hộ, kích hoạt dự đoán AI, nhập dữ liệu cảm biến |
| Thành viên Đội Cứu hộ | Web (Team UI) + Mobile | Nhận phân công, cập nhật vị trí, xem tuyến ưu tiên, báo cáo trạng thái nhiệm vụ |
| Người dân (Citizen) | Mobile App + Citizen Web | Nhận cảnh báo lũ, gửi yêu cầu cứu hộ (SOS), tìm nơi trú ẩn, xem tuyến sơ tán, báo cáo sự cố ngập, kiểm tra thời tiết |

---

## 9. TÁC ĐỘNG XÃ HỘI

- **An toàn Tính mạng**: Cảnh báo sớm bằng AI cho người dân và chính quyền nhiều thời gian hơn để chuẩn bị và sơ tán (dự đoán mỗi 15 phút với tầm nhìn cấu hình: 15 phút đến 24 giờ)
- **Phản ứng Công bằng**: Thuật toán ưu tiên đảm bảo nhóm dễ bị tổn thương (người già, khuyết tật, trẻ em, phụ nữ mang thai) được cứu hộ trước
- **Tham gia Cộng đồng**: Người dân có thể báo cáo sự cố ngập, gửi yêu cầu cứu hộ, và đánh giá chất lượng dịch vụ cứu hộ
- **Tối ưu Tài nguyên**: Theo dõi phân bổ vật tư ngăn lãng phí và đảm bảo nơi trú ẩn có đủ tài nguyên cần thiết
- **Khả năng Mở rộng ASEAN**: Kiến trúc thiết kế cho Đà Nẵng nhưng áp dụng được cho các thành phố dễ bị lũ trên toàn Đông Nam Á (tọa độ quận cấu hình được, hỗ trợ đa ngôn ngữ)
- **Tích hợp Dữ liệu Mở**: Tích hợp OpenWeatherMap API; định dạng GeoJSON tiêu chuẩn cho tương tác liên hệ thống
- **Minh bạch**: Dự đoán AI bao gồm điểm tin cậy và yếu tố đóng góp; hệ thống tuân theo nguyên tắc "AI tư vấn, con người quyết định"

---

## 10. TRIỂN KHAI VÀ HẠ TẦNG

### Docker Compose
- 5 dịch vụ: mysql (8.0), redis (alpine), backend (Laravel), frontend (Next.js), ai-service (FastAPI)
- Mạng bridge đơn (`aegisflow_network`)
- Volume mounts cho hot-reload phát triển

### Tác vụ Định kỳ
- Laravel scheduler quản lý 5 tác vụ lặp lại
- Queue worker xử lý background jobs (dự đoán AI, push notifications, lấy thời tiết)
- Redis cho queue, cache, và session storage

### Khả năng Mở rộng
- Kiến trúc microservice (Backend + AI Service tách biệt)
- Queue-based async processing cho tải nặng
- Redis caching giảm tải database
- WebSocket cho giao tiếp thời gian thực thay vì polling

---

## 11. DỮ LIỆU KỸ THUẬT BỔ SUNG

### Cấu hình Mô hình AI Chi tiết

```python
# RandomForest Classifier
n_estimators = 200
max_depth = 15
min_samples_split = 5
min_samples_leaf = 2
class_weight = 'balanced'
random_state = 42

# Feature Importance
water_level_m:    0.3634
rainfall_mm:      0.3202
historical_score: 0.1555
tide_level:       0.0809
hours_rain:       0.0800

# Risk Classification Thresholds
Critical: risk_score >= 75 OR probability >= 0.8
High:     risk_score >= 50 OR probability >= 0.6
Medium:   risk_score >= 25 OR probability >= 0.4
Low:      risk_score < 25
```

### Ngưỡng Cảm biến (Sensor Thresholds)

```
Mực nước nguy hiểm: >= 1.5m (tạo cảnh báo)
Mực nước nghiêm trọng: >= 3.0m (tạo sự cố tự động)
Lượng mưa cảnh báo: >= 50mm/h
Lượng mưa nghiêm trọng: >= 100mm/h
```

### Kênh WebSocket

- `user.{userId}.notifications` — Thông báo cá nhân
- `team.{teamId}.dispatch` — Lệnh điều phối đội
- `incident.{incidentId}` — Cập nhật sự cố (công khai)
- `alert.{alertId}` — Phát sóng cảnh báo
- `flood` — Kênh chung cho tất cả sự kiện lũ

### Cấu trúc Monorepo

```
/backend          - Laravel API (Core, DB, Events, Services, Jobs)
/frontend         - Next.js Dashboard (Web UI, Maps, Charts)
/ai-service       - FastAPI (ML models, algorithms)
/mobile           - React Native (42 screens, push notifications)
/scripts          - Utility scripts
/docker-compose.yml - Orchestration
```

---

## 12. TÓM TẮT CHO TRÌNH BÀY

### Một câu mô tả:
> AegisFlow AI là nền tảng AI toàn diện giúp chính quyền đô thị Đông Nam Á dự báo ngập lụt sớm, điều phối cứu hộ thông minh, và hướng dẫn sơ tán an toàn cho người dân — tất cả trong thời gian thực.

### Số liệu nổi bật:
- Độ chính xác dự đoán: **98.8%**
- Dự đoán tự động: **mỗi 15 phút**
- Số lượng màn hình mobile: **42 screens**
- Số models cơ sở dữ liệu: **28 models**
- Hỗ trợ ngôn ngữ: **Tiếng Việt + Tiếng Anh**
- Số vai trò người dùng: **4 vai trò** (Admin, Operator, Team, Citizen)
- Kiến trúc: **5 microservices** (Backend + Frontend + AI + Mobile + WebSocket)
- Thời gian truyền sự kiện: **< 1 giây** (WebSocket)
- Thuật toán AI: RandomForest + NetworkX routing + Priority scoring + Shelter matching

### Vấn đề → Giải pháp → Tác động:
1. **Cảnh báo muộn** → Dự đoán AI 15 phút/lần → **Thêm thời gian sơ tán cho người dân**
2. **Điều phối kém** → Ưu tiên tự động + định tuyến thông minh → **Cứu người dễ bị tổn thương trước**
3. **Thiếu thông tin** → App mobile + bản đồ realtime → **Người dân tự chủ trong sơ tán**
