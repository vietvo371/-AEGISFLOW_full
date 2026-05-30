"""
AegisFlow Cascade Alert Generator
Hệ thống tạo alerts tự động khi flood BFS dự đoán ngập lan rộng đến các vùng mới.
"""

import math
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    FLOOD_WARNING = "flood_warning"
    EVACUATION_ORDER = "evacuation_order"
    RAIN_ALERT = "rain_alert"
    SHELTER_UPDATE = "shelter_update"


@dataclass
class ZoneAlert:
    """Alert được tạo cho một vùng."""
    zone_id: str
    zone_name: str
    severity: AlertSeverity
    alert_type: AlertType
    title: str
    message: str
    affected_area: str
    lat: float
    lng: float
    arrival_time_minutes: float
    water_depth_m: float
    recommended_action: str
    shelter_nearby: Optional[str] = None
    shelter_distance_m: Optional[float] = None


@dataclass
class CascadeAlertReport:
    """Report đầy đủ của cascade alerts."""
    timestamp: datetime
    total_zones_affected: int
    new_alerts: List[ZoneAlert]
    escalated_alerts: List[ZoneAlert]
    cleared_alerts: List[str]
    priority_evacuation_zones: List[str]
    shelters_needed: int


class CascadeAlertGenerator:
    """
    Generator tạo alerts tự động khi có thay đổi về ngập lụt.
    
    Logic:
    1. So sánh trạng thái mới với trạng thái cũ
    2. Tạo alerts mới cho zones mới bị ngập
    3. Nâng severity cho zones đang ngập nặng hơn
    4. Xóa alerts cho zones đã rút nước
    5. Tính priority evacuation zones
    """
    
    CRITICAL_DEPTH_M = 1.5
    HIGH_DEPTH_M = 0.8
    MEDIUM_DEPTH_M = 0.3
    
    ESCALATION_THRESHOLD_MIN = 30
    
    def __init__(self):
        self.previous_state: Dict[str, Dict] = {}
        self.active_alerts: Dict[str, ZoneAlert] = {}
        self.shelters: List[Dict] = []
    
    def set_shelters(self, shelters: List[Dict]):
        """
        Cập nhật danh sách shelters.
        
        Args:
            shelters: List of shelter dicts với keys:
                - id, name, lat, lng, capacity, available_beds
        """
        self.shelters = shelters
    
    def generate_alerts(
        self,
        current_predictions: List[Dict],
        threshold_minutes: float = 60.0
    ) -> CascadeAlertReport:
        """
        Generate alerts dựa trên current predictions.
        
        Args:
            current_predictions: List of prediction dicts với keys:
                - node_id, lat, lng, flooded, arrival_time_minutes, 
                - water_depth_m, risk_score
            threshold_minutes: Chỉ tạo alert nếu arrival < threshold
            
        Returns:
            CascadeAlertReport với new/escalated/cleared alerts
        """
        new_alerts: List[ZoneAlert] = []
        escalated: List[ZoneAlert] = []
        cleared: List[str] = []
        
        current_zones = {p['node_id']: p for p in current_predictions if p.get('flooded')}
        previous_zones = set(self.previous_state.keys())
        current_zones_ids = set(current_zones.keys())
        
        # 1. Tạo alerts mới cho zones mới bị ngập
        newly_flooded = current_zones_ids - previous_zones
        for zone_id in newly_flooded:
            pred = current_zones[zone_id]
            if pred.get('arrival_time_minutes', 999) <= threshold_minutes:
                alert = self._create_alert(zone_id, pred, is_new=True)
                if alert:
                    new_alerts.append(alert)
                    self.active_alerts[zone_id] = alert
        
        # 2. Kiểm tra escalation cho zones đang ngập
        still_flooded = current_zones_ids & previous_zones
        for zone_id in still_flooded:
            pred = current_zones[zone_id]
            prev_pred = self.previous_state[zone_id]
            
            escalation = self._check_escalation(pred, prev_pred)
            
            if escalation:
                alert = self._create_alert(zone_id, pred, is_new=False)
                if alert and alert.severity != self.active_alerts.get(zone_id, alert).severity:
                    escalated.append(alert)
                    self.active_alerts[zone_id] = alert
        
        # 3. Xóa alerts cho zones không còn bị ngập
        cleared_zones = previous_zones - current_zones_ids
        for zone_id in cleared_zones:
            if zone_id in self.active_alerts:
                cleared.append(zone_id)
                del self.active_alerts[zone_id]
        
        # 4. Lưu state mới
        self.previous_state = {
            zone_id: current_zones[zone_id] 
            for zone_id in current_zones_ids
        }
        
        # 5. Tính priority evacuation
        priority_zones = self._calculate_priority_evacuation(current_predictions)
        
        # 6. Tính shelters needed
        shelters_needed = len([
            z for z in current_predictions 
            if z.get('arrival_time_minutes', 999) <= 60 
            and z.get('water_depth_m', 0) > 0.3
        ])
        
        return CascadeAlertReport(
            timestamp=datetime.now(),
            total_zones_affected=len(current_zones_ids),
            new_alerts=new_alerts,
            escalated_alerts=escalated,
            cleared_alerts=cleared,
            priority_evacuation_zones=priority_zones,
            shelters_needed=shelters_needed
        )
    
    def _create_alert(
        self,
        zone_id: str,
        prediction: Dict,
        is_new: bool = False
    ) -> Optional[ZoneAlert]:
        """Tạo alert cho một zone."""
        depth = prediction.get('water_depth_m', 0)
        arrival = prediction.get('arrival_time_minutes', 999)
        risk = prediction.get('risk_score', 0)
        
        severity = self._determine_severity(depth, arrival, risk)
        alert_type = self._determine_alert_type(severity, arrival)
        title, message = self._create_message(zone_id, depth, arrival, severity)
        nearby_shelter = self._find_nearby_shelter(
            prediction.get('lat'), 
            prediction.get('lng')
        )
        action = self._get_recommended_action(severity, arrival, nearby_shelter)
        
        return ZoneAlert(
            zone_id=zone_id,
            zone_name=self._format_zone_name(zone_id),
            severity=severity,
            alert_type=alert_type,
            title=title,
            message=message,
            affected_area=f"Khu vực {self._format_zone_name(zone_id)}",
            lat=prediction.get('lat', 16.0544),
            lng=prediction.get('lng', 108.2022),
            arrival_time_minutes=arrival,
            water_depth_m=depth,
            recommended_action=action,
            shelter_nearby=nearby_shelter.get('name') if nearby_shelter else None,
            shelter_distance_m=nearby_shelter.get('distance_m') if nearby_shelter else None
        )
    
    def _determine_severity(
        self,
        depth: float,
        arrival_time: float,
        risk: float
    ) -> AlertSeverity:
        """Xác định severity của alert."""
        if depth >= self.CRITICAL_DEPTH_M:
            base = AlertSeverity.CRITICAL
        elif depth >= self.HIGH_DEPTH_M:
            base = AlertSeverity.HIGH
        elif depth >= self.MEDIUM_DEPTH_M:
            base = AlertSeverity.MEDIUM
        else:
            base = AlertSeverity.LOW
        
        if arrival_time < 15:
            if base == AlertSeverity.LOW:
                base = AlertSeverity.MEDIUM
            elif base == AlertSeverity.MEDIUM:
                base = AlertSeverity.HIGH
            elif base == AlertSeverity.HIGH:
                base = AlertSeverity.CRITICAL
        elif arrival_time < 30:
            if base == AlertSeverity.MEDIUM:
                base = AlertSeverity.HIGH
        
        return base
    
    def _determine_alert_type(
        self,
        severity: AlertSeverity,
        arrival_time: float
    ) -> AlertType:
        """Xác định loại alert."""
        if severity == AlertSeverity.CRITICAL or arrival_time < 15:
            return AlertType.EVACUATION_ORDER
        elif severity in [AlertSeverity.HIGH, AlertSeverity.MEDIUM]:
            return AlertType.FLOOD_WARNING
        else:
            return AlertType.RAIN_ALERT
    
    def _create_message(
        self,
        zone_id: str,
        depth: float,
        arrival: float,
        severity: AlertSeverity
    ) -> tuple[str, str]:
        """Tạo title và message cho alert."""
        zone_name = self._format_zone_name(zone_id)
        
        if arrival < 1:
            title = f"NGAP LUT NGAY: {zone_name}"
            message = f"Dang co ngap tai {zone_name}. Do sau: {depth:.1f}m. Can son tan ngay!"
        elif arrival < 30:
            title = f"CANH BAO: {zone_name} sap ngap"
            message = f"Du kien ngap trong {int(arrival)} phut. Do sau: {depth:.1f}m. Chuan bi son tan."
        elif arrival < 60:
            title = f"CHU Y: Ngap lut sap den {zone_name}"
            message = f"Du kien ngap trong {int(arrival)} phut. Do sau: {depth:.1f}m."
        else:
            title = f"Theo doi: {zone_name}"
            message = f"Co nguy co ngap trong vai gio toi. Do sau du kien: {depth:.1f}m."
        
        return title, message
    
    def _find_nearby_shelter(
        self,
        lat: float,
        lng: float,
        max_distance_m: float = 2000
    ) -> Optional[Dict]:
        """Tìm shelter gần nhất."""
        if not self.shelters:
            return None
        
        def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371000
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
        
        nearest = None
        min_dist = max_distance_m
        
        for shelter in self.shelters:
            dist = haversine(lat, lng, shelter.get('lat', 0), shelter.get('lng', 0))
            if dist < min_dist:
                min_dist = dist
                nearest = {**shelter, 'distance_m': round(dist)}
        
        return nearest
    
    def _get_recommended_action(
        self,
        severity: AlertSeverity,
        arrival_time: float,
        shelter: Optional[Dict]
    ) -> str:
        """Lấy recommended action."""
        if severity == AlertSeverity.CRITICAL or arrival_time < 15:
            if shelter:
                return f"SON TAN NGAY! Den {shelter['name']} (cach {shelter['distance_m']:.0f}m)"
            return "SON TAN NGAY! Den noi tru an cao nhat gan ban"
        elif severity == AlertSeverity.HIGH:
            if shelter:
                return f"Chuan bi son tan. Shelter: {shelter['name']} (cach {shelter['distance_m']:.0f}m)"
            return "Chuan bi son tan den noi cao"
        elif severity == AlertSeverity.MEDIUM:
            return "Theo doi muc nuoc, chuan bi di chuyen den noi cao"
        else:
            return "Theo doi thoi tiet, cap nhat thong tin"
    
    def _check_escalation(
        self,
        current: Dict,
        previous: Dict
    ) -> bool:
        """Kiểm tra xem có cần escalate không."""
        current_depth = current.get('water_depth_m', 0)
        prev_depth = previous.get('water_depth_m', 0)
        
        if current_depth > prev_depth * 1.2:
            return True
        
        current_risk = current.get('risk_score', 0)
        prev_risk = previous.get('risk_score', 0)
        if current_risk - prev_risk > 0.2:
            return True
        
        return False
    
    def _calculate_priority_evacuation(
        self,
        predictions: List[Dict]
    ) -> List[str]:
        """Tính zones cần ưu tiên sơ tán."""
        sorted_preds = sorted(
            predictions,
            key=lambda p: (
                p.get('arrival_time_minutes', 999),
                -p.get('water_depth_m', 0)
            )
        )
        
        return [
            p['node_id'] for p in sorted_preds[:5] 
            if p.get('arrival_time_minutes', 999) <= 60
        ]
    
    def _format_zone_name(self, zone_id: str) -> str:
        """Format zone_id thành tên đẹp."""
        name = re.sub(r'([a-z])([A-Z])', r'\1 \2', zone_id)
        return name.title()


