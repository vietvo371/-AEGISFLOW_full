from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import time

from services.flood_calculator import calculate_flood_risk
from services.priority_calculator import calculate_rescue_priority
from services.shelter_calculator import calculate_shelter_score
from services.route_optimizer import calculate_optimal_route
from services.performance import (
    get_flood_risk_cache, get_prediction_cache, get_route_cache,
    get_performance_monitor
)

router = APIRouter()

# Performance monitoring
monitor = get_performance_monitor()

# Caches
flood_risk_cache = get_flood_risk_cache()
priority_cache = get_prediction_cache()
route_cache = get_route_cache()

def classify_hybrid_risk(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 40:
        return "medium"
    return "low"

class FloodPredictionRequest(BaseModel):
    water_level_m: float
    rainfall_mm: float
    hours_rain: int
    tide_level: Optional[float] = 0.0
    historical_score: Optional[float] = 0.0

class FloodZonePredictionTarget(BaseModel):
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    alert_threshold_m: Optional[float] = 1.5
    danger_threshold_m: Optional[float] = 3.0
    current_water_level_m: Optional[float] = 0.0
    recent_readings: Optional[List[Dict]] = None
    weather: Optional[Dict] = None

class BatchFloodPredictionRequest(BaseModel):
    input_data: List[FloodZonePredictionTarget]
    horizon_minutes: Optional[int] = 60

class RescuePriorityRequest(BaseModel):
    urgency: str
    vulnerable_groups: List[str]
    people_count: int
    water_level_m: Optional[float] = None
    created_at_iso: str
    has_incident: Optional[bool] = False

class ShelterScoreRequest(BaseModel):
    shelter_lat: float
    shelter_lon: float
    request_lat: float
    request_lon: float
    shelter_capacity: int
    shelter_occupancy: int
    people_count: int
    shelter_facilities: List[str]
    request_category: str

class EvacuationRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    flooded_areas: Optional[List[Dict[str, Any]]] = None

@router.post("/predict-risk")
async def predict_risk(request: FloodPredictionRequest):
    start = time.time()

    # Generate cache key
    cache_key = f"{request.water_level_m}:{request.rainfall_mm}:{request.hours_rain}:{request.tide_level}:{request.historical_score}"

    # Try cache
    cached_result = flood_risk_cache.get(cache_key)
    if cached_result:
        cached_result["cached"] = True
        return cached_result

    result = calculate_flood_risk(
        water_level_m=request.water_level_m,
        rainfall_mm=request.rainfall_mm,
        hours_rain=request.hours_rain,
        tide_level=request.tide_level,
        historical_score=request.historical_score
    )

    # Cache result for 60 seconds
    flood_risk_cache.set(cache_key, result, ttl_seconds=60)

    elapsed = (time.time() - start) * 1000
    monitor.record("predict_risk_ms", elapsed)
    result["processing_time_ms"] = round(elapsed, 2)
    result["cached"] = False

    return result

@router.post("/predict/flood")
async def predict_flood_batch(request: BatchFloodPredictionRequest):
    """
    Batch flood nowcasting endpoint used by the Laravel prediction job.
    Produces 30-minute to 1-hour style predictions from seeded or live
    water-level/weather inputs.
    """
    start = time.time()
    horizon_minutes = max(15, min(int(request.horizon_minutes or 60), 1440))
    horizon_hours = max(0.25, horizon_minutes / 60)
    results = []

    for target in request.input_data:
        weather = target.weather or {}
        rainfall_mm = float(weather.get("rainfall_mm") or 0.0)
        water_level_m = float(target.current_water_level_m or 0.0)
        alert_threshold_m = float(target.alert_threshold_m or 1.5)
        danger_threshold_m = float(target.danger_threshold_m or 3.0)
        recent_readings = target.recent_readings or []

        reading_count = len(recent_readings)
        hours_rain = max(1, min(24, int(round(horizon_hours + (rainfall_mm / 25)))))
        historical_score = 65.0 if water_level_m >= alert_threshold_m else 35.0
        tide_level = float(weather.get("tide_level") or weather.get("tide_level_m") or 0.0)

        predicted_water_level = water_level_m + (rainfall_mm / 140.0) * horizon_hours
        if reading_count >= 2:
            try:
                latest = float(recent_readings[0].get("value") or water_level_m)
                oldest = float(recent_readings[-1].get("value") or latest)
                trend = max(-0.25, min(0.45, latest - oldest))
                predicted_water_level += trend * horizon_hours
            except (TypeError, ValueError):
                pass

        threshold_span = max(0.1, danger_threshold_m - alert_threshold_m)
        historical_score += max(0.0, min(25.0, ((water_level_m - alert_threshold_m) / threshold_span) * 25.0))
        historical_score = max(0.0, min(100.0, historical_score))

        risk_result = calculate_flood_risk(
            water_level_m=predicted_water_level,
            rainfall_mm=rainfall_mm,
            hours_rain=hours_rain,
            tide_level=tide_level,
            historical_score=historical_score,
        )

        threshold_span = max(0.1, danger_threshold_m - alert_threshold_m)
        water_pressure = 0.0
        if predicted_water_level >= danger_threshold_m:
            water_pressure = 90.0 + min(10.0, (predicted_water_level - danger_threshold_m) * 5.0)
        elif predicted_water_level >= alert_threshold_m:
            water_pressure = 45.0 + min(35.0, ((predicted_water_level - alert_threshold_m) / threshold_span) * 35.0)
        else:
            water_pressure = min(35.0, (predicted_water_level / max(0.1, alert_threshold_m)) * 35.0)

        rain_pressure = min(100.0, (rainfall_mm / 150.0) * 100.0)
        model_score = float(risk_result.get("risk_score") or 0.0)
        hybrid_score = max(
            model_score,
            (water_pressure * 0.52) + (rain_pressure * 0.32) + (historical_score * 0.16)
        )
        hybrid_score = max(0.0, min(100.0, hybrid_score))
        hybrid_level = classify_hybrid_risk(hybrid_score)

        risk_factors = []
        if predicted_water_level >= danger_threshold_m:
            risk_factors.append("Mực nước dự kiến vượt ngưỡng nguy hiểm")
        elif predicted_water_level >= alert_threshold_m:
            risk_factors.append("Mực nước dự kiến vượt ngưỡng cảnh báo")
        if rainfall_mm >= 80:
            risk_factors.append("Mưa lớn trong dữ liệu thời tiết gần nhất")
        if reading_count == 0:
            risk_factors.append("Thiếu dữ liệu cảm biến gần đây")
        if risk_result.get("prediction_method") == "random_forest":
            risk_factors.append("Dự báo bằng mô hình RandomForest đã huấn luyện")
        else:
            risk_factors.append("Dự báo bằng cơ chế rule-based fail-safe")

        results.append({
            "zone_id": target.zone_id,
            "zone_name": target.zone_name,
            "type": "flood_risk",
            "horizon_minutes": horizon_minutes,
            "predicted_value": round(predicted_water_level, 2),
            "risk_score": round(hybrid_score, 2),
            "risk_level": hybrid_level,
            "confidence": risk_result.get("confidence"),
            "probability": round(hybrid_score / 100.0, 4),
            "prediction_method": f"hybrid_{risk_result.get('prediction_method', 'rule_based')}",
            "model_version": risk_result.get("model_version"),
            "contributing_factors": risk_result.get("contributing_factors", {}),
            "risk_factors": risk_factors,
        })

    elapsed = (time.time() - start) * 1000
    monitor.record("predict_flood_batch_ms", elapsed)

    return {
        "results": results,
        "horizon_minutes": horizon_minutes,
        "processing_time_ms": round(elapsed, 2),
        "generated_at": datetime.utcnow().isoformat(),
    }

@router.post("/calculate-priority")
async def calculate_priority(request: RescuePriorityRequest):
    return calculate_rescue_priority(
        urgency=request.urgency,
        vulnerable_groups=request.vulnerable_groups,
        people_count=request.people_count,
        water_level_m=request.water_level_m,
        created_at_iso=request.created_at_iso,
        has_incident=request.has_incident
    )

@router.post("/score-shelter")
async def score_shelter(request: ShelterScoreRequest):
    return calculate_shelter_score(
        shelter_lat=request.shelter_lat,
        shelter_lon=request.shelter_lon,
        request_lat=request.request_lat,
        request_lon=request.request_lon,
        shelter_capacity=request.shelter_capacity,
        shelter_occupancy=request.shelter_occupancy,
        people_count=request.people_count,
        shelter_facilities=request.shelter_facilities,
        request_category=request.request_category
    )

@router.post("/optimize-route")
async def optimize_route(request: EvacuationRequest):
    start = time.time()

    # Generate cache key
    cache_key = f"{request.start_lat}:{request.start_lon}:{request.end_lat}:{request.end_lon}:{request.flooded_areas or []}"

    # Try cache
    cached_result = route_cache.get(cache_key)
    if cached_result:
        cached_result["cached"] = True
        return cached_result

    result = calculate_optimal_route(
        start_lat=request.start_lat,
        start_lon=request.start_lon,
        end_lat=request.end_lat,
        end_lon=request.end_lon,
        flooded_areas=request.flooded_areas
    )

    # Cache for 10 minutes
    route_cache.set(cache_key, result, ttl_seconds=600)

    elapsed = (time.time() - start) * 1000
    monitor.record("optimize_route_ms", elapsed)
    result["processing_time_ms"] = round(elapsed, 2)
    result["cached"] = False

    return result


@router.get("/cache-stats")
async def get_cache_stats():
    """Get cache performance statistics."""
    return {
        "flood_risk_cache": flood_risk_cache.stats(),
        "priority_cache": priority_cache.stats(),
        "route_cache": route_cache.stats(),
        "performance": monitor.get_all_stats(),
    }


@router.post("/cache/clear")
async def clear_caches():
    """Clear all caches."""
    flood_risk_cache.clear()
    priority_cache.clear()
    route_cache.clear()
    return {"status": "cleared"}
