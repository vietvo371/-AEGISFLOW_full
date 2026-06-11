"""
Sensor Anomaly Detection for AegisFlow
Phát hiện bất thường trong dữ liệu cảm biến dùng Z-score + rolling window.
"""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import math


@dataclass
class SensorHistory:
    sensor_id: str
    values: deque = field(default_factory=lambda: deque(maxlen=50))
    timestamps: deque = field(default_factory=lambda: deque(maxlen=50))

    def add(self, value: float, ts: datetime):
        self.values.append(value)
        self.timestamps.append(ts)

    def mean(self) -> Optional[float]:
        if not self.values:
            return None
        return sum(self.values) / len(self.values)

    def std(self) -> Optional[float]:
        n = len(self.values)
        if n < 2:
            return None
        m = self.mean()
        variance = sum((v - m) ** 2 for v in self.values) / (n - 1)
        return math.sqrt(variance)

    def z_score(self, value: float) -> Optional[float]:
        m = self.mean()
        s = self.std()
        if m is None or s is None or s < 1e-9:
            return None
        return (value - m) / s


@dataclass
class AnomalyEvent:
    sensor_id: str
    value: float
    z_score: float
    baseline_mean: float
    baseline_std: float
    severity: str          # "warning" | "critical"
    anomaly_type: str      # "spike" | "drop" | "flatline"
    timestamp: str
    message: str


class AnomalyDetector:
    """
    Rolling Z-score anomaly detector.

    Thresholds:
      |z| >= 2.5  → warning
      |z| >= 4.0  → critical
    Flatline: std < 0.01 over 10+ readings for water-level sensors.
    """

    WARNING_Z = 2.5
    CRITICAL_Z = 4.0
    FLATLINE_STD_THRESHOLD = 0.01
    FLATLINE_MIN_READINGS = 10

    def __init__(self):
        self._histories: Dict[str, SensorHistory] = {}

    def _get_history(self, sensor_id: str) -> SensorHistory:
        if sensor_id not in self._histories:
            self._histories[sensor_id] = SensorHistory(sensor_id=sensor_id)
        return self._histories[sensor_id]

    def ingest(
        self,
        sensor_id: str,
        value: float,
        sensor_type: str = "water_level",
        timestamp: Optional[datetime] = None,
    ) -> Optional[AnomalyEvent]:
        """
        Nhận một reading mới, cập nhật history, trả về AnomalyEvent nếu phát hiện bất thường.
        Trả về None nếu bình thường.
        """
        ts = timestamp or datetime.utcnow()
        history = self._get_history(sensor_id)

        anomaly: Optional[AnomalyEvent] = None

        # Phát hiện flatline trước khi thêm giá trị mới
        if sensor_type == "water_level" and len(history.values) >= self.FLATLINE_MIN_READINGS:
            std = history.std()
            if std is not None and std < self.FLATLINE_STD_THRESHOLD:
                anomaly = AnomalyEvent(
                    sensor_id=sensor_id,
                    value=value,
                    z_score=0.0,
                    baseline_mean=history.mean(),
                    baseline_std=std,
                    severity="warning",
                    anomaly_type="flatline",
                    timestamp=ts.isoformat(),
                    message=(
                        f"Cảm biến {sensor_id} có thể bị kẹt/lỗi: "
                        f"độ lệch chuẩn {std:.4f} m trong {len(history.values)} lần đọc gần nhất"
                    ),
                )

        # Tính Z-score nếu đủ dữ liệu
        if anomaly is None and len(history.values) >= 5:
            z = history.z_score(value)
            if z is not None and abs(z) >= self.WARNING_Z:
                severity = "critical" if abs(z) >= self.CRITICAL_Z else "warning"
                direction = "spike" if z > 0 else "drop"
                unit_label = {"water_level": "m", "rain_gauge": "mm/h", "tide_gauge": "m"}.get(sensor_type, "")
                anomaly = AnomalyEvent(
                    sensor_id=sensor_id,
                    value=value,
                    z_score=round(z, 3),
                    baseline_mean=round(history.mean(), 3),
                    baseline_std=round(history.std(), 4),
                    severity=severity,
                    anomaly_type=direction,
                    timestamp=ts.isoformat(),
                    message=(
                        f"{'[NGHIÊM TRỌNG]' if severity == 'critical' else '[Cảnh báo]'} "
                        f"Cảm biến {sensor_id}: {'Đột biến tăng' if direction == 'spike' else 'Tụt giảm đột ngột'} "
                        f"({value:.2f}{unit_label}, Z={z:+.1f}, "
                        f"baseline={history.mean():.2f}±{history.std():.3f}{unit_label})"
                    ),
                )

        # Thêm vào history SAU khi phân tích
        history.add(value, ts)

        return anomaly

    def ingest_batch(
        self,
        readings: List[Dict],
    ) -> List[AnomalyEvent]:
        """
        readings: [{"sensor_id": str, "value": float, "sensor_type": str, "timestamp": str|None}]
        """
        events = []
        for r in readings:
            ts = None
            if r.get("timestamp"):
                try:
                    ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
                except ValueError:
                    pass
            event = self.ingest(
                sensor_id=r["sensor_id"],
                value=float(r["value"]),
                sensor_type=r.get("sensor_type", "water_level"),
                timestamp=ts,
            )
            if event:
                events.append(event)
        return events

    def get_sensor_stats(self, sensor_id: str) -> Dict:
        history = self._get_history(sensor_id)
        if not history.values:
            return {"sensor_id": sensor_id, "readings": 0}
        return {
            "sensor_id": sensor_id,
            "readings": len(history.values),
            "mean": round(history.mean(), 3),
            "std": round(history.std() or 0.0, 4),
            "min": round(min(history.values), 3),
            "max": round(max(history.values), 3),
            "last_value": round(history.values[-1], 3),
        }

    def get_all_stats(self) -> List[Dict]:
        return [self.get_sensor_stats(sid) for sid in self._histories]


# Singleton instance
_detector_instance: Optional[AnomalyDetector] = None


def get_anomaly_detector() -> AnomalyDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = AnomalyDetector()
    return _detector_instance
