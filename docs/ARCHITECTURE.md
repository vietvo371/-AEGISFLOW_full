# AegisFlow AI — Kiến trúc Hệ thống (System Architecture)

> Tài liệu kiến trúc chi tiết, dựng từ việc đọc trực tiếp mã nguồn (`backend/`, `frontend/`, `ai-service/`, `mobile/`) và cấu hình triển khai (`docker-compose.yml`, `routes/`).
> Cập nhật: 24/06/2026.

---

## 1. Tổng quan

**AegisFlow AI** là nền tảng AI hỗ trợ chính quyền đô thị và cộng đồng:

- **Dự báo ngập lụt sớm** dựa trên dữ liệu cảm biến + thời tiết + mô hình ML.
- **Đề xuất tuyến sơ tán an toàn** (tránh vùng ngập, tối ưu thời gian).
- **Tối ưu phân bổ cứu trợ** theo thời gian thực (ưu tiên nhóm dễ tổn thương, phân tuyến đội cứu hộ).

Mục tiêu chính: các đô thị Đông Nam Á, trọng tâm là **Đà Nẵng**.

Hệ thống được tổ chức theo mô hình **monorepo, microservice-capable**: tách bạch Web, Backend API, AI Service và Mobile, giao tiếp qua HTTP/REST và WebSocket.

### Bốn nhóm người dùng

| Vai trò | Giao diện | Chức năng chính |
|---------|-----------|-----------------|
| 🧍 Người dân (Citizen) | Web + Mobile | Nhận cảnh báo, xem bản đồ ngập, báo cáo sự cố, SOS, tìm tuyến sơ tán & nơi trú ẩn |
| 🏛️ Vận hành đô thị (City operator/admin) | Web dashboard | Giám sát cảm biến, duyệt dự báo/đề xuất AI, điều phối cứu hộ, quản lý dữ liệu |
| 🚑 Đội cứu hộ (Rescue team) | Web + Mobile | Nhận nhiệm vụ, xem bản đồ tình huống, định tuyến, cập nhật trạng thái |
| 🌐 Công chúng (Public) | Web | Trang công khai: bản đồ vùng ngập (GeoJSON), dòng thời gian sự cố, thông tin minh bạch |

---

## 2. Tech Stack

| Thành phần | Công nghệ | Cổng | Ghi chú |
|------------|-----------|------|---------|
| Backend | Laravel 13 (PHP 8.3+) | 8000 | REST API, Job Queue, Event Broadcasting |
| Frontend | Next.js 16 (React 19) + TypeScript | 3000 | Dashboard, Citizen/Admin/Team UI |
| AI Service | Python FastAPI | **5005** | Dự báo ngập, định tuyến, tính ưu tiên (`main.py` chạy uvicorn port 5005) |
| Database | MySQL 8.0 | 3306 | Lưu trữ chính, dữ liệu địa lý (geospatial) |
| Cache / Session / Queue | Redis (Alpine) | 6379 | Cache, session, hàng đợi job |
| WebSocket | Laravel Reverb | 8080 | Giao tiếp realtime (broadcast) |

> ⚠️ **Lưu ý cổng AI Service:** mã nguồn `ai-service/main.py` và `CLAUDE.md` dùng cổng **5005**, nhưng `docker-compose.yml` ánh xạ AI service ra **8080**. Khi chạy bằng Docker cần thống nhất lại (đề xuất sửa compose về 5005 để tránh đụng cổng với Reverb 8080).

---

## 3. Cấu trúc Monorepo

```
/
├─ backend/        — Laravel API (Models, Controllers, Services, Events, Jobs)
├─ frontend/       — Next.js Dashboard (App Router, Maps, Charts, Realtime)
├─ ai-service/     — FastAPI (mô hình ML, thuật toán dự báo & tối ưu)
├─ mobile/         — React Native (app người dân + đội cứu hộ)
├─ scripts/        — Tiện ích, automation
├─ docs/           — Tài liệu (file này)
└─ docker-compose.yml — Điều phối toàn bộ service trên mạng bridge dùng chung
```

---

