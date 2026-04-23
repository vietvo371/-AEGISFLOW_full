# AegisFlow AI — AI Ethics & Responsible AI Framework

> **Document version:** 1.0.0  
> **Last updated:** 2026-04-23  
> **Authors:** AegisFlow AI Team — Duy Tan University  
> **Contact:** aegisflow.ai@gmail.com

---

## 1. Tổng quan

Tài liệu này trình bày khung AI Ethics cho hệ thống **AegisFlow AI** — nền tảng dự báo ngập lụt và điều phối cứu hộ bằng AI cho thành phố Đà Nẵng, Việt Nam.

Trong bối cảnh quản lý thiên tai, quyết định của AI ảnh hưởng trực tiếp đến tính mạng con người. Vì vậy, AegisFlow AI được thiết kế với nguyên tắc **AI phục vụ con người, không thay thế con người**.

---

## 2. 5 Trụ cột Ethical

### 2.1 Human-in-the-Loop (HITL)

**Nguyên tắc:** Mọi khuyến nghị của AI phải được con người xem xét và phê duyệt trước khi thực hiện hành động.

```
AI generates recommendations
        ↓
Human operator reviews
        ↓
  APPROVE / REJECT workflow
        ↓
No autonomous dispatch without human authorization
```

**Implementation:**
- Tất cả flood alerts cần operator approve trước khi gửi notification
- Rescue team assignments cần confirmation từ rescue operator
- Evacuation orders phải được cấp có thẩm quyền duyệt
- Mọi action đều có audit trail đầy đủ

**Fallback:** Nếu AI system không khả dụng, hệ thống tự động chuyển sang **chế độ thủ công** (manual mode) với thông báo rõ ràng cho operators.

### 2.2 Fairness & Vulnerable Priority

**Nguyên tắc:** Mọi công dân đều được bảo vệ bình đẳng, ưu tiên các nhóm dễ bị tổn thương.

**Rescue Priority Weights:**
| Nhóm | Điểm cộng | Lý do |
|------|-----------|--------|
| Người cao tuổi (≥65) | +15 | Di chuyển chậm, cần hỗ trợ |
| Người khuyết tật | +15 | Cần thiết bị đặc biệt |
| Trẻ em (<12 tuổi) | +10 | Không thể tự sơ tán |
| Phụ nữ mang thai | +10 | Nguy hiểm cho mẹ và thai nhi |
| Người bệnh tim mạch | +5 | Nguy cơ sức khỏe cao |

**Anti-bias safeguards:**
- Không phân biệt theo thu nhập, chủng tộc, tôn giáo, giới tính
- Thuật toán không sử dụng địa chỉ nhà riêng làm input
- Flood zone data được anonymized (không link đến PII)
- Regular bias audits mỗi quý

### 2.3 Transparency & Explainability

**Nguyên tắc:** Mọi quyết định của AI phải có giải thích rõ ràng cho operator.

**Required fields cho mỗi AI recommendation:**
```
{
  "recommendation": "Dispatch Team A to Location X",
  "confidence_score": 0.87,
  "reasoning": [
    "water_level_m: 3.2m (+8/40 points)",
    "rainfall_mm: 180mm (+12/30 points)",
    "vulnerable_elderly: present (+15 points)",
    "wait_time: 45 minutes (+4/10 points)"
  ],
  "alternative_options": [
    {"team": "Team B", "priority_score": 72, "reason": "Further distance"},
    {"team": "Team C", "priority_score": 65, "reason": "Currently handling critical case"}
  ],
  "data_sources": ["sensor_431001", "weather_api_danang", "incident_2026042301"]
}
```

**Confidence threshold:**
- ≥ 90%: High confidence → Hiển thị xanh, khuyến nghị mạnh
- 70-89%: Medium confidence → Hiển thị vàng, cần operator đánh giá
- < 70%: Low confidence → Hiển thị đỏ, yêu cầu operator quyết định thủ công

### 2.4 Privacy by Design

**Nguyên tắc:** Dữ liệu cá nhân chỉ được thu thập khi cần thiết, lưu trữ an toàn, xóa khi hết hạn.

**Data Minimization:**
- Không thu thập ảnh/video từ camera công cộng trừ khi cần thiết cho flood detection
- Vị trí GPS công dân chỉ được dùng trong session cứu hộ, xóa sau 48h
- Không lưu lịch sử di chuyển của công dân
- ML model không training với PII ( Personally Identifiable Information)

**Access Control (RBAC):**
| Role | Dữ liệu được phép xem |
|------|----------------------|
| citizen | Chỉ thông tin công khai về flood zones |
| rescue_team | Vị trí incidents gần, không thấy PII công dân khác |
| rescue_operator | Rescue requests + team locations + flood data |
| city_admin | Full dashboard + analytics + all incidents |
| ai_operator | System health + model performance metrics |

**Technical safeguards:**
- Mã hóa dữ liệu at rest (AES-256) và in transit (TLS 1.3)
- API authentication qua Laravel Sanctum (token-based)
- Rate limiting trên tất cả endpoints
- Log tất cả data access attempts

### 2.5 Fail-Safe Design

**Nguyên tắc:** Hệ thống phải hoạt động an toàn ngay cả khi AI thất bại.

