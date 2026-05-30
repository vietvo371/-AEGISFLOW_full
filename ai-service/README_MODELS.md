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
| Algorithm | RandomForestClassifier |
| Dataset size | 3,000 samples |
| Accuracy | 98.83% |
| Weighted F1 | 98.86% |
| Macro F1 | 97.50% |
| AUC-ROC | 99.96% |
| Cross-validation | 5 folds |
| CV F1 mean/std | 98.86% +/- 0.38% |

## Features

| Feature | Importance |
| --- | ---: |
| `water_level_m` | 36.34% |
| `rainfall_mm` | 32.02% |
| `historical_score` | 15.55% |
| `tide_level` | 8.09% |
| `hours_rain` | 8.00% |

## Why RandomForest

RandomForest is a good fit for the demo and early pilot because it is fast, interpretable, and robust on smaller tabular datasets. Operators can inspect feature importance and confidence before approving alerts or dispatch recommendations.

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
