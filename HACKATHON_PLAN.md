# Kế hoạch Hoàn thiện AegisFlow AI cho ASEAN AI Hackathon 2026

> **Track:** Climate Change Resilience  
> **Deadline quan trọng tiếp theo:** Apr 28 (Semi-Final pitching video)  
> **Ngày hôm nay:** 18/04/2026

---

## TỔNG QUAN ĐÁNH GIÁ HIỆN TẠI

| Tiêu chí | Điểm tối đa | Ước tính hiện tại | Điểm cần cải thiện |
|---|---|---|---|
| Innovation & Originality | 25 | 18 | +7 |
| Technical Execution | 30 | 22 | +8 |
| Impact & Feasibility | 30 | 22 | +8 |
| Presentation & Demo | 15 | 5 | +10 |
| **Tổng** | **100** | **67** | **+33** |

---

## PHASE 1 — KHẨN CẤP (Trước Apr 23) 🔴

> Chuẩn bị cho E-Consultation ngày 23/04 — mentor sẽ hỏi sâu về kỹ thuật AI

### 1.1 Nâng cấp AI Service (Python FastAPI)

**Vấn đề:** AI hiện tại chỉ là rule-based heuristic, không phải trained model thực sự.  
**Giải pháp:** Thêm trained ML model cho flood risk prediction.

#### Bước thực hiện:

