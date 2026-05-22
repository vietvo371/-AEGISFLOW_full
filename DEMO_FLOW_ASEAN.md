# AegisFlow AI — Flow Test Kịch Bản Demo Thi ASEAN

Tài liệu này dùng để chạy thử và trình bày demo AegisFlow AI theo flow end-to-end: **AI dự báo ngập → cảnh báo realtime → người dân gửi SOS → điều phối cứu hộ → cập nhật trạng thái**.

---

## 1. Chuẩn bị trước khi demo

### 1.1. Chạy các service

Ở thư mục gốc dự án:

```bash
./run_all.sh backend
./run_all.sh frontend
./run_all.sh reverb
./run_all.sh ai
```

Hoặc chạy riêng từng service:

```bash
# Backend Laravel
cd backend
php artisan serve --port=8000

# WebSocket Laravel Reverb
cd backend
php artisan reverb:start --port=8080

# Queue worker
cd backend
php artisan queue:work --tries=3 --sleep=1

# Frontend Next.js
cd frontend
yarn dev

# AI service FastAPI
cd ai-service
python main.py
```

### 1.2. Seed dữ liệu mẫu nếu cần

```bash
cd backend
php artisan migrate:fresh --seed
```

### 1.3. Tài khoản demo

| Vai trò | Email | Password | Dùng để demo |
|---|---|---|---|
| Admin | `admin@aegisflow.ai` | `password` | Dashboard điều hành |
| Operator | `operator@aegisflow.ai` | `password` | Điều phối/cảnh báo |
| Rescue Team | `rescue@aegisflow.ai` | `password` | Đội cứu hộ |
| Citizen | `citizen@example.com` | `password` | Người dân |

### 1.4. URL chính

| Thành phần | URL |
|---|---|
| Frontend Web | `http://localhost:3000` |
| Backend API | `http://localhost:8000/api` |
| AI Service | `http://localhost:5005` |
| Reverb WebSocket | `ws://localhost:8080` |

---

## 2. Kịch bản demo chính

Tên kịch bản đề xuất:

> **Phát hiện nguy cơ ngập, cảnh báo người dân và điều phối cứu hộ theo thời gian thực**

Thông điệp chính:

> AegisFlow AI giúp đô thị Đông Nam Á dự báo ngập sớm, phát cảnh báo realtime, tiếp nhận SOS từ người dân và điều phối đội cứu hộ trên bản đồ.

---

## 3. Flow demo đầy đủ

## Màn 1 — Giới thiệu landing page

Mở:

```text
http://localhost:3000
```

Nói khi demo:

> AegisFlow AI là nền tảng AI hỗ trợ chính quyền đô thị và cộng đồng dự báo ngập lụt sớm, đề xuất tuyến sơ tán an toàn và tối ưu phân bổ cứu trợ theo thời gian thực. Dự án hướng đến các đô thị Đông Nam Á, đặc biệt là Đà Nẵng.

Điểm cần show:

- Landing page.
- Vấn đề ngập đô thị.
- Các tính năng: AI prediction, realtime alert, evacuation, rescue dispatch.

---

## Màn 2 — Admin đăng nhập dashboard điều hành

Mở:

```text
http://localhost:3000/signin
```

Đăng nhập:

```text
Email: admin@aegisflow.ai
Password: password
```

Vào:

```text
/dashboard
```

Nói khi demo:

> Đây là trung tâm điều hành của chính quyền. Dashboard tổng hợp dữ liệu về sự cố ngập, cảnh báo, cảm biến, đội cứu hộ, nơi trú ẩn và dự báo AI.

Các trang nên mở:

```text
/dashboard
/dashboard/analytics
/dashboard/incidents
/dashboard/alerts
/dashboard/predictions
/dashboard/rescue-requests
/dashboard/rescue-teams
/dashboard/sensors
/dashboard/shelters
/dashboard/flood-zones
```

Điểm cần show:

- Tổng quan số lượng sự cố.
- Cảnh báo đang hoạt động.
- Cảm biến mực nước/thời tiết.
- Dự báo AI.
- Yêu cầu cứu hộ.
- Đội cứu hộ và nơi trú ẩn.

---

## Màn 3 — AI dự báo nguy cơ ngập

Mở:

```text
/dashboard/predictions
```

Nói khi demo:

