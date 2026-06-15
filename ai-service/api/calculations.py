from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import time

from services.flood_calculator import calculate_flood_risk, extract_timeseries_features, reload_model
from services.priority_calculator import calculate_rescue_priority
from services.shelter_calculator import calculate_shelter_score
from services.route_optimizer import calculate_optimal_route
from services.lstm_forecaster import forecast_flood_risk, reload_lstm
from services.weather_fetcher import get_danang_weather
from services.graph_flood_predictor import predict_flood_spread, identify_seed_nodes_from_stations
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
    prediction_time: Optional[str] = None
    seasonality_enabled: Optional[bool] = True

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
    seasonality_enabled: Optional[bool] = True

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
    cache_key = (
        f"{request.water_level_m}:{request.rainfall_mm}:{request.hours_rain}:"
        f"{request.tide_level}:{request.historical_score}:{request.prediction_time}:"
        f"{request.seasonality_enabled}"
    )

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
        historical_score=request.historical_score,
        prediction_time=request.prediction_time,
        seasonality_enabled=bool(request.seasonality_enabled),
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
        tide_level = float(weather.get("tide_level") or weather.get("tide_level_m") or 0.0)

        # Extract time-series features from sensor readings
        ts_features = extract_timeseries_features(recent_readings, water_level_m, rainfall_mm)
        water_level_trend = ts_features["water_level_trend"]
        rain_6h = ts_features["rain_6h"]
        soil_saturation = ts_features["soil_saturation"]

        # Predict future water level using trend + rainfall runoff
        predicted_water_level = water_level_m + water_level_trend * horizon_hours + (rainfall_mm / 140.0) * horizon_hours
        predicted_water_level = max(0.0, predicted_water_level)

        # hours_rain: estimate from horizon and rainfall intensity
        hours_rain = max(1, min(48, int(round(horizon_hours + (rain_6h / 20)))))

        # historical_score: based on zone thresholds and current level
        threshold_span = max(0.1, danger_threshold_m - alert_threshold_m)
        historical_score = 65.0 if water_level_m >= alert_threshold_m else 35.0
        historical_score += max(0.0, min(25.0, ((water_level_m - alert_threshold_m) / threshold_span) * 25.0))
        historical_score = max(0.0, min(100.0, historical_score))

        risk_result = calculate_flood_risk(
            water_level_m=predicted_water_level,
            rainfall_mm=rainfall_mm,
            hours_rain=hours_rain,
            tide_level=tide_level,
            historical_score=historical_score,
            water_level_trend=water_level_trend,
            rain_6h=rain_6h,
            soil_saturation=soil_saturation,
            prediction_time=datetime.utcnow().isoformat(),
            seasonality_enabled=bool(request.seasonality_enabled),
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
        if water_level_trend >= 0.2:
            risk_factors.append(f"Mực nước đang dâng nhanh ({water_level_trend:+.2f} m/h)")
        elif water_level_trend <= -0.1:
            risk_factors.append(f"Mực nước đang rút ({water_level_trend:+.2f} m/h)")
        if rain_6h >= 50:
            risk_factors.append(f"Mưa tích lũy 6h: {rain_6h:.0f}mm")
        if soil_saturation >= 70:
            risk_factors.append(f"Đất đã bão hòa ({soil_saturation:.0f}%) — khả năng thấm kém")
        if reading_count == 0:
            risk_factors.append("Thiếu dữ liệu cảm biến gần đây")
        if risk_result.get("prediction_method") == "rule_based":
            risk_factors.append("Dự báo bằng cơ chế rule-based fail-safe")
        else:
            risk_factors.append(f"Dự báo bằng mô hình AI v{risk_result.get('model_version', '?')}")

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
            "timeseries_features": risk_result.get("timeseries_features", {}),
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


@router.get("/weather/danang")
async def weather_danang():
    """Return current and 24-hour forecast weather for Da Nang (Open-Meteo, cached 15 min)."""
    return get_danang_weather()


@router.post("/retrain")
async def retrain_model():
    """
    Tái tạo dataset và train lại model với dữ liệu mới nhất.
    Chạy đồng bộ — có thể mất 60-120 giây.
    """
    import subprocess
    import sys
    from pathlib import Path

    start = time.time()
    ai_root = Path(__file__).parent.parent

    steps = []
    errors = []

    # Step 1: Regenerate dataset
    try:
        result = subprocess.run(
            [sys.executable, str(ai_root / "data" / "preprocessing.py")],
            capture_output=True, text=True, timeout=120, cwd=str(ai_root),
        )
        if result.returncode == 0:
            steps.append("dataset_generated")
        else:
            errors.append(f"preprocessing: {result.stderr[-500:]}")
    except Exception as e:
        errors.append(f"preprocessing_exception: {str(e)}")

    # Step 2: Retrain model
    if not errors:
        try:
            result = subprocess.run(
                [sys.executable, str(ai_root / "models" / "train_flood_model_v2.py")],
                capture_output=True, text=True, timeout=300, cwd=str(ai_root),
            )
            if result.returncode == 0:
                steps.append("model_trained")
                # Reload model into memory
                new_model = reload_model()
                if new_model:
                    steps.append("model_reloaded")
                    flood_risk_cache.clear()
                    steps.append("cache_cleared")
            else:
                errors.append(f"training: {result.stderr[-500:]}")
        except Exception as e:
            errors.append(f"training_exception: {str(e)}")

    elapsed = round((time.time() - start) * 1000)

    if errors:
        return {
            "status": "error",
            "steps_completed": steps,
            "errors": errors,
            "elapsed_ms": elapsed,
        }

    # Read new metrics
    metrics_path = ai_root / "models" / "model_metrics.json"
    metrics = {}
    if metrics_path.exists():
        import json
        with open(metrics_path) as f:
            metrics = json.load(f)

    return {
        "status": "success",
        "steps_completed": steps,
        "elapsed_ms": elapsed,
        "model_version": metrics.get("version"),
        "accuracy": metrics.get("accuracy"),
        "f1_weighted": metrics.get("f1_weighted"),
        "f1_macro": metrics.get("f1_macro"),
        "balanced_accuracy": metrics.get("balanced_accuracy"),
        "trained_at": metrics.get("trained_at"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Recommendation Analysis Endpoint
# ─────────────────────────────────────────────────────────────────────────────

class RecommendationAnalysisRequest(BaseModel):
    recommendation_type: str
    description: str
    details: Optional[Dict[str, Any]] = None
    prediction: Optional[Dict[str, Any]] = None
    incident: Optional[Dict[str, Any]] = None
    zone_name: Optional[str] = None
    district_name: Optional[str] = None

class RecommendationAnalysisResponse(BaseModel):
    recommendation_type: str
    urgency: str
    urgency_score: int  # 0-100
    estimated_impact: str
    affected_population_estimate: Optional[int]
    time_sensitivity_minutes: int
    suggested_actions: List[str]
    risk_factors: List[str]
    required_resources: List[Dict[str, Any]]
    confidence: float
    reasoning: str

def _analyze_rescue_dispatch(details: dict, prediction: dict) -> dict:
    risk_score = float(prediction.get("risk_score") or prediction.get("probability", 0) * 100 or 50)
    water_level = float(details.get("current_level_m") or details.get("water_level_m") or 0)
    people_count = int(details.get("people_count") or 0)

    urgency_score = min(100, int(risk_score * 0.5 + water_level * 10 + people_count * 2))
    urgency = "critical" if urgency_score >= 80 else "high" if urgency_score >= 60 else "medium"

    return {
        "urgency": urgency,
        "urgency_score": urgency_score,
        "estimated_impact": f"Cần cứu hộ ~{max(1, people_count)} người tại khu vực ngập",
        "affected_population_estimate": people_count,
        "time_sensitivity_minutes": 15 if urgency == "critical" else 30,
        "suggested_actions": [
            "Điều ngay đội cứu hộ gần nhất đến khu vực",
            "Chuẩn bị phương tiện thủy (thuyền, phao)",
            "Liên hệ bệnh viện dự phòng tiếp nhận nạn nhân",
            f"Ưu tiên nhóm dễ bị tổn thương: {', '.join(details.get('vulnerable_groups') or ['người cao tuổi', 'trẻ em'])}",
        ],
        "required_resources": [
            {"type": "rescue_team", "count": max(1, people_count // 10 + 1), "note": "Đội cứu hộ"},
            {"type": "boat", "count": max(1, people_count // 20 + 1), "note": "Thuyền cứu hộ"},
            {"type": "medical_kit", "count": max(2, people_count // 5), "note": "Bộ sơ cứu"},
        ],
    }


def _analyze_evacuation(details: dict, prediction: dict, zone_name: str) -> dict:
    risk_score = float(prediction.get("risk_score") or prediction.get("probability", 0) * 100 or 60)
    horizon = int(prediction.get("horizon_minutes") or 60)

    return {
        "urgency": "critical" if risk_score >= 70 else "high",
        "urgency_score": min(100, int(risk_score + 10)),
        "estimated_impact": f"Sơ tán cư dân khỏi {zone_name or 'khu vực nguy hiểm'} trước khi ngập",
        "affected_population_estimate": None,
        "time_sensitivity_minutes": max(15, horizon - 10),
        "suggested_actions": [
            f"Phát lệnh sơ tán ngay cho {zone_name or 'khu vực'}",
            "Kích hoạt hệ thống loa phát thanh công cộng",
            "Mở shelter tại các trường học, nhà văn hóa",
            "Điều xe bus hỗ trợ vận chuyển người dân",
            "Ưu tiên người già, trẻ em, người khuyết tật",
        ],
        "required_resources": [
            {"type": "evacuation_vehicle", "count": 5, "note": "Xe vận chuyển"},
            {"type": "shelter", "count": 2, "note": "Điểm trú ẩn"},
            {"type": "announcement_system", "count": 1, "note": "Loa phát thanh"},
        ],
    }


def _analyze_reroute(details: dict, prediction: dict) -> dict:
    return {
        "urgency": "medium",
        "urgency_score": 50,
        "estimated_impact": "Giảm ùn tắc và nguy hiểm cho phương tiện giao thông",
        "affected_population_estimate": None,
        "time_sensitivity_minutes": 60,
        "suggested_actions": [
            "Đặt biển báo cấm đường tại điểm ngập",
            "Bố trí cảnh sát giao thông điều tiết",
            "Cập nhật bản đồ tuyến đường thay thế trên ứng dụng",
            "Thông báo qua loa và mạng xã hội",
        ],
        "required_resources": [
            {"type": "traffic_police", "count": 2, "note": "CSGT điều tiết"},
            {"type": "barrier", "count": 4, "note": "Rào chắn đường"},
        ],
    }


def _analyze_supply_dispatch(details: dict, prediction: dict, zone_name: str) -> dict:
    soil_sat = float(details.get("soil_saturation") or 0)
    rain_6h = float(details.get("rain_6h_mm") or 0)
    urgency_score = min(100, int(soil_sat * 0.4 + rain_6h * 0.3 + 30))

    return {
        "urgency": "medium" if urgency_score < 70 else "high",
        "urgency_score": urgency_score,
        "estimated_impact": f"Hỗ trợ hệ thống thoát nước và dự trữ vật tư tại {zone_name or 'khu vực'}",
        "affected_population_estimate": None,
        "time_sensitivity_minutes": 90,
        "suggested_actions": [
            "Kích hoạt máy bơm thoát nước tại các điểm trũng",
            "Kiểm tra và thông tắc hệ thống cống thoát nước",
            "Chuẩn bị bao cát, máy bơm dự phòng",
            "Phân phối nước sạch và lương thực khẩn cấp nếu cần",
        ],
        "required_resources": [
            {"type": "pump", "count": 3, "note": "Máy bơm thoát nước"},
            {"type": "sandbag", "count": 100, "note": "Bao cát"},
            {"type": "supply_truck", "count": 2, "note": "Xe chở vật tư"},
        ],
    }


def _analyze_priority_route(details: dict, prediction: dict, zone_name: str) -> dict:
    risk_score = float(prediction.get("risk_score") or 65)

    return {
        "urgency": "high",
        "urgency_score": min(100, int(risk_score + 5)),
        "estimated_impact": f"Đảm bảo hành lang an toàn cho xe cứu thương và cứu hộ tại {zone_name or 'khu vực'}",
        "affected_population_estimate": None,
        "time_sensitivity_minutes": 20,
        "suggested_actions": [
            "Giải phóng và phong tỏa tuyến đường ưu tiên cho xe khẩn cấp",
            "Bố trí cảnh sát hộ tống đoàn cứu hộ",
            "Đặt đèn ưu tiên xanh cho tuyến này",
            "Thông báo cho tài xế đổi làn",
        ],
        "required_resources": [
            {"type": "traffic_police", "count": 3, "note": "Cảnh sát hộ tống"},
            {"type": "escort_vehicle", "count": 1, "note": "Xe dẫn đường"},
        ],
    }


@router.post("/recommendations/analyze", response_model=RecommendationAnalysisResponse)
async def analyze_recommendation(request: RecommendationAnalysisRequest):
    """
    Phân tích AI chi tiết cho một đề xuất: đánh giá mức độ khẩn cấp,
    ước tính tác động, gợi ý hành động và nguồn lực cần thiết.
    """
    start = time.time()
    details = request.details or {}
    prediction = request.prediction or {}
    zone_name = request.zone_name or details.get("target_zone") or "Khu vực"

    rtype = request.recommendation_type

    if rtype == "rescue_dispatch":
        analysis = _analyze_rescue_dispatch(details, prediction)
    elif rtype == "evacuation":
        analysis = _analyze_evacuation(details, prediction, zone_name)
    elif rtype == "reroute":
        analysis = _analyze_reroute(details, prediction)
    elif rtype == "supply_dispatch":
        analysis = _analyze_supply_dispatch(details, prediction, zone_name)
    elif rtype == "priority_route":
        analysis = _analyze_priority_route(details, prediction, zone_name)
    elif rtype in ("alert", "signal_control"):
        risk_score = float(prediction.get("risk_score") or 60)
        analysis = {
            "urgency": "high" if risk_score >= 65 else "medium",
            "urgency_score": min(100, int(risk_score)),
            "estimated_impact": request.description,
            "affected_population_estimate": None,
            "time_sensitivity_minutes": 30,
            "suggested_actions": [
                "Phát cảnh báo ngay trên kênh truyền thông",
                "Thông báo cho chính quyền địa phương",
                "Cập nhật bản đồ nguy cơ ngập trên ứng dụng",
            ],
            "required_resources": [
                {"type": "communication", "count": 1, "note": "Hệ thống thông báo"},
            ],
        }
    else:
        analysis = {
            "urgency": "medium",
            "urgency_score": 50,
            "estimated_impact": request.description,
            "affected_population_estimate": None,
            "time_sensitivity_minutes": 60,
            "suggested_actions": ["Xem xét và thực hiện theo đề xuất"],
            "required_resources": [],
        }

    risk_score = float(prediction.get("risk_score") or 50)
    confidence = max(0.5, min(0.99, risk_score / 100 + 0.1))

    risk_factors = []
    if prediction.get("risk_level") in ("critical", "high"):
        risk_factors.append(f"Mức rủi ro AI: {prediction.get('risk_level', 'high').upper()}")
    wl = float(details.get("current_level_m") or details.get("water_level_m") or 0)
    if wl > 0:
        risk_factors.append(f"Mực nước hiện tại: {wl:.1f}m")
    if details.get("soil_saturation", 0) >= 70:
        risk_factors.append(f"Đất bão hòa: {details['soil_saturation']:.0f}%")
    if details.get("rain_6h_mm", 0) >= 40:
        risk_factors.append(f"Mưa tích lũy 6h: {details['rain_6h_mm']:.0f}mm")
    if not risk_factors:
        risk_factors.append("Dựa trên dự báo AI và dữ liệu cảm biến")

    elapsed = round((time.time() - start) * 1000, 2)

    return RecommendationAnalysisResponse(
        recommendation_type=rtype,
        urgency=analysis["urgency"],
        urgency_score=analysis["urgency_score"],
        estimated_impact=analysis["estimated_impact"],
        affected_population_estimate=analysis.get("affected_population_estimate"),
        time_sensitivity_minutes=analysis["time_sensitivity_minutes"],
        suggested_actions=analysis["suggested_actions"],
        risk_factors=risk_factors,
        required_resources=analysis["required_resources"],
        confidence=round(confidence, 3),
        reasoning=f"Phân tích dựa trên risk_score={risk_score:.1f}, loại={rtype}, khu vực={zone_name}. Thời gian xử lý: {elapsed}ms",
    )


# ── LSTM Multi-step Forecasting ───────────────────────────────────────────────

class ForecastRequest(BaseModel):
    """
    Request body for multi-step flood risk forecasting.

    readings: list of recent sensor readings (newest first), each containing:
        - water_level / water_level_m  (float, metres)
        - rainfall / rainfall_mm       (float, mm/h)
        - tide_level                   (float, optional)
        - historical_score             (float, optional)
        - timestamp / created_at       (ISO string, optional — improves temporal encoding)
        - trend, rain_6h, soil_saturation (optional — computed if missing)

    At least 1 reading required; 12-24 readings gives best accuracy.
    The current_risk dict (from /predict-risk) can be included for
    better XGBoost fallback extrapolation when no LSTM model is available.
    """
    readings: List[Dict[str, Any]]
    current_risk: Optional[Dict[str, Any]] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None


@router.post("/predict/forecast")
async def predict_forecast(request: ForecastRequest):
    """
    Multi-step flood risk forecast: 1h, 3h, 6h ahead.

    Uses LSTM model if trained (run models/train_lstm_model.py first).
    Falls back to trend-extrapolated XGBoost predictions automatically.

    Returns:
      - forecasts: list of {horizon, hours_ahead, risk_score, risk_level, confidence, method}
      - method: "lstm" | "xgb_extrapolation"
      - warning: escalation alert if risk is rapidly rising
      - sequence_length: number of historical steps used
    """
    start = time.time()

    if not request.readings:
        return {
            "error": "readings list is empty",
            "forecasts": [],
            "method": "none",
        }

    result = forecast_flood_risk(
        readings=request.readings,
        current_risk=request.current_risk,
    )

    elapsed = round((time.time() - start) * 1000, 2)
    result["processing_time_ms"] = elapsed
    result["zone_id"]   = request.zone_id
    result["zone_name"] = request.zone_name
    result["timestamp"] = datetime.now().isoformat()

    return result


@router.post("/lstm/reload")
async def reload_lstm_model():
    """Force reload the LSTM model from disk (after retraining)."""
    data = reload_lstm()
    if data:
        return {
            "status": "ok",
            "version": data.get("version"),
            "trained_at": data.get("trained_at"),
            "level_accuracy": data.get("val_accuracy"),
        }
    return {"status": "no_model", "message": "LSTM model not found. Run models/train_lstm_model.py"}


# ── Smart AI Analysis — Unified endpoint ──────────────────────────────────────

class SmartAnalysisRequest(BaseModel):
    """
    Unified AI analysis request.

    Provide either:
    - (a) readings: recent sensor time-series + zone_id/seed_nodes for full analysis
    - (b) water_level_m + rainfall_mm + hours_rain for snapshot analysis
    """
    # Snapshot inputs (single reading)
    water_level_m: Optional[float] = None
    rainfall_mm: Optional[float] = None
    hours_rain: Optional[int] = None
    tide_level: Optional[float] = 0.0
    historical_score: Optional[float] = 0.0

    # Time-series inputs (for multi-step forecast)
    readings: Optional[List[Dict[str, Any]]] = None      # newest-first sensor readings

    # Spatial inputs (for flood spread)
    seed_nodes: Optional[List[str]] = None               # already-flooded graph nodes
    seed_water_levels: Optional[Dict[str, float]] = None
    station_readings: Optional[List[Dict[str, Any]]] = None  # raw station data for auto-detection

    # Context
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    soil_saturation: Optional[float] = 40.0

    # What to compute
    include_forecast: Optional[bool] = True
    include_spread: Optional[bool] = True
    include_route: Optional[bool] = False
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None


@router.post("/ai/analyze")
async def smart_ai_analysis(request: SmartAnalysisRequest):
    """
    Unified Smart AI Analysis.

    Runs all available AI models in a single request:
    1. Current flood risk (XGBoost snapshot)
    2. Multi-step forecast (1h, 3h, 6h) — Temporal XGBoost
    3. Spatial flood spread — Graph XGBoost
    4. Evacuation route (optional)

    Returns a structured JSON with all results plus an overall severity summary.
    """
    t_start = time.time()
    result: Dict[str, Any] = {
        "timestamp": datetime.now().isoformat(),
        "zone_id": request.zone_id,
        "zone_name": request.zone_name,
    }

    # ── 0. Auto-fetch weather if rainfall_mm not provided ─────────────────────
    weather_data = None
    if request.rainfall_mm is None:
        weather_data = get_danang_weather()
        result["weather"] = weather_data

    # ── 1. Current risk ───────────────────────────────────────────────────────
    wl    = float(request.water_level_m or 0.0)
    rain  = float(request.rainfall_mm if request.rainfall_mm is not None
                  else (weather_data["current"]["rainfall_mm"] if weather_data else 0.0))
    hrs   = int(request.hours_rain or 0)
    tide  = float(request.tide_level or 0.0)
    hist  = float(request.historical_score or 0.0)
    sat   = float(request.soil_saturation or 40.0)

    # Try to get better values from readings if snapshot not provided
    readings = request.readings or []
    if readings and (not request.water_level_m or not request.rainfall_mm):
        r0 = readings[0]
        if not request.water_level_m:
            wl = float(r0.get("water_level") or r0.get("water_level_m") or 0.0)
        if not request.rainfall_mm:
            rain = float(r0.get("rainfall") or r0.get("rainfall_mm") or 0.0)
        if not request.hours_rain:
            hrs = int(r0.get("hours_rain") or 1)
        if not request.tide_level:
            tide = float(r0.get("tide_level") or 0.0)

    # Extract time-series features if readings available
    wl_trend = rain_6h = 0.0
    if readings:
        wl_values = [float(r.get("water_level") or r.get("water_level_m") or wl) for r in readings[:12]]
        if len(wl_values) >= 2:
            wl_trend = (wl_values[0] - wl_values[-1]) / max(1, len(wl_values) - 1)
        rain_6h = sum(float(r.get("rainfall") or r.get("rainfall_mm") or 0) for r in readings[:6])

    current_risk = calculate_flood_risk(
        water_level_m=wl,
        rainfall_mm=rain,
        hours_rain=hrs,
        tide_level=tide,
        historical_score=hist,
        water_level_trend=wl_trend,
        rain_6h=rain_6h,
        soil_saturation=sat,
    )
    result["current_risk"] = current_risk

    # ── 2. Multi-step forecast ────────────────────────────────────────────────
    if request.include_forecast:
        if readings:
            forecast = forecast_flood_risk(readings, current_risk)
        else:
            # Build minimal readings from snapshot for trend extrapolation
            minimal = [{"water_level_m": wl, "rainfall_mm": rain, "tide_level": tide}]
            forecast = forecast_flood_risk(minimal, current_risk)
        result["forecast"] = forecast
    else:
        result["forecast"] = None

    # ── 3. Spatial spread ─────────────────────────────────────────────────────
    if request.include_spread:
        seeds = request.seed_nodes
        wl_map = request.seed_water_levels or {}

        # Auto-detect from station readings
        if not seeds and request.station_readings:
            seeds, wl_map = identify_seed_nodes_from_stations(request.station_readings)

        if seeds:
            spread = predict_flood_spread(
                seed_nodes=seeds,
                rainfall_mm=rain,
                tide_level=tide,
                hours_rain=float(hrs),
                soil_saturation=sat,
                seed_water_levels=wl_map,
            )
            result["spread"] = spread
        else:
            result["spread"] = {"message": "No seed_nodes provided for spread prediction"}
    else:
        result["spread"] = None

    # ── 4. Optional evacuation route ──────────────────────────────────────────
    if request.include_route and all([
        request.start_lat, request.start_lon,
        request.end_lat, request.end_lon,
    ]):
        flooded = []
        if result.get("spread") and result["spread"].get("critical_nodes"):
            flooded = [{"zone_id": n} for n in result["spread"]["critical_nodes"]]
        route = calculate_optimal_route(
            start_lat=request.start_lat, start_lon=request.start_lon,
            end_lat=request.end_lat, end_lon=request.end_lon,
            flooded_areas=flooded,
        )
        result["evacuation_route"] = route
    else:
        result["evacuation_route"] = None

    # ── 5. Overall severity summary ───────────────────────────────────────────
    risk_score = current_risk.get("risk_score", 0)
    forecast_scores = []
    if result.get("forecast") and result["forecast"].get("forecasts"):
        forecast_scores = [f["risk_score"] for f in result["forecast"]["forecasts"]]

    peak_score = max([risk_score] + forecast_scores) if forecast_scores else risk_score

    def _level(s):
        if s >= 75: return "critical"
        elif s >= 50: return "high"
        elif s >= 25: return "medium"
        return "low"

    # Trend direction
    trend_label = "stable"
    if forecast_scores:
        delta = forecast_scores[-1] - risk_score
        if delta >= 15: trend_label = "escalating"
        elif delta <= -15: trend_label = "improving"

    # Spread severity
    spread_affected = 0
    spread_critical = 0
    if result.get("spread") and isinstance(result["spread"].get("node_predictions"), list):
        preds = result["spread"]["node_predictions"]
        spread_affected = len([p for p in preds if p["flood_probability"] > 0.3])
        spread_critical = len([p for p in preds if p["risk_score"] >= 75])

    result["summary"] = {
        "current_risk_level": current_risk.get("risk_level", "low"),
        "current_risk_score": round(risk_score, 1),
        "peak_risk_level": _level(peak_score),
        "peak_risk_score": round(peak_score, 1),
        "trend": trend_label,
        "forecast_warning": (result.get("forecast") or {}).get("warning"),
        "spread_affected_nodes": spread_affected,
        "spread_critical_nodes": spread_critical,
        "requires_immediate_action": peak_score >= 75 or spread_critical >= 3,
        "confidence": round(float(current_risk.get("confidence", 0.85)), 3),
    }

    result["processing_time_ms"] = round((time.time() - t_start) * 1000, 2)
    return result
