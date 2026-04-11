import math
from typing import Dict, Any

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
    Weights: Water Level (40%), Rainfall (30%), Duration (15%), Tide (10%), History (5%)
    """
    # 1. Water level score (max 40)
    water_score = min(1.0, max(0, water_level_m) / 5.0) * 40
    
    # 2. Rainfall score (max 30)
    rainfall_score = min(1.0, max(0, rainfall_mm) / 200.0) * 30
    
    # 3. Rain duration score (max 15)
    duration_score = min(1.0, max(0, hours_rain) / 48.0) * 15
    
    # 4. Tide level score (max 10)
    tide_score = min(1.0, max(0, tide_level) / 3.0) * 10
    
    # 5. History score (max 5)
    history_score = min(1.0, max(0, historical_score) / 100.0) * 5
    
    total = water_score + rainfall_score + duration_score + tide_score + history_score
    
    # Calculate confidence based on data completeness and values
    confidence = 0.85
    if water_level_m <= 0 and rainfall_mm <= 0:
        confidence = 0.5
    
    return {
        'risk_score': round(total, 2),
        'risk_level': classify_risk(total),
        'confidence': confidence,
        'probability': round(total / 100.0, 4),
        'contributing_factors': {
            'water_level': round(water_score, 1),
            'rainfall': round(rainfall_score, 1),
            'duration': round(duration_score, 1),
            'tide': round(tide_score, 1),
            'history': round(history_score, 1)
        }
    }
