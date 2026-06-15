import math
import joblib
import warnings
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

_model_cache: Optional[Dict[str, Any]] = None

BASE_FEATURES = [
    "water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score",
    "water_level_trend", "rain_6h", "soil_saturation",
]
TIME_FEATURES = ["month", "year_index", "month_sin", "month_cos", "seasonal_risk_score"]
ALL_FEATURES = BASE_FEATURES + TIME_FEATURES

# Legacy feature set (v2 model fallback)
LEGACY_BASE = ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score"]
LEGACY_ALL = LEGACY_BASE + TIME_FEATURES


def _load_model():
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    model_path = Path(__file__).parent.parent / "models" / "flood_risk_model.pkl"
    if model_path.exists():
        try:
            data = joblib.load(model_path)
            model_type = data.get("model_type", "voting")
            _model_cache = {
                "model_type": model_type,
                "label_encoder": data["label_encoder"],
                "feature_names": data["feature_names"],
                "version": data.get("version", "1.0.0"),
                "trained_at": data.get("trained_at", "unknown"),
                "model_name": data.get("metadata", {}).get("model_name", "ensemble"),
                "monthly_risk_profile": data.get("monthly_risk_profile", {}),
                "base_year": data.get("base_year", 2020),
            }
            if model_type == "stacking":
                _model_cache["base_models"] = data["base_models"]
                _model_cache["meta_model"] = data["meta_model"]
            else:
                _model_cache["model"] = data["model"]
            print(f"[AegisFlow AI] Loaded model v{_model_cache['version']} "
                  f"type={model_type} features={len(_model_cache['feature_names'])}")
            return _model_cache
        except Exception as e:
            print(f"[AegisFlow AI] Warning: Failed to load model: {e}")
            return None
    return None


def reload_model():
    """Force reload the model from disk (used after retraining)."""
    global _model_cache
    _model_cache = None
    return _load_model()


