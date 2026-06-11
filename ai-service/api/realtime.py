from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio

from services.realtime_prediction import (
    SensorSimulator, RealtimePredictor, SensorAggregator,
    SensorReading, SensorType, AlertLevel, Alert,
    init_realtime_services, get_sensor_simulator, get_predictor, get_aggregator
)
from services.flood_calculator import calculate_flood_risk
from services.flood_spread_bfs import FloodSpreadBFS
from services.anomaly_detector import get_anomaly_detector

router = APIRouter()

# Lazy initialization
_predictor_instance = None
_aggregator_instance = None
_simulator_instance = None


def get_predictor_instance() -> RealtimePredictor:
    global _predictor_instance
    if _predictor_instance is None:
        bfs = FloodSpreadBFS()
        _predictor_instance = RealtimePredictor(calculate_flood_risk, bfs)
    return _predictor_instance


def get_aggregator_instance() -> SensorAggregator:
    global _aggregator_instance
    if _aggregator_instance is None:
        _aggregator_instance = SensorAggregator()
    return _aggregator_instance


def get_simulator_instance() -> SensorSimulator:
    global _simulator_instance
    if _simulator_instance is None:
        _simulator_instance = SensorSimulator(seed=42)
    return _simulator_instance


# === Request/Response Models ===

class SensorReadingRequest(BaseModel):
    sensor_id: str
    sensor_type: str  # "water_level", "rain_gauge", "tide_gauge"
    value: float
    unit: str
    timestamp: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class PredictionRequest(BaseModel):
    use_sensors: bool = Field(True, description="Use aggregated sensor data")
    custom_readings: Optional[List[SensorReadingRequest]] = None


class AlertResponse(BaseModel):
    level: str
    title: str
    message: str
    affected_areas: List[str]
    timestamp: str
    valid_until: str
    recommendation: str


# === API Endpoints ===

@router.get("/sensors")
async def list_sensors():
    """List available simulated sensors."""
    simulator = get_simulator_instance()
    return {
        "sensors": list(simulator.STATIONS.keys()),
        "stations": simulator.STATIONS
    }


@router.post("/sensors/reading")
async def submit_sensor_reading(reading: SensorReadingRequest):
    """Submit a single sensor reading."""
    aggregator = get_aggregator_instance()
    
    sensor_reading = SensorReading(
        sensor_id=reading.sensor_id,
        sensor_type=SensorType(reading.sensor_type),
        value=reading.value,
        unit=reading.unit,
        timestamp=reading.timestamp or datetime.now(),
        location={
            "lat": reading.lat or 16.0544,
            "lng": reading.lng or 108.2022
        }
    )
    
    aggregator.add_reading(sensor_reading)
    
    return {
        "status": "accepted",
        "sensor_id": reading.sensor_id,
        "timestamp": sensor_reading.timestamp.isoformat()
    }


@router.post("/sensors/readings/batch")
async def submit_batch_readings(readings: List[SensorReadingRequest]):
    """Submit multiple sensor readings at once."""
    aggregator = get_aggregator_instance()
    
    for reading in readings:
        sensor_reading = SensorReading(
            sensor_id=reading.sensor_id,
            sensor_type=SensorType(reading.sensor_type),
            value=reading.value,
            unit=reading.unit,
            timestamp=reading.timestamp or datetime.now(),
            location={
                "lat": reading.lat or 16.0544,
                "lng": reading.lng or 108.2022
            }
        )
        aggregator.add_reading(sensor_reading)
    
    return {
        "status": "accepted",
        "count": len(readings)
    }


@router.get("/sensors/latest")
async def get_latest_sensor_data():
    """Get latest readings from all sensors."""
    aggregator = get_aggregator_instance()
    
    readings = aggregator.get_all_latest()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "readings_count": len(readings),
        "water_levels": aggregator.get_water_levels(),
        "total_rainfall": aggregator.get_rainfall(),
        "average_tide": aggregator.get_average_tide(),
        "readings": [
            {
                "sensor_id": r.sensor_id,
                "type": r.sensor_type.value,
                "value": r.value,
                "unit": r.unit,
                "timestamp": r.timestamp.isoformat(),
            }
            for r in readings
        ]
    }