## 4. Sơ đồ kiến trúc tổng thể

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │  Web Frontend         │  │  Mobile App          │  │  Người dùng      │   │
│  │  Next.js 16 / React19 │  │  React Native 0.81   │  │  Citizen/Admin/  │   │
│  │  Public · Citizen ·   │  │  iOS + Android       │  │  Team · Public   │   │
│  │  Admin · Team         │  │  SOS · FCM push      │  │                  │   │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────────────────┘   │
└─────────────┼───────────────────── ───┼─────────────────────────────────────┘
          REST│/HTTPS              REST  │ + WebSocket (Laravel Echo / Pusher.js)
              ▼                          ▼
┌──────────────────────────────────────────┐     ┌─────────────────────────────┐
│        APPLICATION / BACKEND LAYER         │     │        AI / ML LAYER         │
│  Laravel 13 · PHP 8.3 · :8000              │◄───►│  FastAPI · Python · :5005    │
│  • 61+ REST endpoints · Sanctum auth       │ HTTP│  • RandomForest (F1=0.9886)  │
│  • 29 Eloquent models · 22 enums           │     │  • LSTM forecaster           │
│  • Core services (Detector/Recommender)    │     │  • Graph predictor + BFS     │
│  • 11 broadcast events · 3 queue jobs       │     │  • Route optimizer · Priority│
└───┬───────────┬───────────────┬────────────┘     └──────────────┬──────────────┘
    │ Eloquent  │ cache/queue   │ broadcast                       │ training data
    ▼           ▼               ▼                                 ▼