> AI sử dụng dữ liệu mưa, mực nước, độ ẩm, vị trí và dữ liệu lịch sử để đánh giá nguy cơ ngập. Kết quả giúp operator ra quyết định phát cảnh báo sớm trước khi tình huống trở nên nghiêm trọng.

Backend route liên quan:

```text
GET  /api/predictions
GET  /api/predictions/{id}
PUT  /api/predictions/{id}/verify
POST /api/predictions/trigger
```

AI service endpoint:

```text
POST /api/predict-risk
POST /api/calculate-priority
POST /api/score-shelter
POST /api/optimize-route
GET  /api/optimize-evacuation
```

Test nhanh AI service:

```bash
curl -X POST http://localhost:5005/api/predict-risk \
  -H "Content-Type: application/json" \
  -d '{
    "rainfall_mm": 120,
    "water_level_m": 2.8,
    "hours_rain": 2
  }'
```

Kết quả mong đợi:

- Có điểm rủi ro.
- Có mức độ nguy cơ.
- Có dữ liệu dùng để hiển thị trên dashboard.

---

## Màn 4 — Operator tạo sự cố ngập

Mở:

```text
/dashboard/incidents
```

Tạo incident mẫu:

```text
Title: Ngập sâu tại đường Nguyễn Văn Linh
Severity: high hoặc critical
Latitude: 16.0544
Longitude: 108.2022
Description: Mưa lớn gây ngập 60cm, giao thông ùn tắc.
```

Nói khi demo:

> Khi operator ghi nhận sự cố ngập, hệ thống lưu sự kiện vào backend và broadcast realtime qua Laravel Reverb để các màn hình khác cập nhật ngay lập tức.

Backend route liên quan:

```text
GET    /api/incidents
POST   /api/incidents
GET    /api/incidents/{id}
PUT    /api/incidents/{id}
DELETE /api/incidents/{id}
```

Realtime event:

```text
IncidentCreated
```

Điểm cần kiểm tra:

- Incident mới xuất hiện trong dashboard.
- Bản đồ cập nhật điểm sự cố.
- Citizen map có thể thấy sự cố nếu map data reload/realtime hoạt động.

---

## Màn 5 — Operator phát cảnh báo khẩn cấp

Mở:

```text
/dashboard/alerts
```

Tạo alert mẫu:

```text
Title: Cảnh báo ngập khẩn cấp khu vực Hải Châu
Severity: critical
Type: flood
Status: active
Message: Mực nước tăng nhanh, người dân cần tránh di chuyển qua khu vực trũng thấp.
Target audience: citizens
```

Nói khi demo:

> Sau khi xác nhận nguy cơ, operator phát cảnh báo đến người dân. Cảnh báo được gửi realtime để người dân nhận thông tin sớm và chủ động di chuyển đến nơi an toàn.

Backend route liên quan:

```text
GET    /api/alerts
POST   /api/alerts
GET    /api/alerts/{id}
PUT    /api/alerts/{id}
PUT    /api/alerts/{id}/status
GET    /api/public/alerts/geojson
```

Realtime events:

```text
AlertCreated
AlertUpdated
AlertResolved
```

Điểm cần kiểm tra:

- Alert active hiển thị trong dashboard.
- Citizen thấy alert trong `/citizen/alerts`.
- Có toast/banner nếu realtime listener hoạt động.

---

## Màn 6 — Citizen nhận cảnh báo và xem bản đồ

Mở tab/browser khác:

```text
http://localhost:3000/signin
```

Đăng nhập citizen:

```text
Email: citizen@example.com
Password: password
```

Vào:

```text
/citizen
/citizen/alerts
/citizen/map
/citizen/shelters
/citizen/weather
```

Nói khi demo:

> Ở phía người dân, hệ thống hiển thị cảnh báo đang hoạt động, bản đồ vùng ngập, nơi trú ẩn gần nhất và thông tin thời tiết. Người dân không cần hiểu dữ liệu kỹ thuật mà chỉ cần biết khu vực nào nguy hiểm và nên đi đâu.

Điểm cần show:

- Cảnh báo active.
- Bản đồ sự cố/vùng ngập.
- Danh sách shelters.
- Weather/current condition.
- Nút SOS/yêu cầu cứu hộ.

API citizen thường dùng:

```text
GET /api/alerts
GET /api/sensors
GET /api/weather/current
GET /api/predictions
GET /api/shelters
GET /api/map/all
```

---

## Màn 7 — Citizen gửi SOS/yêu cầu cứu hộ

Mở:

