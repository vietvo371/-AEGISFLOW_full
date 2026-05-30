# -*- coding: utf-8 -*-
"""
AegisFlow AI — IoT Sensor Integration & Real-time Prediction
Hỗ trợ kết nối sensor thực tế và streaming real-time predictions.
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from collections import deque
from enum import Enum
import threading
from pathlib import Path

# Simulated sensor data (thay bằng real sensors khi có hardware)
try:
    import random
    HAS_RANDOM = True
except ImportError:
    HAS_RANDOM = False


class SensorType(Enum):
    WATER_LEVEL = "water_level"
    RAIN_GAUGE = "rain_gauge"
    TIDE_GAUGE = "tide_gauge"
    WEATHER_STATION = "weather"


class AlertLevel(Enum):
    NORMAL = "normal"
    WATCH = "watch"
    WARNING = "warning"
    EMERGENCY = "emergency"


@dataclass
class SensorReading:
    """Một reading từ sensor."""
    sensor_id: str
    sensor_type: SensorType
    value: float
    unit: str
    timestamp: datetime
    location: Dict[str, float] = field(default_factory=lambda: {"lat": 0, "lng": 0})
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PredictionResult:
    """Kết quả prediction với metadata."""
    timestamp: datetime
    risk_score: float
    risk_level: str
    risk_factors: Dict[str, float]
    affected_areas: List[str]
    recommended_actions: List[str]
    confidence: float
    model_version: str = "2.0.0"
    processing_time_ms: float = 0


@dataclass
class Alert:
    """Cảnh báo được tạo từ prediction."""
    level: AlertLevel
    title: str
    message: str
    affected_areas: List[str]
    timestamp: datetime
    valid_until: datetime
    recommendation: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class SensorSimulator:
    """
    Simulate IoT sensors cho testing.
    Trong production, thay bằng real sensor data sources.
    """
    
    # Danang sensor stations
    STATIONS = {
        "WL_HaiChau": {"lat": 16.0544, "lng": 108.2022, "base": 1.5, "variance": 0.5},
        "WL_ThanhKhe": {"lat": 16.0600, "lng": 108.1900, "base": 1.8, "variance": 0.6},
        "WL_LienChieu": {"lat": 16.0700, "lng": 108.1500, "base": 0.8, "variance": 0.3},
        "RG_CamLe": {"lat": 16.0450, "lng": 108.1800, "base": 20, "variance": 15},
        "RG_HoaVang": {"lat": 16.0300, "lng": 108.1200, "base": 25, "variance": 20},
        "TG_HanRiver": {"lat": 16.0560, "lng": 108.2050, "base": 1.2, "variance": 0.4},
    }
    
    def __init__(self, seed: Optional[int] = None):
        if seed is not None and HAS_RANDOM:
            random.seed(seed)
        self._running = False
        self._readings_buffer: deque = deque(maxlen=1000)
    
    def generate_reading(self, sensor_id: str) -> SensorReading:
        """Generate một reading giả lập."""
        if sensor_id not in self.STATIONS:
            raise ValueError(f"Unknown sensor: {sensor_id}")
        
        station = self.STATIONS[sensor_id]
        
        if "WL_" in sensor_id:  # Water level
            value = station["base"] + random.uniform(-station["variance"], station["variance"])
            unit = "m"
            sensor_type = SensorType.WATER_LEVEL
        elif "RG_" in sensor_id:  # Rain gauge
            value = max(0, station["base"] + random.uniform(-station["variance"], station["variance"]))
            unit = "mm"
            sensor_type = SensorType.RAIN_GAUGE
        else:  # Tide
            value = station["base"] + random.uniform(-station["variance"], station["variance"])
            unit = "m"
            sensor_type = SensorType.TIDE_GAUGE
        
        return SensorReading(
            sensor_id=sensor_id,
            sensor_type=sensor_type,
            value=round(value, 2),
            unit=unit,
            timestamp=datetime.now(),
            location={"lat": station["lat"], "lng": station["lng"]},
        )
    
    async def stream_readings(
        self, 
        interval_seconds: float = 5.0,
        callback: Optional[Callable[[SensorReading], None]] = None
    ):
        """Stream readings liên tục."""
        self._running = True
        sensor_ids = list(self.STATIONS.keys())
        idx = 0
        
        while self._running:
            sensor_id = sensor_ids[idx % len(sensor_ids)]
            reading = self.generate_reading(sensor_id)
            
            self._readings_buffer.append(reading)
            
            if callback:
                callback(reading)
            
            idx += 1
            await asyncio.sleep(interval_seconds)
    
    def stop(self):
        """Dừng streaming."""
        self._running = False
    
    def get_recent_readings(self, sensor_id: Optional[str] = None, limit: int = 100) -> List[SensorReading]:
        """Lấy readings gần đây."""
        if sensor_id:
            return [r for r in self._readings_buffer if r.sensor_id == sensor_id][-limit:]
        return list(self._readings_buffer)[-limit:]


class RealtimePredictor:
    """
    Real-time flood predictor sử dụng streaming sensor data.
    """
    
    def __init__(self, flood_calculator, flood_spread_bfs):
        self.flood_calculator = flood_calculator
        self.flood_spread_bfs = flood_spread_bfs
        self._alert_history: deque = deque(maxlen=100)
        self._prediction_history: deque = deque(maxlen=1000)
        self._callbacks: List[Callable[[PredictionResult], None]] = []
        self._alert_callbacks: List[Callable[[Alert], None]] = []
    
    def add_prediction_callback(self, callback: Callable[[PredictionResult], None]):
        """Thêm callback cho mỗi prediction mới."""
        self._callbacks.append(callback)
    
    def add_alert_callback(self, callback: Callable[[Alert], None]):
        """Thêm callback cho alert mới."""
        self._alert_callbacks.append(callback)
    
    def predict_from_sensors(self, readings: List[SensorReading]) -> PredictionResult:
        """Tạo prediction từ sensor readings."""
        start_time = time.time()
        
        # Aggregate sensor data
        water_levels = []
        rainfalls = []
        tide_levels = []
        locations = []
        
        for reading in readings:
            if reading.sensor_type == SensorType.WATER_LEVEL:
                water_levels.append(reading.value)
                locations.append(reading.location)
            elif reading.sensor_type == SensorType.RAIN_GAUGE:
                rainfalls.append(reading.value)
            elif reading.sensor_type == SensorType.TIDE_GAUGE:
                tide_levels.append(reading.value)
        
        # Calculate aggregated values
        avg_water = sum(water_levels) / len(water_levels) if water_levels else 0
        total_rain = sum(rainfalls) if rainfalls else 0
        avg_tide = sum(tide_levels) / len(tide_levels) if tide_levels else 0
        
        # Get flood risk
        risk_result = self.flood_calculator(
            water_level_m=avg_water,
            rainfall_mm=total_rain,
            hours_rain=2,  # Assume 2h duration
            tide_level=avg_tide,
            historical_score=50,  # Default
        )
        
        # Determine affected areas
        affected_areas = self._determine_affected_areas(avg_water, locations)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(risk_result, affected_areas)
        
        # Create result
        result = PredictionResult(
            timestamp=datetime.now(),
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            risk_factors=risk_result.get("contributing_factors", {}),
            affected_areas=affected_areas,
            recommended_actions=recommendations,
            confidence=risk_result.get("confidence", 0.8),
            model_version=risk_result.get("model_version", "2.0.0"),
            processing_time_ms=(time.time() - start_time) * 1000,
        )
        
        # Store history
        self._prediction_history.append(result)
        
        # Check for alerts
        self._check_alerts(result)
        
        # Notify callbacks
        for callback in self._callbacks:
            try:
                callback(result)
            except Exception as e:
                print(f"Callback error: {e}")
        
        return result
    
    def _determine_affected_areas(self, water_level: float, locations: List[Dict]) -> List[str]:
        """Xác định các khu vực bị ảnh hưởng dựa trên water level."""
        affected = []
        
        # Map water level to nodes
        node_thresholds = {
            "cho_bac": 0.5,
            "phuoc_my": 0.8,
            "nguyen_van_thoai": 0.7,
            "hai_chau": 1.0,
            "duy_tan": 1.2,
            "song_cu_da_nang": 0.6,
        }
        
        for node, threshold in node_thresholds.items():
            if water_level >= threshold:
                affected.append(node)
        
        return affected
    
    def _generate_recommendations(
        self, 
        risk_result: Dict, 
        affected_areas: List[str]
    ) -> List[str]:
        """Tạo recommendations dựa trên risk level."""
        risk_level = risk_result.get("risk_level", "low")
        recommendations = []
        
        if risk_level == "critical":
            recommendations = [
                "Kích hoạt cảnh báo khẩn cấp ngay lập tức",
                "Bắt đầu sơ tán các khu vực nguy hiểm",
                "Điều động đội cứu hộ đến các điểm trọng yếu",
                "Chuẩn bị shelter cho người dân",
            ]
        elif risk_level == "high":
            recommendations = [
                "Tăng cường theo dõi mực nước",
                "Chuẩn bị phương án sơ tán",
                "Cảnh báo người dân các khu vực ngập trũng",
                "Kiểm tra hệ thống thoát nước",
            ]
        elif risk_level == "medium":
            recommendations = [
                "Theo dõi tình hình",
                "Cảnh báo người dân khu vực có nguy cơ",
                "Kiểm tra dụng cụ chống ngập",
            ]
        else:
            recommendations = [
                "Tiếp tục giám sát bình thường",
            ]
        
        if affected_areas:
            recommendations.append(f"Các khu vực cần chú ý: {', '.join(affected_areas[:3])}")
        
        return recommendations
    
    def _check_alerts(self, result: PredictionResult):
        """Kiểm tra và tạo alerts nếu cần."""
        # Determine alert level
        if result.risk_score >= 75:
            alert_level = AlertLevel.EMERGENCY
        elif result.risk_score >= 50:
            alert_level = AlertLevel.WARNING
        elif result.risk_score >= 25:
            alert_level = AlertLevel.WATCH
        else:
            return  # No alert for normal conditions
        
        # Create alert
        alert_messages = {
            AlertLevel.EMERGENCY: ("Ngập lụt nghiêm trọng", "Nguy cơ ngập lụt rất cao, cần sơ tán ngay"),
            AlertLevel.WARNING: ("Cảnh báo ngập lụt", "Nguy cơ ngập lụt cao, chuẩn bị phương án sơ tán"),
            AlertLevel.WATCH: ("Theo dõi", "Điều kiện thời tiết có thể dẫn đến ngập lụt"),
        }
        
        title, message = alert_messages[alert_level]
        
        alert = Alert(
            level=alert_level,
            title=title,
            message=message,
            affected_areas=result.affected_areas,
            timestamp=result.timestamp,
            valid_until=result.timestamp + timedelta(minutes=30),
            recommendation="\n".join(result.recommended_actions[:2]),
            metadata={
                "risk_score": result.risk_score,
                "risk_level": result.risk_level,
            }
        )
        
        # Check if similar alert was sent recently
        recent_same = False
        for existing in list(self._alert_history)[-5:]:
            if (existing.level == alert_level and 
                existing.affected_areas == alert.affected_areas and
                (alert.timestamp - existing.timestamp).total_seconds() < 600):
                recent_same = True
                break
        
        if not recent_same:
            self._alert_history.append(alert)
            
            # Notify alert callbacks
            for callback in self._alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    print(f"Alert callback error: {e}")
    
    def get_prediction_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Lấy trend predictions trong N giờ qua."""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent = [p for p in self._prediction_history if p.timestamp >= cutoff]
        
        if not recent:
            return {"trend": "no_data", "predictions_count": 0}
        
        scores = [p.risk_score for p in recent]
        avg_score = sum(scores) / len(scores)
        
        # Determine trend
        if len(recent) >= 10:
            first_half = sum(scores[:len(scores)//2]) / (len(scores)//2)
            second_half = sum(scores[len(scores)//2:]) / (len(scores) - len(scores)//2)
            
            if second_half > first_half + 5:
                trend = "increasing"
            elif second_half < first_half - 5:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "trend": trend,
            "predictions_count": len(recent),
            "avg_risk_score": round(avg_score, 2),
            "max_risk_score": max(scores),
            "min_risk_score": min(scores),
            "latest_prediction": {
                "timestamp": recent[-1].timestamp.isoformat(),
                "risk_score": recent[-1].risk_score,
                "risk_level": recent[-1].risk_level,
            }
        }
    
    def get_active_alerts(self) -> List[Alert]:
        """Lấy các alerts đang active."""
        now = datetime.now()
        return [
            a for a in self._alert_history 
            if a.valid_until > now
        ]


class SensorAggregator:
    """
    Aggregates readings from multiple sensors and provides
    standardized access to sensor data.
    """
    
    def __init__(self, max_age_seconds: int = 300):
        self._readings: Dict[str, SensorReading] = {}
        self._max_age = max_age_seconds
        self._lock = threading.Lock()
    
    def add_reading(self, reading: SensorReading):
        """Add a reading from a sensor."""
        with self._lock:
            self._readings[reading.sensor_id] = reading
    
    def get_latest(self, sensor_id: str) -> Optional[SensorReading]:
        """Get latest reading from a specific sensor."""
        with self._lock:
            reading = self._readings.get(sensor_id)
            if reading and self._is_fresh(reading):
                return reading
            return None
    
    def get_all_latest(self) -> List[SensorReading]:
        """Get all fresh readings."""
        with self._lock:
            return [
                r for r in self._readings.values()
                if self._is_fresh(r)
            ]
    
    def _is_fresh(self, reading: SensorReading) -> bool:
        """Check if reading is still fresh."""
        age = (datetime.now() - reading.timestamp).total_seconds()
        return age < self._max_age
    
    def get_water_levels(self) -> Dict[str, float]:
        """Get all water levels."""
        readings = self.get_all_latest()
        return {
            r.sensor_id: r.value 
            for r in readings 
            if r.sensor_type == SensorType.WATER_LEVEL
        }
    
    def get_rainfall(self) -> float:
        """Get total rainfall across all sensors."""
        readings = self.get_all_latest()
        return sum(
            r.value for r in readings 
            if r.sensor_type == SensorType.RAIN_GAUGE
        )
    
    def get_average_tide(self) -> float:
        """Get average tide level."""
        readings = self.get_all_latest()
        tide_readings = [r.value for r in readings if r.sensor_type == SensorType.TIDE_GAUGE]
        return sum(tide_readings) / len(tide_readings) if tide_readings else 0


# Global instances for use in API
_sensor_simulator: Optional[SensorSimulator] = None
_predictor: Optional[RealtimePredictor] = None
_aggregator: Optional[SensorAggregator] = None


def init_realtime_services(flood_calculator, flood_spread_bfs):
    """Initialize global realtime services."""
    global _sensor_simulator, _predictor, _aggregator
    
    _sensor_simulator = SensorSimulator(seed=42)
    _aggregator = SensorAggregator()
    _predictor = RealtimePredictor(flood_calculator, flood_spread_bfs)
    
    return _sensor_simulator, _predictor, _aggregator


def get_sensor_simulator() -> Optional[SensorSimulator]:
    return _sensor_simulator


def get_predictor() -> Optional[RealtimePredictor]:
    return _predictor


def get_aggregator() -> Optional[SensorAggregator]:
    return _aggregator
