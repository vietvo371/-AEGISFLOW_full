"""
Flood Spread BFS Algorithm - Dự đoán vùng ngập lan rộng
AegisFlow AI Service
Enhanced với DanangFloodGraph
"""

from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple, Any
from collections import deque
from pathlib import Path
import json
import math


@dataclass
class FloodNode:
    """Đỉnh trong đồ thị ngập lụt (tương thích với Node cũ)."""
    id: str
    lat: float
    lng: float
    elevation: float
    neighbors: List[str]
    district: str = ""
    drainage_capacity: float = 0.5


# Backwards compatibility alias
Node = FloodNode


@dataclass
class FloodPrediction:
    """Kết quả dự đoán ngập lụt."""
    node_id: str
    lat: float
    lng: float
    flooded: bool
    arrival_time_minutes: float
    water_depth_m: float
    risk_score: float
    district: str = ""
    drainage_capacity: float = 0.5


@dataclass
class FloodSpreadResult:
    """Kết quả đầy đủ của thuật toán BFS."""
    predictions: List[FloodPrediction]
    total_nodes: int
    flooded_nodes: int
    critical_areas: List[str]
    evacuation_needed: List[str]
    spread_time_minutes: float
    high_risk_areas: List[Dict[str, Any]] = field(default_factory=list)
    safe_evacuation_routes: List[Dict[str, Any]] = field(default_factory=list)


