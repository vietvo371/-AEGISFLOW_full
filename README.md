#   

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

## United Nations Sustainable Development Goals (SDGs)

AegisFlow AI được thiết kế để đóng góp vào các SDGs sau:

### SDG 11 — Sustainable Cities and Communities
**Target 11.5:** Giảm thiệt hại về người và tài sản do thiên tai

> AegisFlow AI cung cấp hệ thống cảnh báo sớm và điều phối cứu hộ thông minh, trực tiếp hỗ trợ mục tiêu giảm thiệt hại do lũ lụt tại các đô thị Việt Nam.

- Ứng dụng: Dashboard cho city admin + mobile alerts cho citizens
- Đo lường: Reduction in response time, lives saved estimation

### SDG 13 — Climate Action
**Target 13.1:** Tăng cường khả năng chống chịu với các rủi ro khí hậu

> Hệ thống dự báo ngập lụt dựa trên AI giúp cộng đồng chuẩn bị trước, giảm tác động của biến đổi khí hậu ngày càng tăng tại Đông Nam Á.

- Ứng dụng: Early warning system + evacuation optimization
- Đo lường: Time to evacuation, coverage of at-risk population

### SDG 3 — Good Health and Well-Being
**Target 3.d:** Tăng cường năng lực quản lý rủi ro sức khỏe

> AegisFlow AI ưu tiên các nhóm dễ bị tổn thương (người cao tuổi, khuyết tật, trẻ em, phụ nữ mang thai) trong thuật toán cứu hộ, đảm bảo tiếp cận y tế kịp thời.

- Ứng dụng: Rescue priority algorithm với vulnerable group scoring
- Đo lường: Priority coverage for vulnerable populations

### SDG 17 — Partnerships for the Goals
**Target 17.6:** Chia sẻ công nghệ cho các nước đang phát triển

> Nền tảng mã nguồn mở, có thể triển khai tại các thành phố ASEAN khác (Bangkok, Jakarta, Manila).

- Ứng dụng: Open source platform, multi-city architecture
- Đo lường: Number of ASEAN cities replicating the platform

---

## AI Ethics & Responsible AI

Xem [docs/AI_ETHICS.md](docs/AI_ETHICS.md) để biết chi tiết về khung AI ethics của AegisFlow AI, bao gồm:
- Human-in-the-Loop design
- Fairness & bias mitigation
- Privacy by design
- Fail-safe architecture

---

## License

MIT License — Xem [LICENSE](LICENSE) để biết chi tiết.
