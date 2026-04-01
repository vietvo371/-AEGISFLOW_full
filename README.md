# AegisFlow AI

**AegisFlow AI** là nền tảng AI hỗ trợ chính quyền đô thị và cộng đồng dự báo ngập lụt sớm, đề xuất tuyến sơ tán an toàn, và tối ưu phân bổ cứu trợ theo thời gian thực.

## Mục tiêu chính
Chuyển từ hệ thống “cảnh báo ngập” thông thường → thành hệ thống hành động toàn diện (Action System), giúp giảm thiểu thiệt hại do ngập lụt ở các đô thị Đông Nam Á (đặc biệt là Đà Nẵng).

## Cấu trúc dự án
- `/backend`: Laravel (Core API, User Management, Database interactions, Real-time with Reverb)
- `/frontend`: Next.js (Dashboard, Map Visualization, Citizen/Admin Interfaces)
- `/ai-service`: Python FastAPI (Flood Prediction, Route Optimization, Relief Prioritization)
- `/docker`: Dockerfiles and environment configurations
- `/docs`: Project documentation and API specifications

## Công nghệ chính
- **Frontend:** Next.js
- **Backend:** Laravel
- **AI/ML:** Python + FastAPI
- **Database:** MySQL
- **Bản đồ:** Leaflet / Mapbox
- **Realtime:** Laravel Reverb (WebSocket)

## Tác nhân (4 Actors)
1. **Quản trị viên đô thị / Trung tâm điều hành** – Dashboard quyết định thời gian thực.
2. **Đội cứu trợ / Ứng cứu khẩn cấp** – Nhận danh sách ưu tiên cứu trợ.
3. **Người dân** – Nhận cảnh báo + hướng dẫn sơ tán đơn giản.
4. **Hệ thống AI** – Bộ não tự động chạy dự báo và tính toán.

## Lõi AI (3 lớp chính)
1. **Dự báo ngập** – Dự đoán khu vực sắp ngập, thời gian và mức độ nguy cơ (Thấp/Trung bình/Cao).
2. **Tối ưu sơ tán** – Tính tuyến đường an toàn, tránh vùng ngập.
3. **Ưu tiên cứu trợ** – Xếp hạng các điểm cần hỗ trợ trước dựa trên dân số, mức ngập và báo cáo thực tế.
