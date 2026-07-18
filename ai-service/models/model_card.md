# Model Card — Flood Susceptibility (Đà Nẵng)

**Tạo:** 2026-07-18T15:56:37.126919+00:00 · **Champion:** `random_forest` · **Loại:** phân loại nhị phân P(vùng dễ ngập)

## Nhãn (KHÔNG circular)
- Positive: 430 điểm ngập THẬT (báo cáo 14/10/2022 + điểm kinh niên).
- Negative: 1075 pseudo-absence lấy mẫu theo địa hình (gồm hard negatives).

## Feature (tĩnh theo vị trí)
elevation, slope, dist_river, dist_coast

## Đánh giá TRUNG THỰC (spatial cross-validation)
- Scheme: StratifiedGroupKFold theo block ~3.0km (chống rò rỉ không gian).
- **PR-AUC:** 0.699351499325396  (±0.14088271443497843)
- **ROC-AUC:** 0.8691045338201512  (±0.02695956145320012)

## ⚠️ ĐỌC KỸ: phần lớn AUC đến từ HÌNH HỌC lấy mẫu, không phải "kỹ năng"
Negative lấy uniform toàn bbox trong khi positive co cụm ven bờ/sông → "xa bờ = an toàn" bị đóng sẵn
vào nhãn. Vì vậy phải so với **baseline hình học công bằng** (RF trên 1 feature), KHÔNG phải -elevation thô:
- Geometry baselines (RF 1-feature, cùng spatial CV): {"rf_dist_coast_only": {"roc_auc_mean": 0.7800393931663476, "pr_auc_mean": 0.5702567034676355}, "rf_dist_river_only": {"roc_auc_mean": 0.6070759761239962, "pr_auc_mean": 0.3984384222518281}, "rf_elevation_only": {"roc_auc_mean": 0.7671462419883732, "pr_auc_mean": 0.4889369074056991}}
- **"ML value-added" THẬT = champion − rf_dist_coast_only** (đa biến trên hình học), KHÔNG phải champion − (-elevation).
- `-elevation` raw-score = SÀN DƯỚI/strawman (hard-neg bị chọn theo elevation<8m → -elevation phản tương quan): ROC=0.4792212006489994.
- SHAP: {"dist_coast": 0.1908, "elevation": 0.1147, "dist_river": 0.114, "slope": 0.0862} (dist_coast áp đảo — đúng như confound).

## Độ bất định KHÔNG GIAN thật (±std 5-fold hẹp giả tạo)
{"n_blocks_with_positive": 37, "top8_positive_block_share": 0.781, "leave_one_block_out": {"pooled_roc_auc": 0.8378873490751204, "pooled_pr_auc": 0.7066077208316105, "per_block_roc_std": 0.12829959781317005, "per_block_roc_min": 0.4736842105263158, "per_block_roc_max": 1.0, "n_blocks_scored": 37}}
→ ~90% positive từ 1 trận (14/10/2022), tập trung ở ~8 block. Hiệu năng theo khu vực dao động RẤT rộng;
đừng đọc ±0.0x như khoảng tin cậy chặt.

## ACID TEST hard/easy negative (OOF) — CÓ CAVEAT
- pos vs HARD neg: {'roc_auc': 0.8313737155219038, 'pr_auc': 0.7979212753389905, 'n_pos': 430, 'n_neg': 430}
- pos vs EASY neg: {'roc_auc': 0.8867531999278889, 'pr_auc': 0.8171667892786801, 'n_pos': 430, 'n_neg': 645}
- ⚠️ hard-neg KHÔNG match theo dist_coast (xa bờ ~3x) → split này VẪN confound; -dist_coast đơn lẻ ~0.75.
  KHÔNG dùng làm bằng chứng "không confound"; xem geometry baselines.

## HẠN CHẾ (phải nêu với giám khảo)
- **Presence-only:** "không có báo cáo" ≠ "không ngập" → pseudo-absence có bias; đã giảm thiểu bằng hard negatives, báo cả PR-AUC.
- **Một sự kiện:** hiệu chỉnh theo trận 14/10/2022 → khái quát theo KHÔNG GIAN, không theo thời gian.
- Không dùng để dự báo mực nước theo giờ (thiếu chuỗi thời gian).
- **CHỐNG CIRCULAR:** đã LOẠI `historical_score` (mật độ báo cáo lịch sử) khỏi train — nó suy từ chính
  nhãn nên gây rò rỉ; model chỉ dùng feature địa hình/thuỷ văn ĐỘC LẬP (elevation, slope, dist_river, dist_coast).

## Version thư viện (để tái tạo & load .pkl)
{"python": "3.12.13", "numpy": "2.0.2", "pandas": "3.0.3", "scikit-learn": "1.6.0", "xgboost": "2.1.4"}