┌─────────┐ ┌─────────┐ ┌──────────────────┐         ┌───────────────────────────┐
│ MySQL   │ │ Redis   │ │ Laravel Reverb   │         │  EXTERNAL SERVICES          │
│ 8.0     │ │ cache · │ │ WebSocket :8080  │────────►│  IoT sensors · OpenWeather  │
│ :3306   │ │ queue · │ │ broadcast → client│  live  │  Firebase FCM · Mapbox      │
│         │ │ session │ │ updates           │ updates│  VNMHA/Đà Nẵng data         │
└─────────┘ └─────────┘ └──────────────────┘         └───────────────────────────┘
```

*(Phiên bản hình ảnh: `AegisFlow_Architecture.png`)*

---

## 5. Client Layer

### 5.1 Web Frontend (`frontend/`)

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind, đa ngôn ngữ qua `next-intl` (Vi/En).

**Các nhóm route (`frontend/src/app/`):**

| Nhóm | Route | Đối tượng |
|------|-------|-----------|
| Auth | `(auth)/signin`, `signup`, `reset-password`, `/login`, `/register` | Công khai |
| Public site | `(site)/about`, `contact`, `privacy`, `terms` | Công khai |
| Citizen | `citizen/{alerts, map, weather, request, shelters, sos, profile}` | Người dân |
| Admin dashboard | `dashboard/{admin, incidents, alerts, predictions, recommendations, rescue-requests, rescue-teams, sensors, flood-zones, shelters, analytics, notifications, settings}` | Quản trị |
| Team | `team/{assigned, requests, map, updates, profile}` | Đội cứu hộ |
| Dev | `test-realtime` | Kiểm thử WebSocket |
| API (BFF) | `api/chat` | Tích hợp AI chat phía Next.js |

**Realtime:** dùng `laravel-echo` + `pusher-js` kết nối tới Reverb để cập nhật UI tức thời (cảnh báo, vị trí đội, dữ liệu cảm biến).

### 5.2 Mobile App (`mobile/`)

React Native 0.81 (iOS + Android). Tính năng tương đương citizen web + nút **SOS**, push notification realtime (Firebase FCM), bản đồ Mapbox native, đa ngôn ngữ Vi/En, và luồng riêng cho đội cứu hộ (danh sách nhiệm vụ, bản đồ tình huống, định tuyến).

---

## 6. Backend Layer — Laravel 13 (`backend/`)

API REST (61+ endpoint, tổng ~111 khai báo route), xác thực bằng **Laravel Sanctum**, phân quyền theo vai trò (`city_admin`, `rescue_operator`, `rescue_team`).

### 6.1 Eloquent Models (29)

`User`, `UserDevice`, `District`, `Ward`, `Sensor`, `SensorReading`, `Prediction`, `PredictionDetail`, `AIModel`, `Alert`, `Incident`, `IncidentEvent`, `Recommendation`, `RescueRequest`, `RescueRequestEvent`, `RescueTeam`, `RescueMember`, `FloodZone`, `Shelter`, `EvacuationRoute`, `EvacuationRouteSegment`, `MapNode`, `MapEdge`, `ReliefSupply`, `SupplyStock`, `SupplyAllocation`, `WeatherData`, `DashboardMetric`, `SystemSetting`.

Nhóm chính:
- **Cảm biến & dự báo:** Sensor → SensorReading → Prediction/PredictionDetail (gắn với AIModel).
- **Cảnh báo & sự cố:** Alert, Incident, IncidentEvent.
- **Cứu hộ:** RescueRequest(+Event), RescueTeam, RescueMember.
- **Địa lý & sơ tán:** FloodZone, Shelter, EvacuationRoute(+Segment), MapNode, MapEdge.
- **Cứu trợ:** ReliefSupply, SupplyStock, SupplyAllocation.
- **Hệ thống:** WeatherData, DashboardMetric, SystemSetting, User, UserDevice.

### 6.2 Controllers (`app/Http/Controllers/Api/`)

Auth, Incident, Alert, Prediction, Recommendation, RescueRequest, RescueTeam, Sensor, SensorData, Shelter, FloodZone, EvacuationRoute, Map, WeatherData, Analytics, Notification, FcmToken, Upload, AIChat — cùng nhóm Admin (`Admin/UserController`, `Admin/RoleController`, `Admin/SystemController`).

**Nhóm route (`routes/api.php`):**

- `public/*` — không cần auth (incidents, alerts GeoJSON, flood-zones).
- `map/geocode/*` — dịch vụ geocode.
- `auth/*` — login/register (có `throttle:auth`), logout (sanctum).
- `auth:sanctum` — toàn bộ tài nguyên cần đăng nhập, gồm `fcm/*`, `map/*`.
- `role_or_permission:city_admin|rescue_operator|rescue_team` — thao tác điều phối.
- `role:city_admin` + prefix `admin/*` — quản trị hệ thống & người dùng.

### 6.3 Core Services (`app/Services/`)

| Service | Vai trò |
|---------|---------|
| `FloodAutoDetector` | Tự động phát hiện ngập từ dữ liệu cảm biến/dự báo |
| `RecommendationGenerator` | Sinh đề xuất hành động (sơ tán, trú ẩn, cứu trợ) |
| `AI/AIServiceClient` | Client gọi sang FastAPI AI Service |
| `OpenWeatherService` | Lấy dữ liệu thời tiết (OpenWeatherMap) |
| `DanangSyncService` | Đồng bộ dữ liệu thực Đà Nẵng |
| `NotificationBroadcastService` | Phát thông báo realtime |
| `FcmPushService` | Gửi push notification qua Firebase |

### 6.4 Events broadcast (11)

`PredictionReceived`, `AlertCreated`, `AlertUpdated`, `AlertResolved`, `IncidentCreated`, `IncidentResolved`, `RescueRequestCreated`, `RescueRequestUpdated`, `SensorReadingReceived`, `FloodZoneUpdated`, `NotificationSent`.

**Kênh tiêu biểu:** `user.{userId}.notifications`, `team.{teamId}.dispatch`, `incident.{incidentId}`, `alert.{alertId}`, `prediction.all`.

### 6.5 Jobs (Queue)

`CallAIPrediction` (gọi AI dự báo), `FetchWeatherDataJob` (lấy thời tiết), `SendPushNotificationJob` (gửi FCM).

### 6.6 Enums (22)

`AlertTypeEnum`, `AlertStatusEnum`, `SeverityEnum`, `UrgencyEnum`, `IncidentTypeEnum`, `IncidentStatusEnum`, `IncidentSourceEnum`, `PredictionStatusEnum`, `RecommendationTypeEnum`, `RecommendationStatusEnum`, `RescueRequestStatusEnum`, `RescueCategoryEnum`, `RescueTeamTypeEnum`, `RescueTeamStatusEnum`, `SensorTypeEnum`, `SensorStatusEnum`, `FloodZoneRiskEnum`, `FloodZoneStatusEnum`, `ShelterStatusEnum`, `EvacuationRouteStatusEnum`, `MapNodeTypeEnum`, `NotificationTypeEnum`.

---

## 7. AI / ML Layer — FastAPI (`ai-service/`)

FastAPI v2.0.0, chạy uvicorn cổng **5005**, CORS mở. Router chia 3 nhóm: `calculations`, `cascade-alerts`, `realtime` (prefix `/api`).

### 7.1 Mô hình & thuật toán (`services/`, `models/`)

| Thành phần | Mô tả |
|------------|-------|
| `flood_risk_model.pkl` | RandomForest phân loại 4 mức rủi ro (critical/high/medium/low) — F1=0.9886, AUC-ROC≈0.9996 |
| `lstm_flood_forecaster.pkl` | Dự báo chuỗi thời gian mực nước (LSTM) |
| `graph_flood_model.pkl` | Mô hình lan ngập trên đồ thị (graph) |
| `flood_calculator.py` | Tính rủi ro ngập |
| `flood_spread_bfs.py` | Lan ngập theo BFS trên đồ thị địa hình |
| `graph_flood_predictor.py` | Dự báo ngập theo đồ thị nút/cạnh |
| `lstm_forecaster.py` | Suy luận LSTM |
| `route_optimizer.py` | Tối ưu tuyến sơ tán (tránh vùng ngập) |
| `priority_calculator.py` | Tính ưu tiên cứu hộ (nhóm dễ tổn thương) |
| `shelter_calculator.py` | Phân bổ nơi trú ẩn (khoảng cách + sức chứa) |
| `anomaly_detector.py` | Phát hiện bất thường dữ liệu cảm biến |
| `cascade_alert_generator.py` | Sinh cảnh báo dây chuyền |
| `weather_fetcher.py`, `sensor_simulator_v2.py` | Lấy thời tiết, mô phỏng cảm biến |

**Dữ liệu huấn luyện (`data/`):** `flood_danang_2019_2024.csv` (+ bản augmented/balanced), `danang_flood_graph.geojson/json`, `stations_reference.csv`. 5 đặc trưng: `water_level_m`, `rainfall_mm`, `hours_rain`, `tide_level`, `historical_score`.

### 7.2 Endpoint tiêu biểu

- **Dự báo:** `POST /api/predict-risk`, `/predict/flood`, `/predict/forecast`, `/predict/realtime`, `/predict/spread`, `/predict/spread/from-stations`, `GET /predict/trends`, `POST /v2/predict`, `/v2/scenario`.
- **Tối ưu & tính toán:** `POST /optimize-route`, `GET /api/optimize-evacuation`, `POST /calculate-priority`, `/score-shelter`.
- **Cảnh báo dây chuyền:** `POST /generate`, `/recommendations/analyze`, `/ai/analyze`, `GET /alerts`, `POST /alerts/acknowledge/{ts}`.
- **Realtime/cảm biến:** `GET /sensors`, `/sensors/latest`, `/active`, `/geojson`, `/flood-spread`, `POST /sensors/reading`, `/sensors/readings/batch`, `/anomaly/ingest`, `/anomaly/batch`, `GET /anomaly/stats`.
- **Vận hành mô hình:** `POST /retrain`, `/lstm/reload`, `/graph/model/reload`, `GET /graph/nodes`, `/cache-stats`, `POST /cache/clear`.
- **Mô phỏng:** `GET /simulate/reading`, `POST /simulate/flood-event`.

---

## 8. Data & Realtime Layer

- **MySQL 8.0** (`aegisflow_db`, :3306) — lưu trữ quan hệ chính, dữ liệu địa lý (vùng ngập, nút/cạnh bản đồ), `sensor_readings`, `predictions`, `incidents`, `alerts`, `recommendations`.
- **Redis** — cache driver, session store, queue backend cho job nền.
- **Laravel Reverb** (WebSocket, ws://:8080) — phát các event broadcast tới client qua Laravel Echo/Pusher.js.

---

## 9. Luồng dữ liệu thời gian thực (End-to-End)

```
1. Cảm biến IoT  ──POST /api/sensor-data/batch──►  Backend  ──►  MySQL (sensor_readings)
2. Scheduler (mỗi ~15') ─► Job CallAIPrediction ─► POST AI /api/predict-risk
3. AI trả risk_level + confidence ─► lưu predictions
4. Nếu risk ≥ HIGH ─► Event PredictionReceived ─► broadcast (prediction.all)
5. RecommendationGenerator ─► sinh đề xuất (sơ tán/trú ẩn/điều đội) ─► dashboard admin
6. Operator duyệt ─► tạo Incident ─► AlertCreated ─► push FCM tới người dân
7. App người dân nhận cảnh báo ─► hiển thị tuyến sơ tán + nơi trú ẩn gần nhất (có thể SOS)
8. Operator gán nhiệm vụ ─► RescueRequest ─► đội cứu hộ nhận push ─► AI tính tuyến tối ưu
9. Đội di chuyển ─► gửi vị trí ─► WebSocket cập nhật bản đồ tình huống realtime
10. Hoàn tất ─► IncidentResolved ─► cập nhật analytics + xác nhận cho người dân
```

---

## 10. Tác vụ định kỳ (Laravel Scheduler — `routes/console.php`)

| Lịch | Tác vụ |
|------|--------|
| Mỗi phút (gate theo `system_settings`) | `ai-prediction` — chạy `CallAIPrediction` theo interval cấu hình (mặc định 15') |
| Mỗi 30 phút | `fetch-weather-data` — lấy dữ liệu OpenWeatherMap |
| Mỗi 15 phút | `sync:danang-data` — đồng bộ dữ liệu Đà Nẵng |
| Mỗi 10 phút | `sensor-health-check` — đánh dấu cảm biến offline nếu quá 10' không gửi |
| Hàng ngày | `cleanup-expired-predictions` — đánh dấu prediction quá 2 ngày là expired |
| Hàng giờ | `cleanup-expired-alerts` — hết hạn alert quá `effective_until` |

---

## 11. Bảo mật & phân quyền

- Xác thực bằng **Laravel Sanctum** (Bearer token): `Authorization: Bearer {token}`.
- Phân quyền theo vai trò/permission: `city_admin`, `rescue_operator`, `rescue_team`.
- Throttle cho endpoint auth (`throttle:auth`).
- Human-in-the-loop: cảnh báo gửi dân cần **operator duyệt** trước (giảm dương tính giả).
- Ngưỡng tin cậy AI (~85%) lọc dự báo không chắc chắn.

---

## 12. Triển khai (Docker Compose)

`docker-compose.yml` định nghĩa 5 service trên mạng bridge `aegisflow_network`:

| Service | Image/Build | Cổng host |
|---------|-------------|-----------|
| mysql | mysql:8.0 | 3306 |
| redis | redis:alpine | (nội bộ) |
| backend | build ./backend | 8000 |
| frontend | build ./frontend | 3000 |
| ai-service | build ./ai-service | 8080 → *(nên đổi 5005)* |

```bash
docker-compose up --build      # khởi chạy toàn bộ
# hoặc chạy thủ công từng service:
./run_all.sh backend|frontend|reverb|ai
```

---

## 13. Khả năng mở rộng (Scalability)

- **Kiến trúc module hóa:** AI service là thành phần cắm-rút (pluggable), giao tiếp HTTP độc lập.
- **Đa thành phố (multi-tenant ready):** tham số hóa theo thành phố (Đà Nẵng → Bangkok, Jakarta, Manila…).
- **Microservice-capable:** API, WebSocket (Reverb) và AI tách rời, có thể scale độc lập.
- **Hàng đợi nền:** job nặng (dự báo AI, push, đồng bộ) đẩy qua Redis queue.

---

## 14. Tham chiếu nhanh (Ports & URLs)

| Dịch vụ | URL/Cổng |
|---------|----------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| WebSocket (Reverb) | ws://localhost:8080 |
| AI Service | http://localhost:5005 |
| MySQL | localhost:3306 |

---

*Tài liệu sinh từ phân tích mã nguồn thực tế. Khi cấu trúc thay đổi, cập nhật lại các bảng Models/Controllers/Events/Endpoints tương ứng.*