class FloodSpreadBFS:
    """
    Thuật toán BFS dự đoán lan truyền ngập lụt.

    Logic:
    1. Bắt đầu từ các điểm ngập ban đầu (seed points)
    2. Lan truyền theo BFS, ưu tiên đỉnh có độ cao thấp hơn
    3. Tính thời gian và độ sâu nước dựa trên:
       - Khoảng cách đến nguồn ngập
       - Độ cao địa hình
       - Cường độ mưa
       - Khả năng thoát nước (drainage)
    """

    def __init__(
        self,
        street_graph: Dict[str, FloodNode] = None,
        water_speed_m_per_min: float = 50.0
    ):
        """
        Khởi tạo FloodSpreadBFS.

        Args:
            street_graph: Dictionary mapping node_id -> FloodNode object
            water_speed_m_per_min: Tốc độ nước di chuyển (m/phút)
        """
        self.graph = street_graph or {}
        self.water_speed_m_per_min = water_speed_m_per_min

        # Load default Danang graph if no graph provided
        if not self.graph:
            self._load_default_graph()

    def _load_default_graph(self):
        """Load default Đà Nẵng graph."""
        graph_path = Path(__file__).parent.parent / "data" / "danang_flood_graph.json"

        if graph_path.exists():
            try:
                with open(graph_path) as f:
                    data = json.load(f)

                self.graph = {}
                for node_id, node_data in data.items():
                    self.graph[node_id] = FloodNode(
                        id=node_id,
                        lat=node_data["lat"],
                        lng=node_data["lng"],
                        elevation=node_data["elevation"],
                        neighbors=node_data.get("neighbors", []),
                        district=node_data.get("district", ""),
                        drainage_capacity=node_data.get("drainage_capacity", 0.5),
                    )
                print(f"[FloodSpreadBFS] Loaded {len(self.graph)} nodes from {graph_path}")
            except Exception as e:
                print(f"[FloodSpreadBFS] Failed to load graph: {e}")
                self._create_minimal_graph()
        else:
            print("[FloodSpreadBFS] Graph file not found, using minimal graph")
            self._create_minimal_graph()

    def _create_minimal_graph(self):
        """Tạo minimal graph nếu không load được."""
        self.graph = {
            "hai_chau": FloodNode("hai_chau", 16.0544, 108.2022, 2.0, ["thanh_khe", "son_tra"]),
            "thanh_khe": FloodNode("thanh_khe", 16.0600, 108.1900, 3.5, ["hai_chau", "lien_chieu"]),
            "lien_chieu": FloodNode("lien_chieu", 16.0700, 108.1500, 8.0, ["thanh_khe", "hoa_vang"]),
            "hoa_vang": FloodNode("hoa_vang", 16.0300, 108.1200, 20.0, ["lien_chieu"]),
            "son_tra": FloodNode("son_tra", 16.0800, 108.2500, 25.0, ["hai_chau", "ngu_hanh_son"]),
            "ngu_hanh_son": FloodNode("ngu_hanh_son", 16.0650, 108.2450, 15.0, ["son_tra"]),
        }

    def predict(
        self,
        seed_points: List[Tuple[str, float]],
        rainfall_mm_h: float = 50.0,
        duration_hours: float = 2.0,
        elevation_threshold_m: float = 2.0
    ) -> FloodSpreadResult:
        """
        Dự đoán lan truyền ngập lụt.

        Args:
            seed_points: Danh sách các điểm ngập ban đầu với độ sâu nước
            rainfall_mm_h: Cường độ mưa (mm/giờ)
            duration_hours: Thời gian dự báo (giờ)
            elevation_threshold_m: Ngưỡng độ cao tối đa để bị ngập

        Returns:
            FloodSpreadResult với danh sách các vùng bị ngập
        """
        queue = deque()
        visited: Set[str] = set()
        predictions: Dict[str, FloodPrediction] = {}

        max_time_min = duration_hours * 60

        # Khởi tạo từ seed points
        for node_id, water_depth in seed_points:
            if node_id in self.graph:
                queue.append((0, node_id, water_depth, 0))
                visited.add(node_id)

        while queue:
            priority, node_id, water_depth, arrival_time = queue.popleft()

            if arrival_time > max_time_min:
                continue

            node = self.graph[node_id]

            # Skip nếu độ sâu quá nhỏ
            if water_depth < 0.1:
                continue

            # Lưu prediction
            risk_score = self._calculate_risk(
                node, water_depth, arrival_time, rainfall_mm_h
            )

            predictions[node_id] = FloodPrediction(
                node_id=node_id,
                lat=node.lat,
                lng=node.lng,
                flooded=True,
                arrival_time_minutes=arrival_time,
                water_depth_m=round(water_depth, 2),
                risk_score=risk_score,
                district=node.district,
                drainage_capacity=node.drainage_capacity,
            )

            # Lan truyền đến neighbors
            for neighbor_id in node.neighbors:
                if neighbor_id in visited:
                    continue
                if neighbor_id not in self.graph:
                    continue

                neighbor = self.graph[neighbor_id]

                # Kiểm tra elevation - nước chảy từ cao xuống thấp
                elevation_diff = node.elevation - neighbor.elevation

                # Nước có thể chảy ngược lên nếu có áp lực (mưa lớn)
                effective_diff = elevation_diff - (rainfall_mm_h / 100)

                if effective_diff < -1:
                    # Tính thời gian đến neighbor
                    distance = self._haversine(
                        node.lat, node.lng, neighbor.lat, neighbor.lng
                    )

                    # Adjust speed based on drainage capacity
                    avg_drainage = (node.drainage_capacity + neighbor.drainage_capacity) / 2
                    effective_speed = self.water_speed_m_per_min * (1 + avg_drainage) / 2

                    travel_time = distance / effective_speed

                    new_arrival = arrival_time + travel_time
                    new_depth = max(0.1, water_depth - (travel_time * 0.02))

                    # Priority: ưu tiên điểm thấp hơn
                    priority = new_arrival + (neighbor.elevation * 5)

                    queue.append((priority, neighbor_id, new_depth, new_arrival))
                    visited.add(neighbor_id)

        return self._build_result(predictions, seed_points)

    def _calculate_risk(
        self,
        node: FloodNode,
        water_depth: float,
        arrival_time: float,
        rainfall: float
    ) -> float:
        """
        Tính risk score 0-1.
        """
        depth_score = min(1.0, water_depth / 2.0)
        time_score = max(0, 1 - arrival_time / 120)
        elevation_score = max(0, 1 - node.elevation / 5)

        # Drainage score: thoát nước kém = risk cao hơn
        drainage_score = 1 - node.drainage_capacity

        # Risk cao nếu: nông, đến sớm, thấp, thoát nước kém
        risk = (
            depth_score * 0.25 +
            time_score * 0.35 +
            elevation_score * 0.25 +
            drainage_score * 0.15
        )

        if rainfall > 100:
            risk = min(1.0, risk * 1.2)

        return round(risk, 3)

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Tính khoảng cách Haversine (meters)."""
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _build_result(
        self,
        predictions: Dict[str, FloodPrediction],
        seed_points: List[Tuple[str, float]]
    ) -> FloodSpreadResult:
        """Build kết quả cuối cùng."""
        flooded = [p for p in predictions.values() if p.flooded]

        # Sắp xếp theo risk score giảm dần
        sorted_by_risk = sorted(flooded, key=lambda x: x.risk_score, reverse=True)

        # Lấy top 10% nguy hiểm nhất
        critical_count = max(1, len(flooded) // 10)
        critical = [p.node_id for p in sorted_by_risk[:critical_count]]

        # Cần sơ tán: flood trong 30 phút đầu
        evacuation = [p.node_id for p in flooded if p.arrival_time_minutes <= 30]

        max_time = max([p.arrival_time_minutes for p in flooded]) if flooded else 0

        # High-risk areas với details
        high_risk = [
            {
                "node_id": p.node_id,
                "district": p.district,
                "risk_score": p.risk_score,
                "arrival_time_minutes": p.arrival_time_minutes,
                "water_depth_m": p.water_depth_m,
            }
            for p in sorted_by_risk[:10]
        ]

        # Safe evacuation routes
        safe_routes = self._find_safe_routes(predictions, seed_points)

        return FloodSpreadResult(
            predictions=flooded,
            total_nodes=len(self.graph),
            flooded_nodes=len(flooded),
            critical_areas=critical,
            evacuation_needed=evacuation,
            spread_time_minutes=round(max_time, 1),
            high_risk_areas=high_risk,
            safe_evacuation_routes=safe_routes,
        )

    def _find_safe_routes(
        self,
        predictions: Dict[str, FloodPrediction],
        seed_points: List[Tuple[str, float]]
    ) -> List[Dict[str, Any]]:
        """Tìm các tuyến sơ tán an toàn đến nơi cao."""
        flooded_ids = set(predictions.keys())
        safe_nodes = [
            node_id for node_id, node in self.graph.items()
            if node.elevation > 10 or node.drainage_capacity > 0.7
        ]

        routes = []

        # Từ các điểm nguy hiểm đến nơi an toàn
        for seed_id, _ in seed_points:
            if seed_id not in self.graph:
                continue

            seed_node = self.graph[seed_id]

            # BFS tìm đường đến nơi cao
            path = self._bfs_to_safety(seed_id, safe_nodes)

            if path:
                total_distance = sum(
                    self._haversine(
                        self.graph[path[i]].lat, self.graph[path[i]].lng,
                        self.graph[path[i+1]].lat, self.graph[path[i+1]].lng
                    )
                    for i in range(len(path) - 1)
                )

                routes.append({
                    "from": seed_id,
                    "to": path[-1],
                    "path": path,
                    "distance_m": round(total_distance),
                    "estimated_time_min": round(total_distance / 5000 * 60),  # 5km/h walking
                })

        return routes[:5]  # Top 5 routes

    def _bfs_to_safety(self, start: str, safe_nodes: List[str]) -> Optional[List[str]]:
        """BFS tìm đường đến nơi an toàn."""
        if start in safe_nodes:
            return [start]

        queue = deque([(start, [start])])
        visited = {start}

        while queue:
            node_id, path = queue.popleft()

            for neighbor in self.graph.get(node_id, FloodNode("", 0, 0, 0, [])).neighbors:
                if neighbor in visited:
                    continue

                new_path = path + [neighbor]

                if neighbor in safe_nodes:
                    return new_path

                visited.add(neighbor)
                queue.append((neighbor, new_path))

        return None

    @classmethod
    def from_geojson(cls, geojson_path: str) -> "FloodSpreadBFS":
        """Load graph từ GeoJSON file."""
        with open(geojson_path) as f:
            data = json.load(f)

        graph = {}
        nodes_data = {}

        # Extract nodes from Point features
        for feature in data.get("features", []):
            if feature.get("geometry", {}).get("type") == "Point":
                props = feature.get("properties", {})
                coords = feature["geometry"]["coordinates"]
                node_id = props.get("id", feature.get("id", ""))

                if node_id:
                    nodes_data[node_id] = {
                        "lat": coords[1],
                        "lng": coords[0],
                        "elevation": props.get("elevation", 5.0),
                        "district": props.get("district", ""),
                        "drainage_capacity": props.get("drainage_capacity", 0.5),
                        "neighbors": [],
                    }

        # Extract edges from LineString features
        for feature in data.get("features", []):
            if feature.get("geometry", {}).get("type") == "LineString":
                props = feature.get("properties", {})
                from_node = props.get("from")
                to_node = props.get("to")

                if from_node in nodes_data and to_node in nodes_data:
                    nodes_data[from_node]["neighbors"].append(to_node)
                    nodes_data[to_node]["neighbors"].append(from_node)

        # Convert to FloodNode
        for node_id, node_data in nodes_data.items():
            graph[node_id] = FloodNode(
                id=node_id,
                lat=node_data["lat"],
                lng=node_data["lng"],
                elevation=node_data["elevation"],
                neighbors=node_data["neighbors"],
                district=node_data["district"],
                drainage_capacity=node_data["drainage_capacity"],
            )

        return cls(graph)


if __name__ == "__main__":
    # Test với default graph
    bfs = FloodSpreadBFS()

    # Dự đoán với các điểm ngập thực tế
    seed_points = [
        ("cho_bac", 1.5),      # Chợ Bắc - trũng nhất
        ("hai_chau", 1.2),      # Hải Châu
        ("nguyen_van_thoai", 1.0),  # Nguyễn Văn Táo
    ]

    result = bfs.predict(
        seed_points=seed_points,
        rainfall_mm_h=150.0,
        duration_hours=3.0
    )

    print(f"\n{'='*60}")
    print("FLOOD SPREAD PREDICTION - ĐÀ NẴNG")
    print(f"{'='*60}")
    print(f"Total nodes: {result.total_nodes}")
    print(f"Flooded nodes: {result.flooded_nodes}")
    print(f"Spread time: {result.spread_time_minutes} minutes")

    print(f"\n⚠️ CRITICAL AREAS ({len(result.critical_areas)}):")
    for area in result.high_risk_areas[:5]:
        print(f"  - {area['node_id']} ({area['district']})")
        print(f"    Risk: {area['risk_score']:.2f}, Arrival: {area['arrival_time_minutes']:.1f}m")

    print(f"\n🚨 EVACUATION NEEDED ({len(result.evacuation_needed)}):")
    for node_id in result.evacuation_needed[:5]:
        print(f"  - {node_id}")

    print(f"\n🏠 SAFE EVACUATION ROUTES:")
    for route in result.safe_evacuation_routes[:3]:
        print(f"  - {route['from']} → {route['to']}")
        print(f"    Distance: {route['distance_m']}m, Time: {route['estimated_time_min']} min")

    print(f"\n📊 ALL FLOODED NODES (sorted by arrival time):")
    for p in sorted(result.predictions, key=lambda x: x.arrival_time_minutes)[:10]:
        print(f"  [{p.arrival_time_minutes:5.1f}m] {p.node_id:20s} depth={p.water_depth_m:.2f}m risk={p.risk_score:.3f}")
