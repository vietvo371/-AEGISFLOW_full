# AegisFlow AI Models

## Current Runtime

The FastAPI service exposes:

- `POST /api/predict-risk`
- `POST /api/calculate-priority`
- `POST /api/score-shelter`
- `POST /api/optimize-route`
- `POST /api/alerts/generate`

The flood-risk endpoint tries to load `models/flood_risk_model.pkl`. If the trained model file is unavailable, it falls back to transparent rule-based scoring so the demo remains operational.

## Flood Risk Classifier

Metrics are stored in `models/model_metrics.json`.

| Metric | Value |
| --- | ---: |
| Algorithm | Soft-voting ensemble |
| Version | 2.1.0 |
| Dataset size | 3,000 samples |
| Accuracy | 97.83% |
| Balanced accuracy | 88.93% |
| Weighted F1 | 97.71% |
| Macro F1 | 90.49% |
| AUC-ROC | 99.90% |
| Cross-validation | 5 folds |
| CV F1 mean/std | 98.00% +/- 0.43% |

## Features

The runtime feature vector is:

- `water_level_m`
- `rainfall_mm`
- `hours_rain`
- `tide_level`
- `historical_score`
- `month`
- `year_index`
- `month_sin`
- `month_cos`
- `seasonal_risk_score`

## Seasonal Forecasting

Version 2.1.0 adds historical month/year features. The training data generator now creates stronger rainy-season samples for Da Nang, especially Sep-Dec, and the training pipeline stores a `monthly_risk_profile` in the model artifact. At runtime, `/api/predict-risk` accepts `prediction_time`; if omitted, the AI service uses the current date.

## Why Ensemble

The pipeline evaluates RandomForest, ExtraTrees, XGBoost, a scaled MLP, and a soft-voting ensemble. The current selected model is the ensemble because it stayed competitive with the best individual model while blending tree-based thresholds, boosted trees, and neural-network behavior.

## Data Quality Note

The current dataset is mostly synthetic/proxy-labeled from Da Nang flood thresholds. These metrics validate the training pipeline and demo behavior, but they are not a guarantee of real-world flood accuracy. For production-grade accuracy, the next training phase should add real historical flood observations, sensor time series, rainfall forecasts, tide history, drainage capacity, and verified incident outcomes.

## Fail-Safe Behavior

If model loading fails, `services/flood_calculator.py` calculates risk with weighted thresholds:

- Water level: 40%
- Rainfall: 30%
- Rain duration: 15%
- Tide level: 10%
- Historical score: 5%

This keeps the product usable during model file issues and supports human-in-the-loop review.

## Local Test

```bash
curl -s -X POST http://localhost:5005/api/predict-risk \
  -H 'Content-Type: application/json' \
  -d '{"water_level_m":2.4,"rainfall_mm":120,"hours_rain":6,"tide_level":0.8,"historical_score":70}'
```
