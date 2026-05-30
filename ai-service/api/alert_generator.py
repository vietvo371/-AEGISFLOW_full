"""
AegisFlow Cascade Alert Generator API
Nhận predictions từ BFS, generate cascade alerts, và return alerts cho frontend.
"""

import sys
sys.path.insert(0, '..')

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from services.cascade_alert_generator import (
    CascadeAlertGenerator,
    AlertSeverity,
    AlertType,
    ZoneAlert,
    CascadeAlertReport
)
from services.flood_spread_bfs import FloodSpreadBFS, FloodNode as Node

router = APIRouter(prefix="/alerts", tags=["cascade-alerts"])

# Global generator instance
alert_generator = CascadeAlertGenerator()

# Load shelters từ config hoặc default
DEFAULT_SHELTERS = [
    {"id": 1, "name": "Trường THCS Hải Châu", "lat": 16.0540, "lng": 108.2020, "capacity": 500, "available_beds": 200},
    {"id": 2, "name": "Trường THPT Chuyên Lê Quý Đôn", "lat": 16.0620, "lng": 108.2150, "capacity": 300, "available_beds": 150},
    {"id": 3, "name": "Trường Tiểu học Thanh Khê", "lat": 16.0610, "lng": 108.2080, "capacity": 200, "available_beds": 100},
    {"id": 4, "name": "Trường THCS Liên Chiểu", "lat": 16.0680, "lng": 108.1820, "capacity": 400, "available_beds": 250},
    {"id": 5, "name": "Trường TH Hòa Vang", "lat": 16.0480, "lng": 108.1520, "capacity": 150, "available_beds": 80},
]

# Initialize shelters
alert_generator.set_shelters(DEFAULT_SHELTERS)


# Request/Response models
class PredictionInput(BaseModel):
    """Input cho BFS prediction."""
    node_id: str = Field(..., description="ID của node")
    lat: float = Field(..., description="Vĩ độ")
    lng: float = Field(..., description="Kinh độ")
    elevation: float = Field(default=3.0, description="Độ cao (m)")
    neighbors: List[str] = Field(default_factory=list, description="IDs của nodes kết nối")


class SeedPointInput(BaseModel):
    """Điểm ngập ban đầu."""
    node_id: str = Field(..., description="ID của node")
    water_depth_m: float = Field(..., ge=0, description="Độ sâu nước (m)")


class AlertRequest(BaseModel):
    """Request để generate alerts."""
    seed_points: List[SeedPointInput] = Field(..., description="Các điểm ngập ban đầu")
    graph_nodes: Optional[List[PredictionInput]] = Field(None, description="Danh sách nodes (sẽ dùng default nếu empty)")
    rainfall_mm_h: float = Field(default=50.0, ge=0, le=200, description="Cường độ mưa (mm/h)")
    duration_hours: float = Field(default=2.0, ge=0.5, le=6, description="Thời gian dự báo (giờ)")
    elevation_threshold_m: float = Field(default=5.0, ge=0, description="Ngưỡng độ cao tối đa bị ngập")


class AlertResponse(BaseModel):
    """Response chứa alerts."""
    timestamp: str
    total_zones_affected: int
    new_alerts: List[Dict]
    escalated_alerts: List[Dict]
    cleared_alerts: List[str]
    priority_evacuation_zones: List[str]
    shelters_needed: int
    predictions: List[Dict]


class AlertGeoJSON(BaseModel):
    """GeoJSON response cho map."""
    type: str = "FeatureCollection"
    features: List[Dict]


