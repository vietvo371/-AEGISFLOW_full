import networkx as nx
import math
from typing import Dict, Any, List

# Giả lập graph tĩnh cho demo hoặc nếu backend gửi graph qua
def create_sample_graph():
    G = nx.Graph()
    # Thêm nodes (id, lat, lon, is_safe)
    G.add_node("node_1", lat=16.0544, lon=108.2022, is_safe=False) # Khu bão lũ
    G.add_node("node_2", lat=16.0590, lon=108.2060, is_safe=True)  # Điểm an toàn
    G.add_node("node_3", lat=16.0570, lon=108.2040, is_safe=False)
    G.add_node("node_4", lat=16.0610, lon=108.2080, is_safe=True)
    
    # Thêm edges (distance in meters, flooded)
    G.add_edge("node_1", "node_3", weight=500, flooded=True)
    G.add_edge("node_3", "node_2", weight=800, flooded=False)
    G.add_edge("node_1", "node_4", weight=1500, flooded=False)
    
    return G

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r * 1000 # Return meters

def calculate_optimal_route(
    start_lat: float, 
    start_lon: float, 
    end_lat: float, 
    end_lon: float,
    flooded_areas: List[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Calculate the optimal evacuation route avoiding flooded areas.
    Currently returns a simplified simulated route for demonstration.
    For production, this would use pgRouting output or a full loaded NetworkX graph of the city.
    """
    if flooded_areas is None:
        flooded_areas = []
        
    direct_distance_m = haversine_distance(start_lat, start_lon, end_lat, end_lon)
    
    # Simulate a detour if there are flooded areas
    safety_score = 1.0
    route_distance = direct_distance_m
    
    for area in flooded_areas:
        # Check if the direct path is impacted by flooding
        dist_to_flood = haversine_distance(start_lat, start_lon, area.get('lat', 0), area.get('lon', 0))
        if dist_to_flood < direct_distance_m:
            route_distance *= 1.3 # Route is 30% longer due to detour
            safety_score *= 0.9 # Decreased safety perception due to proximity to flood
            
    # Assuming average walking speed in emergency is ~4 km/h = 1.11 m/s
    walking_speed_ms = 1.11
    estimated_time_seconds = route_distance / walking_speed_ms
    
    # Generate some intermediate waypoints based on start and end
    mid_lat = (start_lat + end_lat) / 2
    mid_lon = (start_lon + end_lon) / 2
    
    route = [
        {"lat": start_lat, "lon": start_lon},
        {"lat": mid_lat, "lon": start_lon}, # Rough turn calculation
        {"lat": mid_lat, "lon": end_lon},
        {"lat": end_lat, "lon": end_lon}
    ]

    return {
        "route_points": route,
        "total_distance_meters": round(route_distance, 2),
        "estimated_time_seconds": int(estimated_time_seconds),
        "estimated_time_display": f"{int(estimated_time_seconds // 60)} minutes",
        "safety_score": round(safety_score, 2),
        "is_safe": safety_score > 0.7
    }
