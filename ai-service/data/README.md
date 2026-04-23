# AegisFlow AI — Flood Risk Dataset

## Tổng quan

Dataset này được sử dụng để train RandomForest model cho dự báo ngập lụt tại Đà Nẵng, Việt Nam.

## Nguồn dữ liệu

### 1. Water Stations (Trạm đo mực nước)
- **Nguồn:** muangap.danang.gov.vn API (crawl ngày ~2024)
- **Số lượng:** 95 trạm
- **License:** Public government data
- **File:** `water_stations_all.json`

### 2. Rain Stations (Trạm đo mưa)
- **Nguồn:** muangap.danang.gov.vn API
- **Số lượng:** 82 trạm
- **License:** Public government data
- **File:** `rain_stations.json`

### 3. Flood Reports (Báo cáo ngập lụt)
- **Nguồn:** muangap.danang.gov.vn API (2022)
- **Số lượng:** Nhiều báo cáo với polygon flood zones
- **License:** Public government data
- **File:** `flood_reports_2022_all.json`

## Tạo Dataset huấn luyện

Script `preprocessing.py` tạo `flood_danang_2019_2024.csv` bằng cách:
1. Parse dữ liệu thực từ water/rain stations
2. Sinh synthetic data dựa trên ngưỡng VNMHA (Viet Nam Hydrology Administration)
3. Label dữ liệu theo mức độ ngập (low/medium/high/critical)

## Cấu trúc Dataset

| Column | Mô tả | Đơn vị |
|--------|-------|---------|
| water_level_m | Mực nước đo được | mét |
| rainfall_mm | Lượng mưa tích lũy | mm |
| hours_rain | Thời gian mưa liên tục | giờ |
| tide_level | Mực nước triều | mét |
| historical_score | Điểm lịch sử ngập khu vực | 0-100 |
| risk_level | Nhãn (low/medium/high/critical) | categorical |

## Ngưỡng VNMHA cho Đà Nẵng

- **Nguy hiểm (High):** water_level > 3.0m, rainfall > 150mm/24h
- **Cảnh báo (Medium):** water_level 1.5-3.0m, rainfall 50-150mm/24h
- **Theo dõi (Low):** water_level 0.5-1.5m, rainfall 20-50mm/24h

## Giấy phép

Dataset được tạo từ dữ liệu công cộng của chính quyền Đà Nẵng.
Model và code: MIT License.

## Ghi chú

Do hạn chế về dữ liệu lịch sử có nhãn (labeled flood events), dataset sử dụng:
- **Synthetic data generation** dựa trên physics-based thresholds
- **VNMHA flood thresholds** làm ground truth proxy
- **Rule-based labels** cho training validation

Điều này phù hợp với giai đoạn hackathon và được document trong pitch deck (Slide 10: Hurdle 1).