@router.post("/generate", response_model=AlertResponse)
async def generate_cascade_alerts(request: AlertRequest):
    """
    Generate cascade alerts từ seed points và BFS prediction.
    
    Workflow:
    1. Build street graph từ graph_nodes hoặc default
    2. Chạy BFS prediction
    3. Generate cascade alerts
    4. Return alerts + predictions
    """
    try:
        # Build graph
        if request.graph_nodes:
            graph = {
                node.node_id: Node(
                    id=node.node_id,
                    lat=node.lat,
                    lng=node.lng,
                    elevation=node.elevation,
                    neighbors=node.neighbors
                )
                for node in request.graph_nodes
            }
        else:
            # Use default Da Nang graph
            graph = _get_default_danang_graph()
        
        # Run BFS
        bfs = FloodSpreadBFS(graph)
        seed_list = [(sp.node_id, sp.water_depth_m) for sp in request.seed_points]
        
        bfs_result = bfs.predict(
            seed_points=seed_list,
            rainfall_mm_h=request.rainfall_mm_h,
            duration_hours=request.duration_hours,
            elevation_threshold_m=request.elevation_threshold_m
        )
        
        # Convert predictions to dict format
        predictions = [
            {
                "node_id": p.node_id,
                "lat": p.lat,
                "lng": p.lng,
                "flooded": p.flooded,
                "arrival_time_minutes": p.arrival_time_minutes,
                "water_depth_m": p.water_depth_m,
                "risk_score": p.risk_score
            }
            for p in bfs_result.predictions
        ]
        
        # Generate cascade alerts
        alert_report = alert_generator.generate_alerts(predictions)
        
        # Format response
        return AlertResponse(
            timestamp=alert_report.timestamp.isoformat(),
            total_zones_affected=alert_report.total_zones_affected,
            new_alerts=[_alert_to_dict(a) for a in alert_report.new_alerts],
            escalated_alerts=[_alert_to_dict(a) for a in alert_report.escalated_alerts],
            cleared_alerts=alert_report.cleared_alerts,
            priority_evacuation_zones=alert_report.priority_evacuation_zones,
            shelters_needed=alert_report.shelters_needed,
            predictions=predictions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geojson", response_model=AlertGeoJSON)
async def get_alerts_geojson():
    """
    Get all active alerts as GeoJSON for map display.
    """
    features = []
    
    for zone_id, alert in alert_generator.active_alerts.items():
        features.append({
            "type": "Feature",
            "id": zone_id,
            "properties": {
                "zone_id": alert.zone_id,
                "zone_name": alert.zone_name,
                "severity": alert.severity.value,
                "alert_type": alert.alert_type.value,
                "title": alert.title,
                "message": alert.message,
                "arrival_time_minutes": alert.arrival_time_minutes,
                "water_depth_m": alert.water_depth_m,
                "recommended_action": alert.recommended_action,
                "shelter_nearby": alert.shelter_nearby,
                "shelter_distance_m": alert.shelter_distance_m,
                "color": _severity_to_color(alert.severity)
            },
            "geometry": {
                "type": "Point",
                "coordinates": [alert.lng, alert.lat]
            }
        })
    
    return AlertGeoJSON(type="FeatureCollection", features=features)


@router.get("/active")
async def get_active_alerts():
    """
    Get all active alerts as list.
    """
    return {
        "count": len(alert_generator.active_alerts),
        "alerts": [_alert_to_dict(a) for a in alert_generator.active_alerts.values()]
    }


@router.post("/clear/{zone_id}")
async def clear_alert(zone_id: str):
    """
    Clear alert for a specific zone.
    """
    if zone_id in alert_generator.active_alerts:
        del alert_generator.active_alerts[zone_id]
        return {"success": True, "message": f"Alert for {zone_id} cleared"}
    return {"success": False, "message": f"No active alert for {zone_id}"}


@router.post("/clear-all")
async def clear_all_alerts():
    """
    Clear all active alerts.
    """
    count = len(alert_generator.active_alerts)
    alert_generator.active_alerts.clear()
    return {"success": True, "cleared_count": count}


def _alert_to_dict(alert: ZoneAlert) -> Dict:
    """Convert ZoneAlert to dict."""
    return {
        "zone_id": alert.zone_id,
        "zone_name": alert.zone_name,
        "severity": alert.severity.value,
        "alert_type": alert.alert_type.value,
        "title": alert.title,
        "message": alert.message,
        "affected_area": alert.affected_area,
        "lat": alert.lat,
        "lng": alert.lng,
        "arrival_time_minutes": alert.arrival_time_minutes,
        "water_depth_m": alert.water_depth_m,
        "recommended_action": alert.recommended_action,
        "shelter_nearby": alert.shelter_nearby,
        "shelter_distance_m": alert.shelter_distance_m,
        "color": _severity_to_color(alert.severity)
    }


def _severity_to_color(severity: AlertSeverity) -> str:
    """Map severity to color hex."""
    colors = {
        AlertSeverity.CRITICAL: "#EF4444",  # Red
        AlertSeverity.HIGH: "#F97316",      # Orange
        AlertSeverity.MEDIUM: "#EAB308",    # Yellow
        AlertSeverity.LOW: "#3B82F6",       # Blue
    }
    return colors.get(severity, "#6B7280")  # Gray default


def _get_default_danang_graph() -> Dict[str, Node]:
    """Get default Da Nang flood network graph."""
    return {
        "hai_chau": Node("hai_chau", 16.0544, 108.2022, 2.0, ["thanh_khe", "son_tra", "an_trung", "hoa_thuan", "cho_bac", "song_han"]),
        "thanh_khe": Node("thanh_khe", 16.0600, 108.1900, 3.5, ["hai_chau", "thanh_khe_tay", "lien_chieu", "tam_thuan"]),
        "lien_chieu": Node("lien_chieu", 16.0700, 108.1500, 8.0, ["thanh_khe", "truong_dh_kt", "cau_thuan_phuoc", "kcx_hoa_khanh"]),
        "son_tra": Node("son_tra", 16.0800, 108.2500, 25.0, ["ngu_hanh_son", "cau_thuan_phuoc", "bv_ung_buou", "my_khe"]),
        "ngu_hanh_son": Node("ngu_hanh_son", 16.0650, 108.2450, 15.0, ["son_tra", "cau_thuan_phuoc", "non_nuoc"]),
        "hoa_vang": Node("hoa_vang", 16.0300, 108.1200, 20.0, ["song_cu_da_nang", "kcx_thanh_vinh", "hoang_sa"]),
        "cho_bac": Node("cho_bac", 16.0500, 108.1950, 1.0, ["hai_chau", "hoa_thuan", "con_shopping_market"]),
        "cam_le": Node("cam_le", 16.0450, 108.1800, 5.0, ["tam_thuan", "phuoc_hiep", "truong_dh_kt", "song_cu_da_nang"]),
    }
