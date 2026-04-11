from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

from services.flood_calculator import calculate_flood_risk
from services.priority_calculator import calculate_rescue_priority
from services.shelter_calculator import calculate_shelter_score
from services.route_optimizer import calculate_optimal_route

router = APIRouter()

class FloodPredictionRequest(BaseModel):
    water_level_m: float
    rainfall_mm: float
    hours_rain: int
    tide_level: Optional[float] = 0.0
    historical_score: Optional[float] = 0.0

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
    flooded_areas: Optional[List[Dict[str, float]]] = None

@router.post("/predict-risk")
async def predict_risk(request: FloodPredictionRequest):
    return calculate_flood_risk(
        water_level_m=request.water_level_m,
        rainfall_mm=request.rainfall_mm,
        hours_rain=request.hours_rain,
        tide_level=request.tide_level,
        historical_score=request.historical_score
    )

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
    return calculate_optimal_route(
        start_lat=request.start_lat,
        start_lon=request.start_lon,
        end_lat=request.end_lat,
        end_lon=request.end_lon,
        flooded_areas=request.flooded_areas
    )
