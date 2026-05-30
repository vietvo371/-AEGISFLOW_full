# Data Sources - AegisFlow AI

## Purpose

AegisFlow AI combines seeded demo data, public hydrology-style records, weather inputs, and synthetic training samples to demonstrate a real-time flood early warning workflow for Da Nang.

## Runtime Demo Data

The local demo is seeded through Laravel:

```bash
cd backend
php artisan migrate --seed
```

The seeders create:

- 93 real-style sensor stations and 82 rain stations from `RealDataSeeder`
- 392 flood reports for the October 14, 2022 flood scenario
- 5 demo sensors with recent water/rain readings
- 3 active demo flood zones: An Khe, Hoa Khanh, Tuy Loan
- 3 active incidents, 3 AI predictions, 3 rescue requests, 3 alerts, and 3 recommendations

## Source Categories

| Category | Source | Use |
| --- | --- | --- |
| Water level and flood reports | Da Nang public flood monitoring style data (`muangap.danang.gov.vn` attribution in seeders) | Sensor map, incident history, flood report demo |
| Rainfall and weather context | Weather station style data and OpenWeather-compatible fields | Rain intensity, risk scoring, dashboard context |
| GIS boundaries | Da Nang district/flood-zone polygons in local seeders | Map layers and geographic filtering |
| Synthetic ML dataset | `ai-service/models/model_metrics.json` and training pipeline notes | RandomForest flood-risk classifier evaluation |
| User-generated emergency data | Demo rescue requests and incidents | Dispatch, priority scoring, operator workflow |

## Synthetic Data Disclosure

The current model metrics are based on a 3,000-sample synthetic dataset shaped around hydrology thresholds and Da Nang flood scenarios. This is suitable for hackathon and product demonstration, but production deployment requires validation with official long-term sensor archives and post-event labels.

## Data Quality Controls

- Demo seeders are idempotent, so they can be run repeatedly without duplicate-key failures.
- Sensor readings include quality scores.
- AI predictions retain input features for operator review.
- Rescue requests separate personal data from flood-zone analytics.

## Privacy Notes

Citizen GPS or phone information is only used in rescue-request workflows. The AI model does not require personally identifiable information for flood-risk prediction.

## Production Gaps

- Replace synthetic labels with verified flood-event labels from official agencies.
- Add formal data-sharing agreements for station feeds.
- Track missing sensor intervals and outlier handling in a data quality dashboard.
- Version datasets alongside model versions.
