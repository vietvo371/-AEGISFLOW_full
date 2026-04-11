import math
from typing import Dict, Any, List

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on the earth (specified in decimal degrees)"""
    # convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

def calculate_shelter_score(
    shelter_lat: float,
    shelter_lon: float,
    request_lat: float,
    request_lon: float,
    shelter_capacity: int,
    shelter_occupancy: int,
    people_count: int,
    shelter_facilities: List[str],
    request_category: str
) -> Dict[str, Any]:
    """
    Calculate shelter suitability score (0-100) for a specific rescue request.
    """
    score = 100
    
    # 1. Distance (50 points)
    distance_km = haversine_distance(shelter_lat, shelter_lon, request_lat, request_lon)
    if distance_km <= 2:
        score += 50
    elif distance_km <= 5:
        score += 30
    elif distance_km <= 10:
        score += 10
    else:
        score -= 20 # Distance penalty

    # 2. Capacity (30 points)
    available = shelter_capacity - shelter_occupancy
    if available >= people_count * 2:
        score += 30
    elif available >= people_count:
        score += 15
    elif available > 0:
        score -= 10
    else:
        score -= 50 # Full penalty
        
    # 3. Facilities (20 points)
    # Determine needed facilities based on request category
    needed_facilities = []
    if request_category == 'medical':
        needed_facilities.append('first_aid')
    elif request_category == 'food' or request_category == 'water':
        needed_facilities.append('kitchen')
        needed_facilities.append('clean_water')
    
    for facility in needed_facilities:
        if facility in shelter_facilities:
            score += 5
            
    final_score = max(0.0, min(100.0, float(score)))
    
    return {
        'suitability_score': final_score,
        'distance_km': round(distance_km, 2),
        'available_capacity': available,
        'factors': {
            'distance_penalty': distance_km > 10,
            'capacity_warning': available < people_count
        }
    }