def _parse_prediction_time(prediction_time: Optional[str]) -> datetime:
    if not prediction_time:
        return datetime.now()
    try:
        return datetime.fromisoformat(prediction_time.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return datetime.now()


def extract_timeseries_features(
    recent_readings: List[Dict],
    current_water_level: float,
    rainfall_mm: float,
) -> Dict[str, float]:
    """
    Trích xuất water_level_trend, rain_6h, soil_saturation từ recent_readings.

    recent_readings: list of {"value": float, "timestamp": str, "rainfall": float (optional)}
    Sorted newest first (index 0 = most recent).
    """
    if not recent_readings or len(recent_readings) < 2:
        return {
            "water_level_trend": 0.0,
            "rain_6h": min(rainfall_mm * 2, 500.0),  # rough estimate
            "soil_saturation": 0.0,
        }

    # Extract water level values (newest first)
    wl_values = []
    for r in recent_readings[:12]:  # max 12 readings
        try:
            wl_values.append(float(r.get("value") or r.get("water_level") or current_water_level))
        except (TypeError, ValueError):
            wl_values.append(current_water_level)

    # Water level trend: slope from oldest to newest reading (m/h)
    if len(wl_values) >= 2:
        newest = wl_values[0]
        oldest = wl_values[-1]
        n_hours = max(1, len(wl_values) - 1)
        trend = (newest - oldest) / n_hours
        trend = float(max(-1.0, min(1.5, trend)))
    else:
        trend = 0.0

    # 6h cumulative rainfall from readings
    rain_values = []
    for r in recent_readings[:6]:
        try:
            val = float(r.get("rainfall") or r.get("rainfall_mm") or 0.0)
            rain_values.append(val)
        except (TypeError, ValueError):
            rain_values.append(0.0)

    rain_6h = sum(rain_values) if rain_values else rainfall_mm
    rain_6h = float(min(rain_6h, 500.0))

    # Soil saturation: proxy from extended rain history (readings 6-24h back)
    extended_rain = []
    for r in recent_readings[6:24]:
        try:
            val = float(r.get("rainfall") or r.get("rainfall_mm") or 0.0)
            extended_rain.append(val)
        except (TypeError, ValueError):
            extended_rain.append(0.0)

    # If no extended rain history, estimate from current conditions
    if not extended_rain:
        # Rough estimate: if it's been raining heavily for 6h, soil is moderately saturated
        soil_saturation = min(100.0, rain_6h * 0.5 + trend * 15)
    else:
        # 3-day equivalent proxy: saturate based on past 18h rain
        past_18h_rain = sum(extended_rain)
        soil_saturation = min(100.0, (rain_6h * 0.6 + past_18h_rain * 0.3))

    soil_saturation = float(max(0.0, soil_saturation))

    return {
        "water_level_trend": trend,
        "rain_6h": rain_6h,
        "soil_saturation": soil_saturation,
    }


def _ml_predict(
    water_level_m: float,
    rainfall_mm: float,
    hours_rain: int,
    tide_level: float,
    historical_score: float,
    water_level_trend: float = 0.0,
    rain_6h: float = 0.0,
    soil_saturation: float = 0.0,
    prediction_time: Optional[str] = None,
    seasonality_enabled: bool = True,
) -> Optional[Dict[str, Any]]:
    model_data = _load_model()
    if model_data is None:
        return None

    le = model_data["label_encoder"]
    feature_names = model_data.get("feature_names") or LEGACY_ALL

    feature_values = {
        "water_level_m": float(water_level_m),
        "rainfall_mm": float(rainfall_mm),
        "hours_rain": float(hours_rain),
        "tide_level": float(tide_level),
        "historical_score": float(historical_score),
        "water_level_trend": float(water_level_trend),
        "rain_6h": float(rain_6h),
        "soil_saturation": float(soil_saturation),
    }

    if any(name in feature_names for name in TIME_FEATURES):
        dt = _parse_prediction_time(prediction_time)
        month = float(dt.month)
        monthly_profile = model_data.get("monthly_risk_profile") or {}
        monthly_scores = [float(v) for v in monthly_profile.values()] or [25.0]
        mean_score = sum(monthly_scores) / len(monthly_scores)
        seasonal_risk_score = float(
            monthly_profile.get(str(dt.month), monthly_profile.get(dt.month, mean_score))
        )
        if not seasonality_enabled:
            seasonal_risk_score = mean_score
        seasonal_risk_score_val = seasonal_risk_score
        feature_values.update({
            "month": month,
            "year_index": float(dt.year - int(model_data.get("base_year", 2020))),
            "month_sin": math.sin(2 * math.pi * month / 12) if seasonality_enabled else 0.0,
            "month_cos": math.cos(2 * math.pi * month / 12) if seasonality_enabled else 0.0,
            "seasonal_risk_score": seasonal_risk_score_val,
            # v4 interaction features
            "rain_x_tide": float(rainfall_mm) * float(tide_level),
            "water_x_saturation": float(water_level_m) * float(soil_saturation),
            "rain_x_season": float(rainfall_mm) * seasonal_risk_score_val / 100.0,
            "trend_x_rain6h": float(water_level_trend) * float(rain_6h),
            "cumulative_stress": (
                float(water_level_m) * 0.3 +
                float(rainfall_mm) / 300 * 0.25 +
                float(soil_saturation) * 0.2 +
                float(tide_level) / 2 * 0.15 +
                seasonal_risk_score_val / 100 * 0.1
            ),
        })

    # Build feature vector in the exact order the model was trained with
    try:
        features = [[feature_values[name] for name in feature_names]]
    except KeyError as e:
        # Legacy model missing new features — fill with 0
        safe_values = {k: feature_values.get(k, 0.0) for k in feature_names}
        features = [[safe_values[name] for name in feature_names]]

    df_features = pd.DataFrame(features, columns=feature_names)
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore")
        if model_data.get("model_type") == "stacking":
            base_models = model_data["base_models"]
            meta_model = model_data["meta_model"]
            import numpy as np
            meta_input = np.hstack([m.predict_proba(df_features) for _, m in base_models])
            pred_encoded = meta_model.predict(meta_input)[0]
            probas = meta_model.predict_proba(meta_input)[0]
        else:
            model = model_data["model"]
            pred_encoded = model.predict(df_features)[0]
            probas = model.predict_proba(df_features)[0]

    pred_label = le.inverse_transform([pred_encoded])[0]
    confidence = float(probas[pred_encoded])

    # Risk score: weighted sum of class probabilities
    class_scores = {"critical": 92, "high": 72, "medium": 45, "low": 12}
    risk_score = sum(
        class_scores.get(le.inverse_transform([i])[0], 50) * float(p)
        for i, p in enumerate(probas)
    )
    risk_score = float(min(100, max(0, risk_score)))

    return {
        "risk_score": round(risk_score, 2),
        "risk_level": pred_label,
        "confidence": round(confidence, 4),
        "probability": round(confidence, 4),
        "model_version": model_data["version"],
        "prediction_method": model_data["model_name"],
        "timeseries_features": {
            "water_level_trend": round(water_level_trend, 4),
            "rain_6h": round(rain_6h, 2),
            "soil_saturation": round(soil_saturation, 1),
        },
        "seasonality": {
            "enabled": seasonality_enabled,
            "month": _parse_prediction_time(prediction_time).month,
            "seasonal_risk_score": feature_values.get("seasonal_risk_score"),
        },
    }


def classify_risk(score: float) -> str:
    if score >= 75: return 'critical'
    elif score >= 50: return 'high'
    elif score >= 25: return 'medium'
    else: return 'low'


def calculate_flood_risk(
    water_level_m: float,
    rainfall_mm: float,
    hours_rain: int,
    tide_level: float = 0.0,
    historical_score: float = 0.0,
    water_level_trend: float = 0.0,
    rain_6h: float = 0.0,
    soil_saturation: float = 0.0,
    prediction_time: Optional[str] = None,
    seasonality_enabled: bool = True,
) -> Dict[str, Any]:
    """
    Tính toán rủi ro lũ toàn diện.
    Ưu tiên dùng ML model, fallback sang rule-based nếu model không có.

    Features mới (v3):
    - water_level_trend: tốc độ thay đổi mực nước (m/h), dương = đang dâng
    - rain_6h: lượng mưa tích lũy 6 giờ qua (mm)
    - soil_saturation: độ bão hòa đất (0-100)
    """
    ml_result = _ml_predict(
        water_level_m, rainfall_mm, hours_rain, tide_level, historical_score,
        water_level_trend, rain_6h, soil_saturation,
        prediction_time, seasonality_enabled,
    )

    # Rule-based contributing factors (always computed for transparency)
    water_score = min(1.0, max(0, water_level_m) / 5.0) * 35
    rainfall_score = min(1.0, max(0, rainfall_mm) / 200.0) * 25
    duration_score = min(1.0, max(0, hours_rain) / 48.0) * 12
    tide_score = min(1.0, max(0, tide_level) / 3.0) * 8
    history_score = min(1.0, max(0, historical_score) / 100.0) * 5
    trend_score = min(1.0, max(0, water_level_trend) / 0.5) * 8
    rain6h_score = min(1.0, max(0, rain_6h) / 100.0) * 5
    soil_score = min(1.0, max(0, soil_saturation) / 100.0) * 2

    contributing = {
        "water_level": round(water_score, 1),
        "rainfall": round(rainfall_score, 1),
        "duration": round(duration_score, 1),
        "tide": round(tide_score, 1),
        "history": round(history_score, 1),
        "rising_trend": round(trend_score, 1),
        "rain_6h_accum": round(rain6h_score, 1),
        "soil_saturation": round(soil_score, 1),
    }

    if ml_result is not None:
        ml_result["contributing_factors"] = contributing
        ml_result["risk_level"] = classify_risk(ml_result["risk_score"])
        return ml_result

    # Fallback rule-based
    total = water_score + rainfall_score + duration_score + tide_score + history_score + \
            trend_score + rain6h_score + soil_score
    confidence = 0.85 if (water_level_m > 0 or rainfall_mm > 0) else 0.5

    return {
        "risk_score": round(min(100, total), 2),
        "risk_level": classify_risk(total),
        "confidence": confidence,
        "probability": round(min(1.0, total / 100.0), 4),
        "prediction_method": "rule_based",
        "model_version": None,
        "contributing_factors": contributing,
        "timeseries_features": {
            "water_level_trend": round(water_level_trend, 4),
            "rain_6h": round(rain_6h, 2),
            "soil_saturation": round(soil_saturation, 1),
        },
    }
