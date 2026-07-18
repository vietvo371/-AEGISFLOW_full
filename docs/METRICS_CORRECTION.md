# ⚠️ ĐÍNH CHÍNH CHỈ SỐ MÔ HÌNH AI — ĐỌC TRƯỚC KHI TRÍCH DẪN

> Tài liệu **quyền lực nhất** về chỉ số mô hình. Bất kỳ con số nào trong repo mâu thuẫn với tài liệu này đều LỖI THỜI.

## KHÔNG dùng các số cũ này (chúng ẢO)
Các tài liệu/pitch cũ ghi:
- `accuracy 98.83%` / `98.81%`
- `F1 weighted 0.9886`
- `AUC-ROC 0.9996`
- `CV F1 0.9886 ± 0.0038`

**→ TẤT CẢ VÔ NGHĨA cho dự báo thật.** Lý do (đã audit trên code):
1. **Nhãn circular:** sinh bằng hàm ngưỡng từ CHÍNH các feature đầu vào → model chỉ học lại quy tắc if-else.
2. **Rò rỉ train/test:** oversample TRƯỚC khi split → ~51% dòng trùng lặp giữa train và test.
3. **~88% dữ liệu synthetic**, không có script train, `lightgbm` thiếu (model âm thầm rơi fallback).
4. Đánh giá bằng **random split** (không chống rò rỉ không gian).

## DÙNG các số THẬT này (đã kiểm định trung thực)
Mô hình mới: **Flood Susceptibility Mapping** — nhị phân P(vùng dễ ngập) theo vị trí.
Nhãn = **430 điểm ngập THẬT** (387 điểm trận 14/10/2022 + 43 điểm kinh niên). Đánh giá **spatial-block cross-validation**.

| Chỉ số (trung thực) | Giá trị |
|---|---|
| **ROC-AUC (spatial-CV ~3km block)** | **0.869** |
| PR-AUC | 0.699 |
| Leave-one-block-out ROC (điểm ước lượng bền) | 0.838 |
| **Baseline hình học công bằng (dist_coast-only)** | **0.780** |
| **"Giá trị ML thêm" THẬT** | **+0.09** (0.78 → 0.87), KHÔNG phải 0.48 → 0.87 |
| Feature | elevation, slope, dist_river, dist_coast (DEM Copernicus 30m + thuỷ văn) |

**Minh bạch:** phần lớn AUC đến từ hình học lấy mẫu; ML thêm ~+0.09. Presence-only pseudo-absence có bias;
1 sự kiện lũ lớn → khái quát KHÔNG GIAN không phải thời gian. Chi tiết + trả lời câu hỏi khó: **`docs/demo_script.md`**.

## Nguồn chân lý
- `ai-service/models/susceptibility_metrics.json` (số + per-fold + geometry baselines + uncertainty)
- `ai-service/models/model_card.md` (nhãn, feature, caveat, version thư viện)
- `ai-service/models/train_susceptibility.py` (script tái tạo, seed cố định)
- `plans/260716-flood-model-redesign/` (thiết kế + audit gốc)