**Multi-layer fallback:**

```
Layer 1: Trained ML Model (RandomForest)
  ↓ (if unavailable or confidence < 0.5)
Layer 2: Rule-based Heuristic Scoring
  ↓ (if rule-based fails)
Layer 3: Static Thresholds (VNMHA-based)
  ↓ (if all above fail)
Layer 4: Manual Mode → System sends alert to all operators
```

**Reliability metrics:**
- System uptime: ≥ 99.5% (target)
- ML model availability: ≥ 99% (with fallback ready)
- Average API response time: < 200ms (p95)
- WebSocket latency: < 50ms

**Alert escalation:**
- Nếu AI không response trong 5 giây → tự động bật rule-based
- Nếu sensor data quality score < 0.5 → flag unreliable readings
- Nếu confidence score < 0.3 → yêu cầu human override bắt buộc

---

## 3. Data Ethics

### 3.1 Dataset Sources & Licensing

| Data Type | Source | License | Purpose |
|-----------|--------|---------|---------|
| Water level | muangap.danang.gov.vn (crawled) | Public government data | Flood prediction |
| Rainfall | OpenWeatherMap API | Free tier (CC attribution) | Weather context |
| Flood events | muangap.danang.gov.vn | Public government data | Historical labels |
| GIS boundaries | Da Nang City GIS Portal | Open government data | Flood zones |
| Rescue requests | Platform users | N/A (user-generated) | Priority scoring |

### 3.2 Synthetic Data Disclosure

Do hạn chế về labeled flood data có độ chính xác cao, model được train trên **synthetic dataset** tạo từ VNMHA (Vietnam Hydrology Administration) thresholds.

**Disclosure statement:**
> *"AegisFlow AI's flood prediction model is trained on synthetic data generated using physics-based thresholds from VNMHA flood criteria. The model serves as an early warning aid and does not replace official government flood warnings."*

### 3.3 Bias Mitigation

**Geographic bias:**
- Dataset bao gồm cả khu vực đô thị (Hải Châu, Thanh Khê) và nông thôn (Hòa Vang, Bà Nà)
- Sensor placement được phân bố đều trên geographic footprint của Đà Nẵng
- Model validated trên historical flood events từ nhiều quận/huyện

**Temporal bias:**
- Training data bao gồm multiple flood seasons (2019-2024)
- Không overfit vào một đợt lũ duy nhất

---

## 4. Governance & Accountability

### 4.1 Model Versioning

- Mỗi model version được lưu trữ với timestamp và metrics
- Model updates require review từ AI Operator role
- Rollback procedure documented và tested

### 4.2 Audit Trail

Mọi AI decision được log với:
- Timestamp
- Input features (anonymized)
- Model version
- Output + confidence
- Operator action (approved/rejected/modified)
- Operator ID

### 4.3 Incident Reporting

Nếu AI system gây ra hoặc có thể gây ra harm:
1. Operator báo cáo qua `/api/admin/logs`
2. Team lead review trong 24h
3. Incident logged trong `incidents` table với category = "ai_system"
4. Model được re-evaluated nếu cần

---

## 5. Compliance

### 5.1 Alignment với AI Ethics Guidelines

- **Vietnam AI Ethics Guidelines (2024):** tuân thủ các nguyên tắc về transparency, accountability, và human oversight
- **ASEAN Agreement on Disaster Management:** hỗ trợ SDG 11, 13, 17
- **GDPR principles:** data minimization, purpose limitation, storage limitation (áp dụng cho EU citizens nếu có)

### 5.2 Security Compliance

- OWASP Top 10 mitigation
- Regular dependency updates
- Penetration testing trước production deployment
- HTTPS everywhere (TLS 1.3)

---

## 6. Continuous Improvement

### 6.1 Model Retraining Schedule

| Trigger | Action |
|---------|--------|
| Sau mỗi major flood event | Retrain với real incident data |
| 3 tháng | Retrain với accumulated sensor data |
| Khi AUC-ROC drop > 2% | Full model re-evaluation |
| Khi bias audit phát hiện issue | Urgent retraining |

### 6.2 Feedback Loop

```
Real flood events
       ↓
Collect outcomes (rescue success/failure)
       ↓
Compare with AI predictions
       ↓
Update thresholds & model parameters
       ↓
Document changes in model_metrics.json
```

---

## 7. Emergency Override Protocol

Trong tình huống khẩn cấp, operator có quyền:

1. **Manual dispatch:** Ghi đè AI recommendation, chỉ định team thủ công
2. **System bypass:** Tắt AI prediction cho một khu vực cụ thể
3. **Emergency broadcast:** Gửi evacuation alert mà không cần AI confirmation
4. **Kill switch:** Tắt toàn bộ AI system nếu cần (chuyển sang manual mode)

Mọi override action đều được logged với lý do bắt buộc.

---

## 8. Contact & Reporting

**Để báo cáo ethical concerns hoặc safety incidents:**
- Email: aegisflow.ai@gmail.com
- GitHub Issues: github.com/aegisflow-ai/aegisflow-ai (label: `ethics`)

---

*Tài liệu này được review bởi AegisFlow AI Team và cập nhật định kỳ.*