```text
/citizen/sos
```

Hoặc:

```text
/citizen/request
```

Tạo request mẫu:

```text
Location: Hải Châu, Đà Nẵng
People count: 3
Urgency: critical
Latitude: 16.0678
Longitude: 108.2208
Description: Gia đình có người già, nước đang dâng nhanh.
```

Nói khi demo:

> Khi người dân gặp nguy hiểm, họ có thể gửi SOS với vị trí, số người cần hỗ trợ, mức độ khẩn cấp và mô tả tình trạng. Hệ thống dùng thông tin này để ưu tiên xử lý các trường hợp nguy hiểm nhất.

Backend route liên quan:

```text
GET  /api/rescue-requests
POST /api/rescue-requests
GET  /api/rescue-requests/{id}
PUT  /api/rescue-requests/{id}/assign
PUT  /api/rescue-requests/{id}/status
POST /api/rescue-requests/{id}/rate
```

Realtime events:

```text
RescueRequestCreated
RescueRequestUpdated
```

Điểm cần kiểm tra:

- Citizen thấy request của mình trong danh sách.
- Dashboard admin thấy request mới.
- Team dashboard thấy request pending/assigned.

---

## Màn 8 — Admin hoặc rescue team điều phối cứu hộ

Admin/operator mở:

```text
/dashboard/rescue-requests
/dashboard/rescue-teams
```

Rescue team đăng nhập:

```text
Email: rescue@aegisflow.ai
Password: password
```

Mở:

```text
/team
/team/map
```

Nói khi demo:

> Trung tâm điều hành có thể xem yêu cầu cứu hộ mới, phân công đội phù hợp và cập nhật trạng thái xử lý. Đội cứu hộ nhìn thấy nhiệm vụ trên giao diện riêng và có thể theo dõi vị trí trên bản đồ.

Flow thao tác:

1. Xem request mới.
2. Assign đội cứu hộ.
3. Cập nhật trạng thái:
   - `pending`
   - `assigned`
   - `responding`
   - `completed`
4. Citizen/admin/team cùng thấy trạng thái mới.

Backend route liên quan:

```text
GET /api/rescue-teams
GET /api/rescue-teams/{id}
PUT /api/rescue-teams/{id}/location
PUT /api/rescue-requests/{id}/assign
PUT /api/rescue-requests/{id}/status
```

Điểm cần show:

- Request chuyển trạng thái.
- Team được phân công.
- Dashboard cập nhật số liệu.
- Realtime event cập nhật UI nếu WebSocket hoạt động.

---

## Màn 9 — Bản đồ ngập, shelters và tuyến sơ tán

Mở các trang:

```text
/citizen/map
/citizen/shelters
/team/map
/dashboard/flood-zones
/dashboard/shelters
```

Nói khi demo:

> Bản đồ là lớp trực quan hóa trung tâm của AegisFlow AI. Người dân thấy vùng nguy hiểm và nơi trú ẩn, đội cứu hộ thấy vị trí nhiệm vụ, còn chính quyền thấy toàn cảnh vận hành đô thị trong thời gian thực.

API map liên quan:

```text
GET /api/map/all
GET /api/map/incidents
GET /api/map/flood-zones
GET /api/map/rescue-teams
GET /api/map/shelters
GET /api/map/flood-reports
GET /api/map/sensor-stations
GET /api/map/flood-events
GET /api/evacuation-routes
```

AI route optimization:

```text
POST /api/optimize-route
GET  /api/optimize-evacuation
```

---

## 4. Flow demo rút gọn 5 phút

Nếu ban giám khảo chỉ cho ít thời gian, dùng flow này:

1. Mở landing page `/` và giới thiệu bài toán.
2. Đăng nhập admin vào `/dashboard`.
3. Mở `/dashboard/predictions` để show AI prediction.
4. Mở `/dashboard/alerts` và tạo cảnh báo critical.
5. Chuyển sang citizen `/citizen/alerts`, show cảnh báo vừa tạo.
6. Vào `/citizen/sos`, gửi SOS.
7. Chuyển sang `/dashboard/rescue-requests` hoặc `/team`, show request mới.
8. Assign/cập nhật trạng thái cứu hộ.
9. Kết luận vòng khép kín.

Câu kết:

> Demo thể hiện vòng khép kín: dữ liệu môi trường → AI dự báo → cảnh báo realtime → người dân phản hồi → điều phối cứu hộ → cập nhật trạng thái. Đây là mô hình phù hợp cho các đô thị ngập lụt ở Đông Nam Á.