**a) Thu thập dataset (2 ngày)**
- [ ] Download dữ liệu lũ lụt Đà Nẵng từ:
  - [Cục Khí tượng Thủy văn (VNMHA)](https://www.nchmf.gov.vn) — dữ liệu mưa, mực nước
  - [Global Flood Database (DFO)](https://global-flood-database.cloudtostreet.ai) — flood events
  - [USGS Flood Data](https://waterdata.usgs.gov) — tham khảo mô hình
  - [Copernicus Emergency Management](https://emergency.copernicus.eu) — GIS flood maps
- [ ] Tạo synthetic dataset từ sensor readings hiện có (nếu chưa có real data)
- [ ] Document nguồn gốc dataset trong `ai-service/data/README.md`

**b) Train ML Model (3 ngày)**
```
ai-service/
├── data/
│   ├── flood_danang_2019_2024.csv   # Dataset chính
│   ├── README.md                    # Nguồn gốc, license
│   └── preprocessing.py            # Data cleaning script
├── models/
│   ├── train_flood_model.py        # Training script
│   ├── flood_risk_model.pkl        # Trained model (scikit-learn)
│   └── model_metrics.json          # F1, accuracy, RMSE...
└── api/
    └── calculations.py             # Cập nhật dùng trained model
```

- [ ] Train **RandomForest Classifier** hoặc **XGBoost** cho flood risk
  - Features: water_level, rainfall_mm, tide_level, duration_hours, historical_count
  - Labels: low / medium / high / critical
  - Target: F1 Score ≥ 0.80
- [ ] Tính và lưu metrics: F1, Precision, Recall, AUC-ROC, inference latency
- [ ] Tích hợp model vào endpoint `POST /api/predict-risk`
- [ ] So sánh kết quả rule-based vs ML model (ablation study)

**c) Cải thiện GPT Chat (1 ngày)**
- [ ] Cập nhật `frontend/src/app/api/chat/route.ts`:
  - System prompt chuyên sâu về flood domain
  - Biết về ngưỡng nước Đà Nẵng, vùng ngập lịch sử
  - Trả lời bằng Vietnamese/English theo ngữ cảnh
  - Kết nối context từ sensor readings và predictions

### 1.2 AI Ethics & Data Documentation

**Vì sao quan trọng:** Slide 8 (AI Ethics) là bắt buộc, ban giám khảo sẽ hỏi.

- [ ] Tạo file `docs/AI_ETHICS.md`:
  - Bias mitigation: dataset đại diện nhiều khu vực, không chỉ urban
  - Privacy: không lưu ảnh công dân lâu dài, data minimization
  - Transparency: model confidence score hiển thị rõ cho operator
  - Human-in-the-loop: AI recommend, human approve (đã có trong code)
  - Fairness: ưu tiên người dễ bị tổn thương (elderly, disabled, children)
- [ ] Thêm bias check vào rescue priority calculator
- [ ] Document data licensing rõ ràng

### 1.3 UN SDGs Alignment

- [ ] Map tính năng dự án với các SDG:
  - **SDG 11** (Sustainable Cities): Smart city flood management
  - **SDG 13** (Climate Action): Disaster risk reduction
  - **SDG 3** (Good Health): Rescue prioritization cho vulnerable groups
  - **SDG 17** (Partnerships): Multi-agency coordination platform
- [ ] Thêm section SDGs vào README.md

---

## PHASE 2 — PITCH DECK (Hoàn thành trước Apr 26) 🟠

> File: `ClimateResilience_DuyTanUniversity_AegisFlow_PitchDeck.pptx`

### Cấu trúc 15 slides (theo yêu cầu chính thức):

| Slide | Tiêu đề | Nội dung chính |
|---|---|---|
| 1 | **Title Slide** | AegisFlow AI — Hệ thống AI Dự báo Lũ & Điều phối Cứu hộ / Team name / DTU / Track: Climate Resilience |
| 2 | **Problem Statement** | Lũ lụt Đà Nẵng: 2019 thiệt hại X tỷ VND, response time trung bình Y giờ. Thiếu hệ thống tích hợp real-time. Số liệu thực tế |
| 3 | **The AI Solution** | Elevator pitch: "AegisFlow AI = Early Warning + Smart Dispatch + Safe Evacuation trong 1 platform" |
| 4 | **Competitive Advantage** | So sánh vs: (1) Hệ thống cảnh báo lũ truyền thống, (2) Apps riêng lẻ, (3) Google Maps. AegisFlow tích hợp IoT + AI + Coordination |
| 5 | **Technical Architecture** | Sơ đồ hệ thống: Sensors → Laravel Backend → FastAPI AI → Dashboard/Mobile → Citizens/Teams |
| 6 | **AI Approach & Model** | RandomForest flood prediction + Heuristic priority scoring + GPT-4o-mini assistant. Tại sao chọn RF? (interpretable, works with small data) |
| 7 | **Data Strategy** | Sources: VNMHA, synthetic sensor data. Licensing: public domain. Cleaning: outlier removal, normalization |
| 8 | **AI Ethics** | Human-in-the-loop approval, bias mitigation, privacy (no PII stored), transparency (confidence scores), fairness (vulnerable priority) |
| 9 | **Prototype Demo** | GIF/video: login → map → alert → rescue request → AI recommendation → approve → team dispatch |
| 10 | **Technical Hurdles** | (1) Thiếu historical flood data Đà Nẵng → synthetic data. (2) Real-time geospatial → PostGIS. (3) LLM hallucination → RAG với sensor context |
| 11 | **Accuracy & Metrics** | F1 Score flood model: X%, Latency: Yms, Priority ranking precision: Z%. User testing: A users, B satisfaction |
| 12 | **Scalability Roadmap** | Phase 1: Đà Nẵng pilot → Phase 2: 5 thành phố VN → Phase 3: ASEAN (Bangkok, Jakarta, Manila) |
| 13 | **Impact Assessment** | SDG 11, 13, 3, 17. Estimated lives saved: X/year. Response time reduction: Y%. Cost savings: Z% |
| 14 | **Future Roadmap** | 2026 Q3: Real sensor integration. 2026 Q4: Satellite imagery AI. 2027: Multi-language ASEAN expansion |
| 15 | **Team & Contact** | Ảnh + bio 3-5 thành viên. DTU logo. GitHub link. Demo URL. Email liên lạc |

---

## PHASE 3 — DEMO & VIDEO (Hoàn thành trước Apr 28) 🟠

> Yêu cầu: Recording Pitching Video = 3 phút presentation + 3 phút Q&A

### 3.1 Demo Scenario (Golden Path)

**Kịch bản demo 3 phút:**
1. **[0:00-0:30]** Dashboard chính: map Đà Nẵng, sensors xanh lá
2. **[0:30-1:00]** Trigger sensor anomaly → alert tự động → notification mobile
3. **[1:00-1:30]** AI prediction panel: risk score 78/100, confidence 85%, khuyến nghị
4. **[1:30-2:00]** Rescue request từ mobile app → AI priority score → assign team
5. **[2:00-2:30]** Evacuation route optimization trên map
6. **[2:30-3:00]** Analytics dashboard: KPIs, response metrics

### 3.2 Checklist kỹ thuật trước khi quay

- [ ] Seed database với dữ liệu demo đẹp (incidents, sensors, teams)
- [ ] Tạo script `database/seeders/DemoDataSeeder.php` với scenario cụ thể
- [ ] Test toàn bộ flow không bị lỗi
- [ ] Đảm bảo map load đúng vùng Đà Nẵng
- [ ] Mobile app kết nối được WebSocket
- [ ] AI chat trả lời coherent về flood situation

### 3.3 Yêu cầu kỹ thuật video
- Resolution: 1920x1080 (16:9)
- Audio: English voiceover rõ ràng + subtitles
- Music: royalty-free (từ YouTube Audio Library hoặc Pixabay)
- Tool: OBS Studio (miễn phí)

---

## PHASE 4 — CODE QUALITY & GITHUB (Trước Apr 28) 🟡

### 4.1 GitHub Repository

- [ ] Đảm bảo repo **public**
- [ ] README.md chuẩn hackathon:
  - Project description ngắn gọn
  - Demo URL (nếu có deploy)
  - Tech stack badges
  - Setup instructions rõ ràng
  - Screenshots/GIFs
  - Team members
  - License (MIT)
- [ ] Xóa `.env` files, credentials khỏi git history
- [ ] Thêm `.env.example` cho tất cả services

### 4.2 Code Documentation

- [ ] Document AI service endpoints trong `ai-service/README.md`
- [ ] Thêm Swagger/OpenAPI docs cho FastAPI (built-in với FastAPI tại `/docs`)
- [ ] Comment các thuật toán phức tạp trong `calculations.py`

### 4.3 Deploy Demo (nếu có thời gian)

**Gợi ý deploy miễn phí:**
- Frontend: Vercel (Next.js native)
- Backend: Railway.app hoặc Render.com (Laravel)
- AI Service: Hugging Face Spaces hoặc Render.com (Python)
- Database: Supabase (PostgreSQL free tier)

---

## PHASE 5 — SEMI-FINAL PREPARATION (Apr 28) 🔴

### Chuẩn bị Q&A (3 phút)

Các câu hỏi ban giám khảo thường hỏi:

| Câu hỏi | Câu trả lời cần chuẩn bị |
|---|---|
| "Why RandomForest over deep learning?" | Interpretable, works with limited data, fast inference, explainable to emergency managers |
| "What's your training data source?" | VNMHA public data + synthetic from physics-based simulation |
| "How do you handle false positives?" | Human-in-the-loop approval workflow, confidence threshold tuning |
| "How does this scale to other ASEAN cities?" | Modular architecture, city-specific sensor config, multi-language i18n |
| "What's the real-world impact?" | Reduce response time from ~2h to ~15min based on simulation |
| "How do you protect citizen privacy?" | No PII in AI model, data minimization, local processing |

---

## CHECKLIST TỔNG HỢP

### Bắt buộc (không nộp được nếu thiếu)
- [ ] Pitch Deck PDF 15 slides
- [ ] GitHub repo public với code chạy được
- [ ] Demo video (3+3 phút)
- [ ] Accuracy metrics có số liệu thực

### Quan trọng (ảnh hưởng lớn đến điểm)
- [ ] Trained ML model thay thế rule-based
- [ ] AI Ethics documentation
- [ ] Dataset source documentation
- [ ] UN SDGs alignment
- [ ] Demo data seeder

### Cộng thêm điểm (nếu còn thời gian)
- [ ] Live deployment với URL
- [ ] Unit tests cho AI service
- [ ] Satellite imagery integration (CV model)
- [ ] Multi-language support (English UI hoàn chỉnh)
- [ ] RAG cho GPT chat với real sensor data

---

## TIMELINE CHI TIẾT

```
Apr 18 (hôm nay)
  └── Bắt đầu thu thập dataset, setup training pipeline

Apr 19-20
  └── Train ML model, tính metrics
  └── Cải thiện GPT system prompt

Apr 21
  └── AI Ethics doc, SDGs alignment
  └── Update README

Apr 22
  └── Bắt đầu làm Pitch Deck

Apr 23 ⭐ E-Consultation
  └── Pitch Deck draft sẵn sàng
  └── Demo chạy được

Apr 24-25
  └── Hoàn thiện Pitch Deck
  └── Seed demo data
  └── Test toàn bộ flow

Apr 26
  └── Quay demo video
  └── Edit video

Apr 27
  └── Review tổng thể
  └── Rehearsal Q&A

Apr 28 ⭐ Semi-Final Deadline
  └── Submit Recording Pitching Video
```

---

## GHI CHÚ KỸ THUẬT

### Cải thiện nhanh AI Service

```python
# ai-service/models/train_flood_model.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score
import joblib

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Metrics
y_pred = model.predict(X_test)
print(classification_report(y_pred, y_test))
f1 = f1_score(y_test, y_pred, average='weighted')

# Save
joblib.dump(model, 'flood_risk_model.pkl')
```

### System Prompt cải thiện cho GPT Chat

```typescript
const systemPrompt = `You are AegisFlow AI Assistant, an expert emergency management 
system for Đà Nẵng, Vietnam. You have real-time access to:
- Current sensor readings (water level, rainfall)
- Active flood zones and risk levels  
- Rescue team locations and availability
- Shelter capacity and locations

Respond in the user's language (Vietnamese or English). 
Be concise, action-oriented. Always include confidence levels.
Prioritize life safety over property. Flag critical situations immediately.`
```

---

*Tài liệu này được tạo ngày 18/04/2026 để hướng dẫn hoàn thiện AegisFlow AI cho ASEAN AI Hackathon 2026.*
