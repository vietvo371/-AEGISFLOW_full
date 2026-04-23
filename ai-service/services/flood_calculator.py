import math
import joblib
import os
from pathlib import Path
from typing import Dict, Any, Optional

# Lazy-load model to avoid startup delays
_model_cache: Optional[Dict[str, Any]] = None

def _load_model():
    """Load trained model and label encoder at first use."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    
    # Try to load trained model
    model_path = Path(__file__).parent.parent / "models" / "flood_risk_model.pkl"
    if model_path.exists():
        try:
            data = joblib.load(model_path)
            _model_cache = {
                "model": data["model"],
                "label_encoder": data["label_encoder"],
                "feature_names": data["feature_names"],
                "version": data.get("version", "1.0.0"),
                "trained_at": data.get("trained_at", "unknown"),
            }
            print(f"[AegisFlow AI] Loaded trained model v{_model_cache['version']}")
            return _model_cache
        except Exception as e:
            print(f"[AegisFlow AI] Warning: Failed to load model: {e}")
            return None
    return None


def _ml_predict(
    water_level_m: float,
    rainfall_mm: float,
    hours_rain: int,
    tide_level: float,
    historical_score: float
) -> Optional[Dict[str, Any]]:
    """Use trained RandomForest model for prediction."""
    model_data = _load_model()
    if model_data is None:
        return None
    
    model = model_data["model"]
    le = model_data["label_encoder"]
    
    features = [[
        float(water_level_m),
        float(rainfall_mm),
        float(hours_rain),
        float(tide_level),
        float(historical_score)
    ]]
    
    pred_encoded = model.predict(features)[0]
    pred_label = le.inverse_transform([pred_encoded])[0]
    probas = model.predict_proba(features)[0]
    
    # Compute risk score from probabilities
    # Map probabilities to 0-100 scale based on class order
    # Classes: critical=0, high=1, low=2, medium=3 (from training)
    class_risk = {"critical": 90, "high": 70, "medium": 45, "low": 15}
    risk_score = class_risk.get(pred_label, 50)
    
    # Weighted by confidence
    confidence = float(probas[pred_encoded])
    adjusted_score = risk_score * confidence + risk_score * (1 - confidence) * 0.5
    risk_score = min(100, max(0, adjusted_score))
    
    return {
        "risk_score": round(risk_score, 2),
        "risk_level": pred_label,
        "confidence": round(confidence, 4),
        "probability": round(probas[pred_encoded], 4),
        "model_version": model_data["version"],
        "prediction_method": "random_forest",
        "contributing_factors": {
            "predicted_class": pred_label,
        }
    }


def classify_risk(score: float) -> str:
    """Classify risk level based on score (0-100)"""
    if score >= 75: return 'critical'
    elif score >= 50: return 'high'
    elif score >= 25: return 'medium'
    else: return 'low'

def calculate_flood_risk(
    water_level_m: float,
    rainfall_mm: float,
    hours_rain: int,
    tide_level: float = 0.0,
    historical_score: float = 0.0
) -> Dict[str, Any]:
    """
    Calculate comprehensive flood risk score.
    Uses trained RandomForest model if available, falls back to rule-based scoring.
    Weights: Water Level (40%), Rainfall (30%), Duration (15%), Tide (10%), History (5%)
    """
    # Try ML model first
    ml_result = _ml_predict(water_level_m, rainfall_mm, hours_rain, tide_level, historical_score)
    
    if ml_result is not None:
        # Add rule-based contributing factors for transparency
        water_score = min(1.0, max(0, water_level_m) / 5.0) * 40
        rainfall_score = min(1.0, max(0, rainfall_mm) / 200.0) * 30
        duration_score = min(1.0, max(0, hours_rain) / 48.0) * 15
        tide_score = min(1.0, max(0, tide_level) / 3.0) * 10
        history_score = min(1.0, max(0, historical_score) / 100.0) * 5
        
        ml_result["contributing_factors"] = {
            "water_level": round(water_score, 1),
            "rainfall": round(rainfall_score, 1),
            "duration": round(duration_score, 1),
            "tide": round(tide_score, 1),
            "history": round(history_score, 1)
        }
        ml_result["risk_level"] = classify_risk(ml_result["risk_score"])
        return ml_result
    
    # Fallback to rule-based scoring
    water_score = min(1.0, max(0, water_level_m) / 5.0) * 40
    rainfall_score = min(1.0, max(0, rainfall_mm) / 200.0) * 30
    duration_score = min(1.0, max(0, hours_rain) / 48.0) * 15
    tide_score = min(1.0, max(0, tide_level) / 3.0) * 10
    history_score = min(1.0, max(0, historical_score) / 100.0) * 5
    
    total = water_score + rainfall_score + duration_score + tide_score + history_score
    
    confidence = 0.85
    if water_level_m <= 0 and rainfall_mm <= 0:
        confidence = 0.5
    
    return {
        'risk_score': round(total, 2),
        'risk_level': classify_risk(total),
        'confidence': confidence,
        'probability': round(total / 100.0, 4),
        'prediction_method': 'rule_based',
        'contributing_factors': {
            'water_level': round(water_score, 1),
            'rainfall': round(rainfall_score, 1),
            'duration': round(duration_score, 1),
            'tide': round(tide_score, 1),
            'history': round(history_score, 1)
        }
    }
