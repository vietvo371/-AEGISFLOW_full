---
phase: 3
title: "Train + đánh giá trung thực (Windows+conda)"
status: pending
priority: P1
effort: "1d"
dependencies: [1, 2]
---

# Phase 03: Train susceptibility model + đánh giá TRUNG THỰC

## Overview
Train mô hình nhị phân `P(dễ ngập)` trên **máy Windows 4080 (conda env `aegisflow-flood` từ Phase 02)** và đánh giá bằng **spatial cross-validation** để có con số AUC THẬT — mốc quan trọng nhất của cả plan.

## Requirements
- Functional: script train tái tạo được → `flood_susceptibility_model.pkl` + metrics + model_card.
- Non-functional: KHÔNG leakage không gian; báo cáo trung thực kèm caveat; **artifact load được trong ai-service (pip)**.

## Môi trường & phần cứng
- Train trong conda env `aegisflow-flood` (Phase 02) trên Windows. **GPU 4080 KHÔNG dùng** — RandomForest/tabular chạy CPU vài giây; đó là bình thường.
- ⚠️ **Cầu nối train↔serve (sống còn):** `.pkl` được pickle bởi `scikit-learn==1.6.0`. Production ai-service (Docker/pip) cũng phải `scikit-learn==1.6.0` + `numpy` tương thích, nếu không load lỗi/sai (đúng lỗi `lightgbm` cũ tái diễn). Ghi version thực tế vào `susceptibility_metrics.json`.

## Architecture
`labeled_points` (Phase 01) × feature từ `feature_grid`/`feature_builder` (Phase 02) → X,y. Model đơn giản (RF/XGBoost). Đánh giá spatial-block CV (giấu cụm không gian), không random split.

## Related Code Files
- Create: `ai-service/models/train_susceptibility.py` (nguồn chân lý artifact — chống lỗi "không có script train" của v4.1)
- Create output: `ai-service/models/flood_susceptibility_model.pkl`, `ai-service/models/susceptibility_metrics.json`, `ai-service/models/model_card.md`
- Import: `ai-service/services/feature_builder.py`, `ai-service/data/labeled_points.csv`, `ai-service/data/feature_grid.parquet`

## Implementation Steps
1. `conda activate aegisflow-flood`. Load `labeled_points.csv` → sinh X (qua feature_builder/lookup). Kiểm tra không NaN bất thường.
2. **Spatial block CV:** gán mỗi điểm vào block (theo quận, hoặc lưới ~2–5km). Dùng `GroupKFold`/`StratifiedGroupKFold` theo block → train/test KHÔNG chung block (chống rò rỉ không gian).
3. Model: `RandomForestClassifier` (champion) so `XGBClassifier` (challenger), nhị phân, `class_weight='balanced'`/`scale_pos_weight` — KHÔNG oversample nhân bản. Grid nhỏ, chọn theo CV (không đụng test cuối). Chọn theo **PR-AUC**.
4. Báo cáo: ROC-AUC, **PR-AUC** (quan trọng vì imbalance), reliability/calibration curve, confusion + recall trên **điểm lũ thật held-out**. So với **baseline** (chỉ elevation, hoặc rule khoảng-cách-sông) để chứng minh ML thêm giá trị.
5. SHAP feature importance (cho demo giải thích).
6. Fit lại toàn bộ dữ liệu → lưu `.pkl` (shape rõ: model + feature_names + metadata + **library versions**). Ghi `susceptibility_metrics.json` (cv scheme, n_pos, n_neg, per-fold AUC, test_samples, sklearn/numpy version) + `model_card.md` (nguồn nhãn, caveat pseudo-absence, phạm vi).
7. **Bàn giao artifact:** commit `.pkl` + `metrics.json` + `model_card.md` về repo từ máy Windows:
   ```
   git add ai-service/models/flood_susceptibility_model.pkl ai-service/models/susceptibility_metrics.json ai-service/models/model_card.md
   ```
   Sau đó smoke-test load `.pkl` trong môi trường **pip-only** khớp `requirements.txt` (giả lập ai-service) để chắc chắn không lỗi version.

## Success Criteria
- [ ] Chạy `python ai-service/models/train_susceptibility.py` trong conda env → tái tạo model + metrics (seed cố định).
- [ ] Báo cáo spatial-CV AUC/PR-AUC THẬT (dù thấp cũng ghi trung thực); có so baseline.
- [ ] `.pkl` load được trong môi trường pip `scikit-learn==1.6.0` (smoke-test giả lập production).
- [ ] `model_card.md` nêu rõ presence-only + chỉ 1 sự kiện + phạm vi + version thư viện.
- [ ] Model beat baseline elevation-only (nếu không → ghi nhận, cân nhắc feature thêm).

## Risk Assessment
- **Lệch version conda(train) vs pip(serve)** → `.pkl` load lỗi. Mitigation: ghim `scikit-learn=1.6.0` hai bên; smoke-test pip trước khi coi là xong.
- AUC có thể thấp hơn kỳ vọng (~0.7) → vẫn TRUNG THỰC và bảo vệ được; thêm feature (TWI/drainage) nếu cần.
- Overfit do positive nhỏ → model đơn giản + spatial CV + regularization.
- Baseline elevation-only đã mạnh → nhấn mạnh phần ML thêm giá trị ở đâu (SHAP).
- Cám dỗ "bật GPU cho nhanh" → vô ích với RF; đừng phí thời gian.
