# -*- coding: utf-8 -*-
"""
AegisFlow AI — Enhanced Route Optimizer
Sử dụng real road network từ danang_flood_graph.json
"""

import json
import math
import heapq
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass


@dataclass
class RouteNode:
    """Node trong route graph."""
    id: str
    lat: float
    lng: float
    elevation: float
    district: str
    is_safe: bool = False  # Cao > 10m hoặc landmark


@dataclass
class RouteEdge:
    """Edge với metadata."""
    from_node: str
    to_node: str
    distance_m: float
    road_type: str
    elevation_diff: float
    is_flooded: bool = False
    safety_score: float = 1.0


class RouteGraph:
    """Graph cho route optimization."""

    def __init__(self):
        self.nodes: Dict[str, RouteNode] = {}
        self.edges: Dict[Tuple[str, str], RouteEdge] = {}
        self.adjacency: Dict[str, List[str]] = {}
        self._load_danang_graph()

    def _load_danang_graph(self):
        """Load Đà Nẵng graph từ file."""
        graph_path = Path(__file__).parent.parent / "data" / "danang_flood_graph.json"

        if not graph_path.exists():
            print("[RouteOptimizer] Graph file not found, using minimal graph")
            self._create_minimal_graph()
            return

        with open(graph_path) as f:
            data = json.load(f)

        # Load nodes
        for node_id, node_data in data.items():
            elevation = node_data.get("elevation", 5.0)
            is_safe = elevation > 10 or node_data.get("district") in ["landmark", "highland"]

            self.nodes[node_id] = RouteNode(
                id=node_id,
                lat=node_data["lat"],
                lng=node_data["lng"],
                elevation=elevation,
                district=node_data.get("district", ""),
                is_safe=is_safe,
            )
            self.adjacency[node_id] = []

        # Load edges (bidirectional)
        for node_id, node_data in data.items():
            for neighbor_id in node_data.get("neighbors", []):
                if neighbor_id in self.nodes:
                    # Calculate edge properties
                    node1 = self.nodes[node_id]
                    node2 = self.nodes[neighbor_id]
                    distance = self._haversine(
                        node1.lat, node1.lng, node2.lat, node2.lng
                    )
                    elevation_diff = abs(node1.elevation - node2.elevation)

                    # Road type detection (simple)
                    road_type = "secondary"
                    if node1.district != node2.district:
                        road_type = "primary"

                    edge = RouteEdge(
                        from_node=node_id,
                        to_node=neighbor_id,
                        distance_m=distance,
                        road_type=road_type,
                        elevation_diff=elevation_diff,
                    )

                    self.edges[(node_id, neighbor_id)] = edge
                    self.edges[(neighbor_id, node_id)] = edge
                    self.adjacency[node_id].append(neighbor_id)

    def _create_minimal_graph(self):
        """Fallback minimal graph."""
        positions = {
            "hai_chau": (16.0544, 108.2022, 2.0),
            "thanh_khe": (16.0600, 108.1900, 3.5),
            "son_tra": (16.0800, 108.2500, 25.0),
            "lien_chieu": (16.0700, 108.1500, 8.0),
        }

        for node_id, (lat, lng, elev) in positions.items():
            self.nodes[node_id] = RouteNode(
                id=node_id, lat=lat, lng=lng, elevation=elev,
                district=node_id, is_safe=elev > 10
            )
            self.adjacency[node_id] = []

        # Add edges
        edges = [
            ("hai_chau", "thanh_khe"),
            ("hai_chau", "son_tra"),
            ("thanh_khe", "lien_chieu"),
        ]

        for n1, n2 in edges:
            d = self._haversine(
                self.nodes[n1].lat, self.nodes[n1].lng,
                self.nodes[n2].lat, self.nodes[n2].lng
            )
            edge = RouteEdge(n1, n2, d, "secondary", 0)
            self.edges[(n1, n2)] = edge
            self.edges[(n2, n1)] = edge
            self.adjacency[n1].append(n2)
            self.adjacency[n2].append(n1)

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance in meters."""
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    def mark_flooded(self, flooded_nodes: List[str], max_depth: float = 2.0):
        """Mark nodes as flooded."""
        for node_id in flooded_nodes:
            if node_id in self.nodes:
                node = self.nodes[node_id]
                # Mark edges to flooded nodes as unsafe
                for neighbor in self.adjacency.get(node_id, []):
                    if (node_id, neighbor) in self.edges:
                        edge = self.edges[(node_id, neighbor)]
                        edge.is_flooded = True
                        edge.safety_score = max(0.1, 1.0 - (max_depth / 5))

    def find_closest_node(self, lat: float, lng: float) -> str:
        """Find closest graph node to coordinates."""
        min_dist = float('inf')
        closest = None

        for node_id, node in self.nodes.items():
            dist = self._haversine(lat, lng, node.lat, node.lng)
            if dist < min_dist:
                min_dist = dist
                closest = node_id

        return closest

    def find_path(
        self,
        start_id: str,
        end_id: str,
        avoid_flooded: bool = True,
        prefer_safe: bool = True
    ) -> Tuple[List[str], float, float]:
        """
        A* pathfinding với multiple objectives.

        Returns: (path, distance_m, safety_score)
        """
        if start_id not in self.nodes or end_id not in self.nodes:
            return [], 0, 0

        # A* with safety
        open_set = [(0, start_id)]
        came_from = {}
        g_score = {start_id: 0}
        safety_score = {start_id: 1.0}

        while open_set:
            _, current = heapq.heappop(open_set)

            if current == end_id:
                # Reconstruct path
                path = [current]
                node = end_id
                while node in came_from:
                    node = came_from[node]
                    path.append(node)
                path.reverse()

                total_safety = safety_score.get(end_id, 0.5)
                return path, g_score[end_id], total_safety

            for neighbor in self.adjacency.get(current, []):
                edge = self.edges.get((current, neighbor))
                if not edge:
                    continue

                # Skip flooded edges if needed
                if avoid_flooded and edge.is_flooded:
                    continue

                # Calculate cost
                move_cost = edge.distance_m

                # Safety penalty
                if edge.is_flooded:
                    move_cost *= 3
                elif prefer_safe:
                    # Bonus for reaching safe nodes
                    if self.nodes[neighbor].is_safe:
                        move_cost *= 0.7

                # Elevation penalty (avoid going downhill to flooded areas)
                if edge.elevation_diff > 3:
                    move_cost *= 1.2

                tentative_g = g_score.get(current, float('inf')) + move_cost

                if tentative_g < g_score.get(neighbor, float('inf')):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g

                    # Update safety score
                    edge_safety = edge.safety_score if edge.is_flooded else 1.0
                    safety_score[neighbor] = min(safety_score.get(current, 1), edge_safety)

                    # A* heuristic
                    target = self.nodes[end_id]
                    current_node = self.nodes[neighbor]
                    heuristic = self._haversine(
                        current_node.lat, current_node.lng,
                        target.lat, target.lng
                    )

                    priority = tentative_g + heuristic
                    heapq.heappush(open_set, (priority, neighbor))

        return [], 0, 0

    def get_safe_nodes(self) -> List[str]:
        """Get all safe destination nodes."""
        return [n.id for n in self.nodes.values() if n.is_safe]

    def get_flooded_nodes(self) -> List[str]:
        """Get nodes marked as flooded."""
        return [
            n_id for n_id, e in self.edges.items()
            if e.is_flooded and e.from_node == n_id
        ]


class RouteOptimizer:
    """
    Route optimizer sử dụng real Đà Nẵng graph.
    """

    def __init__(self):
        self.graph = RouteGraph()

    def calculate_optimal_route(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
        flooded_areas: List[Dict[str, float]] = None,
        avoid_water_level: float = 1.5
    ) -> Dict[str, Any]:
        """
        Tính route tối ưu tránh vùng ngập.

        Args:
            start_lat/lon: Vị trí bắt đầu
            end_lat/lon: Vị trí kết thúc
            flooded_areas: List of {"node_id": str, "depth_m": float} hoặc {"lat": float, "lng": float, "depth_m": float}
            avoid_water_level: Ngưỡng nước cần tránh (m)
        """
        flooded_areas = flooded_areas or []

        # Mark flooded areas
        flooded_node_ids = []
        for area in flooded_areas:
            if "node_id" in area:
                flooded_node_ids.append(area["node_id"])
            else:
                # Find closest node to flooded coordinates
                closest = self.graph.find_closest_node(area["lat"], area["lng"])
                if closest:
                    flooded_node_ids.append(closest)

        max_depth = max((a.get("depth_m", 1.0) for a in flooded_areas), default=1.5)
        self.graph.mark_flooded(flooded_node_ids, max_depth)

        # Find closest graph nodes
        start_node = self.graph.find_closest_node(start_lat, start_lon)
        end_node = self.graph.find_closest_node(end_lat, end_lon)

        if not start_node or not end_node:
            return self._fallback_route(start_lat, start_lon, end_lat, end_lon)

        # Find path
        path, distance, safety = self.graph.find_path(
            start_node, end_node,
            avoid_flooded=True,
            prefer_safe=True
        )

        if not path:
            # Try without avoiding flooded
            path, distance, safety = self.graph.find_path(
                start_node, end_node,
                avoid_flooded=False
            )

            if path:
                safety *= 0.7  # Penalize flooded route

        # Generate route points
        route_points = []
        if path:
            for node_id in path:
                node = self.graph.nodes[node_id]
                route_points.append({
                    "node_id": node_id,
                    "lat": node.lat,
                    "lng": node.lng,
                    "elevation": node.elevation,
                    "district": node.district,
                    "is_safe": node.is_safe,
                })
        else:
            route_points = self._generate_direct_route(start_lat, start_lon, end_lat, end_lon)

        # Calculate ETA
        # Walking: 4 km/h, Running: 7 km/h
        walking_speed_ms = 4 / 3.6  # 1.11 m/s
        running_speed_ms = 7 / 3.6  # 1.94 m/s

        avg_speed = running_speed_ms if safety < 0.8 else walking_speed_ms
        eta_seconds = distance / avg_speed

        # Get safe alternatives
        safe_destinations = self._find_safe_destinations(start_node, path)

        return {
            "route_points": route_points,
            "total_distance_meters": round(distance, 2),
            "estimated_time_seconds": int(eta_seconds),
            "estimated_time_display": self._format_time(eta_seconds),
            "safety_score": round(max(0.1, safety), 2),
            "is_safe": safety > 0.6,
            "flooded_nodes_avoided": flooded_node_ids,
            "safe_alternatives": safe_destinations,
            "start_node": start_node,
            "end_node": end_node,
        }

    def _find_safe_destinations(self, start_node: str, current_path: List[str]) -> List[Dict]:
        """Tìm các điểm an toàn thay thế."""
        safe_nodes = self.graph.get_safe_nodes()
        safe_alts = []

        for node_id in safe_nodes[:5]:  # Top 5
            if node_id == start_node or node_id in current_path:
                continue

            path, dist, safety = self.graph.find_path(start_node, node_id)
            if path:
                safe_alts.append({
                    "node_id": node_id,
                    "distance_m": round(dist),
                    "time_minutes": int(dist / (4 / 3.6) / 60),
                    "safety_score": round(safety, 2),
                })

        return sorted(safe_alts, key=lambda x: x["time_minutes"])[:3]

    def _fallback_route(self, start_lat, start_lon, end_lat, end_lon) -> Dict:
        """Fallback khi không tìm được đường."""
        distance = self.graph._haversine(start_lat, start_lon, end_lat, end_lon)

        return {
            "route_points": self._generate_direct_route(start_lat, start_lon, end_lat, end_lon),
            "total_distance_meters": round(distance, 2),
            "estimated_time_seconds": int(distance / (4 / 3.6)),
            "estimated_time_display": self._format_time(distance / (4 / 3.6)),
            "safety_score": 0.5,
            "is_safe": False,
            "warning": "Direct route - graph path not available",
        }

    def _generate_direct_route(self, start_lat, start_lon, end_lat, end_lon) -> List[Dict]:
        """Generate simple direct route."""
        return [
            {"lat": start_lat, "lng": start_lon},
            {"lat": (start_lat + end_lat) / 2, "lng": (start_lon + end_lon) / 2},
            {"lat": end_lat, "lng": end_lon},
        ]

    def _format_time(self, seconds: float) -> str:
        """Format time display."""
        if seconds < 60:
            return f"{int(seconds)} seconds"
        elif seconds < 3600:
            return f"{int(seconds // 60)} minutes"
        else:
            hours = int(seconds // 3600)
            mins = int((seconds % 3600) // 60)
            return f"{hours}h {mins}m"


# Global instance
_route_optimizer: Optional[RouteOptimizer] = None


def get_route_optimizer() -> RouteOptimizer:
    """Get global route optimizer."""
    global _route_optimizer
    if _route_optimizer is None:
        _route_optimizer = RouteOptimizer()
    return _route_optimizer


def calculate_optimal_route(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    flooded_areas: List[Dict[str, float]] = None
) -> Dict[str, Any]:
    """Convenience function."""
    optimizer = get_route_optimizer()
    return optimizer.calculate_optimal_route(
        start_lat, start_lon, end_lat, end_lon, flooded_areas
    )


if __name__ == "__main__":
    # Demo
    optimizer = RouteOptimizer()

    # Route từ khu vực ngập đến nơi an toàn
    result = optimizer.calculate_optimal_route(
        start_lat=16.0544,  # Hải Châu
        start_lon=108.2022,
        end_lat=16.0800,    # Sơn Trà (cao)
        end_lon=108.2500,
        flooded_areas=[
            {"lat": 16.0550, "lng": 108.2000, "depth_m": 1.5},  # Khu ngập
        ]
    )

    print("=" * 50)
    print("OPTIMAL EVACUATION ROUTE")
    print("=" * 50)
    print(f"Distance: {result['total_distance_meters']:.0f}m")
    print(f"ETA: {result['estimated_time_display']}")
    print(f"Safety: {result['safety_score']:.0%}")
    print(f"Is Safe: {result['is_safe']}")

    print(f"\nRoute ({len(result['route_points'])} waypoints):")
    for i, point in enumerate(result['route_points']):
        safe = "🏠" if point.get("is_safe") else "📍"
        elev = point.get("elevation", 0)
        print(f"  {i+1}. {safe} {point.get('node_id', 'point')} (elev: {elev}m)")

    if result.get('safe_alternatives'):
        print(f"\nSafe Alternatives:")
        for alt in result['safe_alternatives']:
            print(f"  → {alt['node_id']}: {alt['time_minutes']}min, safety: {alt['safety_score']:.0%}")