@router.post("/predict/realtime")
async def realtime_prediction(request: PredictionRequest):
    """Generate real-time flood prediction."""
    predictor = get_predictor_instance()
    aggregator = get_aggregator_instance()
    
    if request.use_sensors:
        # Use aggregated sensor data
        readings = aggregator.get_all_latest()
        
        if not readings:
            raise HTTPException(
                status_code=400,
                detail="No sensor readings available. Submit readings first."
            )
        
        result = predictor.predict_from_sensors(readings)
    else:
        # Use custom readings
        if not request.custom_readings:
            raise HTTPException(
                status_code=400,
                detail="No custom readings provided."
            )
        
        readings = [
            SensorReading(
                sensor_id=r.sensor_id,
                sensor_type=SensorType(r.sensor_type),
                value=r.value,
                unit=r.unit,
                timestamp=r.timestamp or datetime.now(),
                location={"lat": r.lat or 16.0544, "lng": r.lng or 108.2022}
            )
            for r in request.custom_readings
        ]
        
        result = predictor.predict_from_sensors(readings)
    
    return {
        "timestamp": result.timestamp.isoformat(),
        "risk_score": result.risk_score,
        "risk_level": result.risk_level,
        "risk_factors": result.risk_factors,
        "affected_areas": result.affected_areas,
        "recommended_actions": result.recommended_actions,
        "confidence": result.confidence,
        "model_version": result.model_version,
        "processing_time_ms": round(result.processing_time_ms, 2),
    }


@router.get("/predict/trends")
async def get_prediction_trends(hours: int = 24):
    """Get flood prediction trends over time."""
    predictor = get_predictor_instance()
    trends = predictor.get_prediction_trends(hours)
    
    return {
        "requested_hours": hours,
        "trend": trends["trend"],
        "predictions_count": trends["predictions_count"],
        "avg_risk_score": trends["avg_risk_score"],
        "max_risk_score": trends["max_risk_score"],
        "min_risk_score": trends["min_risk_score"],
        "latest_prediction": trends.get("latest_prediction"),
    }


@router.get("/alerts")
async def get_active_alerts():
    """Get currently active alerts."""
    predictor = get_predictor_instance()
    alerts = predictor.get_active_alerts()
    
    return {
        "count": len(alerts),
        "alerts": [
            {
                "level": a.level.value,
                "title": a.title,
                "message": a.message,
                "affected_areas": a.affected_areas,
                "timestamp": a.timestamp.isoformat(),
                "valid_until": a.valid_until.isoformat(),
                "recommendation": a.recommendation,
            }
            for a in alerts
        ]
    }


@router.post("/alerts/acknowledge/{alert_timestamp}")
async def acknowledge_alert(alert_timestamp: str):
    """Acknowledge an alert (mark as seen)."""
    # In a real system, this would update the alert in database
    return {
        "status": "acknowledged",
        "alert_timestamp": alert_timestamp,
    }


@router.get("/simulate/reading")
async def simulate_single_reading(sensor_id: Optional[str] = None):
    """Generate a simulated sensor reading."""
    simulator = get_simulator_instance()
    
    if sensor_id:
        if sensor_id not in simulator.STATIONS:
            raise HTTPException(status_code=404, detail=f"Sensor {sensor_id} not found")
        reading = simulator.generate_reading(sensor_id)
    else:
        # Random sensor
        sensor_id = list(simulator.STATIONS.keys())[0]
        reading = simulator.generate_reading(sensor_id)
    
    return {
        "sensor_id": reading.sensor_id,
        "sensor_type": reading.sensor_type.value,
        "value": reading.value,
        "unit": reading.unit,
        "timestamp": reading.timestamp.isoformat(),
        "location": reading.location,
    }