if __name__ == "__main__":
    generator = CascadeAlertGenerator()
    
    # Thêm shelters mẫu
    shelters = [
        {"id": 1, "name": "Truong THCS Hai Chau", "lat": 16.0540, "lng": 108.2020, "capacity": 500, "available_beds": 200},
        {"id": 2, "name": "Truong THPT Chuyen Le Quy Don", "lat": 16.0620, "lng": 108.2150, "capacity": 300, "available_beds": 150},
    ]
    generator.set_shelters(shelters)
    
    # Round 1: Initial predictions
    predictions_1 = [
        {"node_id": "haiChau", "lat": 16.0544, "lng": 108.2022, "flooded": True, 
         "arrival_time_minutes": 0, "water_depth_m": 1.5, "risk_score": 0.9},
    ]
    
    report1 = generator.generate_alerts(predictions_1)
    print(f"\n=== ROUND 1 - Initial Alert ===")
    print(f"{'='*60}")
    print(f"New alerts: {len(report1.new_alerts)}")
    for alert in report1.new_alerts:
        print(f"  [{alert.severity.value.upper()}] {alert.title}")
        print(f"    {alert.message}")
        if alert.shelter_nearby:
            print(f"    Shelter gan nhat: {alert.shelter_nearby} ({alert.shelter_distance_m:.0f}m)")
    
    # Round 2: Escalation - ngập lan rộng
    predictions_2 = [
        {"node_id": "haiChau", "lat": 16.0544, "lng": 108.2022, "flooded": True, 
         "arrival_time_minutes": 5, "water_depth_m": 2.0, "risk_score": 0.98},
        {"node_id": "thanhKhe", "lat": 16.0600, "lng": 108.2100, "flooded": True, 
         "arrival_time_minutes": 8, "water_depth_m": 1.2, "risk_score": 0.75},
        {"node_id": "lienChieu", "lat": 16.0700, "lng": 108.1800, "flooded": True, 
         "arrival_time_minutes": 15, "water_depth_m": 0.5, "risk_score": 0.5},
    ]
    
    report2 = generator.generate_alerts(predictions_2)
    print(f"\n=== ROUND 2 - Escalation ===")
    print(f"{'='*60}")
    print(f"New alerts: {len(report2.new_alerts)}")
    print(f"Escalated: {len(report2.escalated_alerts)}")
    print(f"Priority evacuation: {report2.priority_evacuation_zones}")
    
    for alert in report2.new_alerts:
        print(f"\n  [{alert.severity.value.upper()}] {alert.title}")
        print(f"    {alert.message}")
        print(f"    Action: {alert.recommended_action}")
    
    for alert in report2.escalated_alerts:
        print(f"\n  ESCALATED [{alert.severity.value.upper()}] {alert.title}")
        print(f"    {alert.message}")