---

## 5. Checklist test trước ngày thi

### 5.1. Backend

```bash
cd backend
php artisan route:list
php artisan test
php artisan queue:work
php artisan reverb:start --port=8080
```

Cần pass:

- Login OK.
- API token OK.
- Tạo incident OK.
- Tạo alert OK.
- Tạo rescue request OK.
- Update rescue request status OK.
- Broadcast không lỗi.

### 5.2. Frontend

```bash
cd frontend
yarn lint
yarn build
yarn dev
```

Cần mở được:

```text
/signin
/dashboard
/dashboard/incidents
/dashboard/alerts
/dashboard/predictions
/dashboard/rescue-requests
/citizen
/citizen/alerts
/citizen/sos
/team
/team/map
```

### 5.3. AI service

```bash
cd ai-service
python main.py
```

Test health:

```bash
curl http://localhost:5005/
```

Test prediction:

```bash
curl -X POST http://localhost:5005/api/predict-risk \
  -H "Content-Type: application/json" \
  -d '{"rainfall_mm":120,"water_level_m":2.8,"humidity":90}'
```

### 5.4. Realtime

Mở:

```text
/test-realtime
```

Sau đó tạo alert/incident/rescue request ở tab khác.

Kỳ vọng:

- Nhận event realtime.
- UI tự refresh hoặc hiện toast/banner.
- Không cần reload thủ công trong demo chính.

---

## 6. Lưu ý quan trọng trước demo

### 6.1. Kiểm tra method assign/resolve rescue request

Backend hiện có route:

```text
PUT /api/rescue-requests/{id}/assign
PUT /api/rescue-requests/{id}/status
```

Nếu UI ở dashboard gọi nhầm `POST /rescue-requests/{id}/assign` hoặc `POST /resolve`, nút assign/resolve có thể lỗi. Khi đó có 2 cách xử lý:

1. Sửa frontend dùng đúng `PUT`.
2. Demo update trạng thái bằng Postman/curl nếu chưa kịp sửa.

### 6.2. Chuẩn bị dữ liệu demo trước

Nên có sẵn:

- Ít nhất 2 flood zones.
- Ít nhất 2 shelters.
- Ít nhất 2 rescue teams có location.
- Một vài sensors.
- Một vài incidents/alerts mẫu.
- Một rescue request pending để phòng khi tạo mới lỗi mạng.

### 6.3. Chuẩn bị nhiều tab trình duyệt

Khuyến nghị mở sẵn:

| Tab | Vai trò | URL |
|---|---|---|
| Tab 1 | Admin | `/dashboard` |
| Tab 2 | Admin | `/dashboard/alerts` |
| Tab 3 | Citizen | `/citizen/alerts` |
| Tab 4 | Citizen | `/citizen/sos` |
| Tab 5 | Rescue Team | `/team` |
| Tab 6 | Realtime test | `/test-realtime` |

---

## 7. Script thuyết trình ngắn

Có thể nói theo đoạn này:

> AegisFlow AI giải quyết bài toán ngập đô thị tại Đông Nam Á bằng cách kết hợp dữ liệu cảm biến, thời tiết, bản đồ và AI. Ở trung tâm điều hành, chính quyền theo dõi toàn cảnh sự cố, cảnh báo và đội cứu hộ. Khi AI phát hiện nguy cơ ngập cao, operator có thể phát cảnh báo realtime đến người dân. Người dân nhận cảnh báo, xem vùng nguy hiểm, tìm nơi trú ẩn và gửi SOS nếu cần hỗ trợ. Yêu cầu cứu hộ lập tức xuất hiện ở dashboard và giao diện đội cứu hộ để phân công xử lý. Toàn bộ vòng đời từ dự báo, cảnh báo, phản hồi đến cứu hộ được cập nhật theo thời gian thực.

---

## 8. Thứ tự thao tác khuyến nghị khi luyện demo

1. Start backend, frontend, reverb, queue, AI service.
2. Login admin.
3. Login citizen ở tab khác.
4. Login rescue team ở tab khác.
5. Mở `/test-realtime`.
6. Tạo incident.
7. Tạo alert.
8. Kiểm tra citizen nhận alert.
9. Citizen gửi SOS.
10. Admin/rescue team thấy request.
11. Assign/update status.
12. Kết luận bằng map + dashboard analytics.