@router.post("/simulate/flood-event")
async def simulate_flood_event(
    background_tasks: BackgroundTasks,
    severity: str = "high",
    location: Optional[str] = None
):
    """
    Simulate a flood event by generating high readings.
    Severity: low, medium, high, critical
    Location: specific node ID or None for random
    """
    simulator = get_simulator_instance()
    aggregator = get_aggregator_instance()
    
    # Generate multiple high readings
    severity_multipliers = {
        "low": 1.5,
        "medium": 2.0,
        "high": 3.0,
        "critical": 4.0,
    }
    
    multiplier = severity_multipliers.get(severity, 2.0)
    
    for sensor_id in simulator.STATIONS:
        reading = simulator.generate_reading(sensor_id)
        
        # Boost values based on severity
        if "WL_" in sensor_id:
            reading.value *= multiplier
        elif "RG_" in sensor_id:
            reading.value *= multiplier
        
        aggregator.add_reading(reading)
    
    # Trigger prediction
    predictor = get_predictor_instance()
    readings = aggregator.get_all_latest()
    result = predictor.predict_from_sensors(readings)
    
    return {
        "status": "flood_event_simulated",
        "severity": severity,
        "readings_generated": len(simulator.STATIONS),
        "prediction": {
            "risk_score": result.risk_score,
            "risk_level": result.risk_level,
            "affected_areas": result.affected_areas,
        }
    }


@router.get("/flood-spread")
async def get_flood_spread_prediction(
    duration_hours: float = 2.0,
    rainfall_mm_h: float = 100.0
):
    """
    Get flood spread prediction using BFS algorithm.
    """
    bfs = FloodSpreadBFS()
    
    # Use current high-risk nodes as seed points
    seed_points = [
        ("cho_bac", 1.5),
        ("hai_chau", 1.2),
        ("nguyen_van_thoai", 1.0),
    ]
    
    result = bfs.predict(
        seed_points=seed_points,
        rainfall_mm_h=rainfall_mm_h,
        duration_hours=duration_hours
    )
    
    return {
        "timestamp": datetime.now().isoformat(),
        "parameters": {
            "duration_hours": duration_hours,
            "rainfall_mm_h": rainfall_mm_h,
        },
        "summary": {
            "total_nodes": result.total_nodes,
            "flooded_nodes": result.flooded_nodes,
            "spread_time_minutes": result.spread_time_minutes,
        },
        "critical_areas": result.critical_areas,
        "evacuation_needed": result.evacuation_needed,
        "high_risk_areas": result.high_risk_areas,
        "safe_evacuation_routes": result.safe_evacuation_routes,
        "predictions": [
            {
                "node_id": p.node_id,
                "lat": p.lat,
                "lng": p.lng,
                "flooded": p.flooded,
                "arrival_time_minutes": p.arrival_time_minutes,
                "water_depth_m": p.water_depth_m,
                "risk_score": p.risk_score,
                "district": p.district,
            }
            for p in sorted(result.predictions, key=lambda x: x.arrival_time_minutes)[:20]
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Anomaly Detection Endpoints
# ─────────────────────────────────────────────────────────────────────────────

class AnomalyIngestRequest(BaseModel):
    sensor_id: str
    value: float
    sensor_type: str = "water_level"  # water_level | rain_gauge | tide_gauge
    timestamp: Optional[str] = None


class AnomalyBatchRequest(BaseModel):
    readings: List[Dict[str, Any]]


@router.post("/anomaly/ingest")
async def ingest_anomaly_check(request: AnomalyIngestRequest):
    """
    Gửi một reading vào anomaly detector.
    Trả về event nếu phát hiện bất thường, hoặc {"anomaly": null} nếu bình thường.
    """
    from datetime import datetime as dt
    detector = get_anomaly_detector()
    ts = None
    if request.timestamp:
        try:
            ts = dt.fromisoformat(request.timestamp.replace("Z", "+00:00"))
        except ValueError:
            pass

    event = detector.ingest(
        sensor_id=request.sensor_id,
        value=request.value,
        sensor_type=request.sensor_type,
        timestamp=ts,
    )

    if event:
        return {
            "anomaly": {
                "sensor_id": event.sensor_id,
                "value": event.value,
                "z_score": event.z_score,
                "baseline_mean": event.baseline_mean,
                "baseline_std": event.baseline_std,
                "severity": event.severity,
                "anomaly_type": event.anomaly_type,
                "timestamp": event.timestamp,
                "message": event.message,
            }
        }
    return {"anomaly": None}


@router.post("/anomaly/batch")
async def ingest_anomaly_batch(request: AnomalyBatchRequest):
    """
    Gửi nhiều readings cùng lúc, nhận về danh sách tất cả bất thường phát hiện được.
    """
    detector = get_anomaly_detector()
    events = detector.ingest_batch(request.readings)

    return {
        "total_readings": len(request.readings),
        "anomalies_found": len(events),
        "anomalies": [
            {
                "sensor_id": e.sensor_id,
                "value": e.value,
                "z_score": e.z_score,
                "severity": e.severity,
                "anomaly_type": e.anomaly_type,
                "timestamp": e.timestamp,
                "message": e.message,
            }
            for e in events
        ],
    }


@router.get("/anomaly/stats")
async def get_anomaly_stats():
    """Thống kê baseline của tất cả cảm biến đang được theo dõi."""
    detector = get_anomaly_detector()
    return {
        "sensors": detector.get_all_stats(),
        "total_sensors_tracked": len(detector._histories),
    }


# ── Real-Station Simulator v2 (175 trạm thực tế Đà Nẵng) ─────────────────────

from services.sensor_simulator_v2 import get_simulator_v2, FloodScenario as ScenarioEnum


@router.get("/v2/stations")
async def list_stations_v2():
    """Danh sách 175 trạm thực tế (93 nước + 82 mưa) từ muangap.danang.gov.vn."""
    sim = get_simulator_v2()
    sim.tick()
    return {
        "stations": sim.get_all_readings(),
        "count": sim.get_station_count(),
        "scenario": sim.get_scenario(),
    }


@router.get("/v2/stations/high-risk")
async def get_high_risk_stations_v2(top_n: int = 10):
    """Top N trạm có mức độ nguy hiểm cao nhất hiện tại."""
    sim = get_simulator_v2()
    sim.tick()
    return {
        "high_risk_stations": sim.get_high_risk_stations(top_n),
        "scenario": sim.get_scenario(),
    }


@router.get("/v2/aggregated")
async def get_aggregated_v2():
    """Dữ liệu tổng hợp từ toàn bộ trạm — dùng trực tiếp cho flood prediction."""
    sim = get_simulator_v2()
    sim.tick()
    return {
        "input": sim.get_aggregated_input(),
        "station_count": sim.get_station_count(),
        "scenario": sim.get_scenario(),
    }


class ScenarioRequest(BaseModel):
    scenario: str  # normal | light_rain | heavy_rain | flood_event | typhoon


@router.post("/v2/scenario")
async def set_scenario_v2(req: ScenarioRequest):
    """Đặt kịch bản mô phỏng cho toàn bộ hệ thống sensor."""
    scenario_map = {
        "normal": ScenarioEnum.NORMAL,
        "light_rain": ScenarioEnum.LIGHT_RAIN,
        "heavy_rain": ScenarioEnum.HEAVY_RAIN,
        "flood_event": ScenarioEnum.FLOOD_EVENT,
        "typhoon": ScenarioEnum.TYPHOON,
    }
    if req.scenario not in scenario_map:
        raise HTTPException(status_code=400, detail=f"Invalid scenario. Choose: {list(scenario_map.keys())}")
    sim = get_simulator_v2()
    sim.set_scenario(scenario_map[req.scenario])
    return {"status": "ok", "scenario": req.scenario, "message": f"Scenario set to {req.scenario}"}


@router.post("/v2/predict")
async def predict_from_realstations():
    """Chạy flood prediction dùng dữ liệu tổng hợp từ 175 trạm thực tế."""
    from services.flood_calculator import calculate_flood_risk
    sim = get_simulator_v2()
    sim.tick()
    agg = sim.get_aggregated_input()
    result = calculate_flood_risk(
        water_level_m=agg["water_level_m"],
        rainfall_mm=agg["rainfall_mm"],
        hours_rain=int(agg["hours_rain"]),
        tide_level=agg.get("tide_level", 0.0),
        historical_score=agg.get("historical_score", 0.0),
        water_level_trend=agg.get("water_level_trend", 0.0),
        rain_6h=agg.get("rain_6h", 0.0),
        soil_saturation=agg.get("soil_saturation", 0.0),
    )
    return {
        "prediction": result,
        "data_source": "real_stations_v2",
        "station_count": sim.get_station_count(),
        "scenario": sim.get_scenario(),
        "aggregated_input": agg,
    }
