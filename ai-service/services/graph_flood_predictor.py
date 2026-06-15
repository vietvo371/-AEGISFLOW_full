"""
Graph-enhanced spatial flood prediction.

Instead of rule-based BFS physics, this module trains an XGBoost model
that learns flood propagation from graph topology + historical sensor data.

For each target node in the flood graph, it predicts:
  - flood_probability (0-1): likelihood of flooding
  - arrival_time_min (0-360): minutes until water arrives
  - water_depth_m (0-5): expected peak water depth
  - risk_score (0-100): composite risk

Features per node:
  Node features: elevation, drainage, lat/lng, coastal_dist
  Graph features: n_neighbors, min_neighbor_elevation, elevation_gradient,
                  betweenness_centrality, lowest_path_to_coast
  Source features: distance to nearest seed (flooded) node, elevation diff,
                   path_flooding_score
  Environmental: rainfall, tide, hours_rain, soil_saturation
"""
import math
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import warnings

import numpy as np
import joblib

GRAPH_PATH   = Path(__file__).parent.parent / "data" / "danang_flood_graph.json"
MODEL_PATH   = Path(__file__).parent.parent / "models" / "graph_flood_model.pkl"

# Da Nang coastline reference point (Han River mouth)
COAST_LAT, COAST_LNG = 16.0544, 108.2250

_graph_cache: Optional[Dict] = None
_model_cache: Optional[Dict] = None


# ── Graph utilities ───────────────────────────────────────────────────────────

def _haversine(lat1, lng1, lat2, lng2) -> float:
    """Distance in metres between two coordinates."""
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def load_graph() -> Dict:
    global _graph_cache
    if _graph_cache is not None:
        return _graph_cache
    if GRAPH_PATH.exists():
        with open(GRAPH_PATH) as f:
            _graph_cache = json.load(f)
    else:
        _graph_cache = {}
    return _graph_cache


def _bfs_distance(graph: Dict, source: str, target: str) -> Tuple[float, List[str]]:
    """BFS hop count and path from source to target."""
    if source == target:
        return 0, [source]
    from collections import deque
    visited = {source}
    queue = deque([(source, [source])])
    while queue:
        node, path = queue.popleft()
        for nb in graph.get(node, {}).get("neighbors", []):
            if nb == target:
                return len(path), path + [nb]
            if nb not in visited:
                visited.add(nb)
                queue.append((nb, path + [nb]))
    return 999, []


def _path_min_elevation(graph: Dict, path: List[str]) -> float:
    """Minimum elevation along a path (determines if water can flow)."""
    if not path:
        return 999.0
    return min(graph[n]["elevation"] for n in path if n in graph)


def compute_graph_features(graph: Dict) -> Dict[str, Dict[str, float]]:
    """
    Pre-compute static graph topology features for every node.
    Returns dict: node_id → feature_dict
    """
    features = {}

    # Degree (n_neighbors)
    for nid, n in graph.items():
        neighbors = n.get("neighbors", [])
        neighbor_elevs = [graph[nb]["elevation"] for nb in neighbors if nb in graph]

        coast_dist = _haversine(n["lat"], n["lng"], COAST_LAT, COAST_LNG)

        features[nid] = {
            "elevation": float(n["elevation"]),
            "drainage_capacity": float(n.get("drainage_capacity", 0.5)),
            "lat": float(n["lat"]),
            "lng": float(n["lng"]),
            "coast_dist_m": coast_dist,
            "n_neighbors": float(len(neighbors)),
            "min_neighbor_elevation": float(min(neighbor_elevs)) if neighbor_elevs else float(n["elevation"]),
            "max_neighbor_elevation": float(max(neighbor_elevs)) if neighbor_elevs else float(n["elevation"]),
            "mean_neighbor_elevation": float(sum(neighbor_elevs) / len(neighbor_elevs)) if neighbor_elevs else float(n["elevation"]),
            "elevation_gradient": float(n["elevation"] - min(neighbor_elevs)) if neighbor_elevs else 0.0,
            "is_low_risk": 1.0 if float(n["elevation"]) > 10 else 0.0,
            "is_coastal": 1.0 if coast_dist < 2000 else 0.0,
        }

    return features


def extract_node_features(
    graph: Dict,
    graph_feats: Dict[str, Dict[str, float]],
    target_id: str,
    seed_nodes: List[str],
    rainfall_mm: float,
    tide_level: float,
    hours_rain: float,
    soil_saturation: float,
    seed_water_levels: Optional[Dict[str, float]] = None,
) -> np.ndarray:
    """
    Build feature vector for predicting flood risk at target_id
    given a set of flooded seed_nodes.
    """
    tgt = graph_feats.get(target_id, {})
    sw  = seed_water_levels or {}

    # Distance + path features to nearest seed
    min_dist_hops = 999.0
    min_elev_diff = 0.0
    min_path_score = 0.0
    weighted_dist = 0.0
    n_reachable_seeds = 0.0

    for sid in seed_nodes:
        if sid not in graph:
            continue
        hops, path = _bfs_distance(graph, sid, target_id)
        if hops >= 999:
            continue
        n_reachable_seeds += 1.0
        path_min_elev = _path_min_elevation(graph, path)
        src_elev  = graph[sid]["elevation"]
        tgt_elev  = tgt.get("elevation", 5.0)
        elev_diff = src_elev - tgt_elev   # positive → water can flow downhill

        # Path score: lower path elevation = easier for water to flow
        path_score = elev_diff / (1 + path_min_elev) * (1 / (1 + hops))

        wl = float(sw.get(sid, 1.0))
        weighted = hops / (wl + 0.1)

        if hops < min_dist_hops:
            min_dist_hops = float(hops)
            min_elev_diff = elev_diff
            min_path_score = path_score
        weighted_dist = min(weighted_dist or weighted, weighted)

    if min_dist_hops >= 999:
        min_dist_hops = 10.0
        min_elev_diff = 0.0
        min_path_score = 0.0

    # Environmental features
    rain_intensity = min(rainfall_mm / 200.0, 1.0)
    tide_norm = min(tide_level / 3.0, 1.0)
    hours_norm = min(hours_rain / 48.0, 1.0)
    sat_norm = min(soil_saturation / 100.0, 1.0)
    n_seeds = float(len(seed_nodes))

    feat = [
        # Node topology (7)
        tgt.get("elevation", 5.0),
        tgt.get("drainage_capacity", 0.5),
        tgt.get("coast_dist_m", 5000.0) / 1000.0,    # km
        tgt.get("n_neighbors", 3.0),
        tgt.get("min_neighbor_elevation", 3.0),
        tgt.get("elevation_gradient", 0.0),
        tgt.get("is_coastal", 0.0),
        # Source relationship (5)
        min_dist_hops,
        min_elev_diff,
        min_path_score,
        n_reachable_seeds,
        weighted_dist,
        # Environmental (5)
        rain_intensity,
        tide_norm,
        hours_norm,
        sat_norm,
        n_seeds,
        # Combined risk signals (3)
        rain_intensity * tide_norm,
        min_elev_diff * rain_intensity,
        max(0.0, -tgt.get("elevation", 5.0) + 3.0) * rain_intensity,  # low elevation × rain
    ]
    return np.array(feat, dtype=np.float32)


N_GRAPH_FEATURES = 20


# ── Model I/O ─────────────────────────────────────────────────────────────────

def _load_model() -> Optional[Dict]:
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    if not MODEL_PATH.exists():
        return None
    try:
        data = joblib.load(MODEL_PATH)
        _model_cache = data
        print(f"[GraphModel] Loaded v{data.get('version', '?')} "
              f"acc={data.get('metrics', {}).get('flood_accuracy', 0)*100:.1f}%")
        return _model_cache
    except Exception as exc:
        print(f"[GraphModel] Load failed: {exc}")
        return None


def reload_graph_model():
    global _model_cache
    _model_cache = None
    return _load_model()


# ── Fallback: BFS physics ─────────────────────────────────────────────────────

def _bfs_fallback(
    graph: Dict,
    seed_nodes: List[str],
    rainfall_mm: float,
    tide_level: float,
    hours_rain: float,
    seed_water_levels: Optional[Dict[str, float]] = None,
) -> List[Dict[str, Any]]:
    """Simple physics-based BFS (original algorithm, used as fallback)."""
    from collections import deque

    sw = seed_water_levels or {s: 1.0 for s in seed_nodes}
    visited: Dict[str, float] = {}  # node → arrival_time_min
    results = []

    queue = deque()
    for sid in seed_nodes:
        if sid in graph:
            queue.append((sid, 0.0, sw.get(sid, 1.0)))
            visited[sid] = 0.0

    water_speed = 50.0  # m/min

    while queue:
        nid, arrival, wl = queue.popleft()
        node = graph.get(nid)
        if not node:
            continue

        elev = node["elevation"]
        drain = node.get("drainage_capacity", 0.5)
        coast = _haversine(node["lat"], node["lng"], COAST_LAT, COAST_LNG)

        # Water depth at this node
        depth = max(0.0, wl - elev * 0.2 + rainfall_mm * 0.01 + tide_level * 0.3)
        depth = max(0.0, depth * (1.0 - drain * 0.5))

        risk = min(100.0, depth * 20 + (rainfall_mm / 200) * 30 + (tide_level / 3) * 20)

        results.append({
            "node_id": nid,
            "flood_probability": min(1.0, depth / 2.0),
            "arrival_time_min": arrival,
            "water_depth_m": round(depth, 2),
            "risk_score": round(risk, 1),
            "method": "bfs_fallback",
            **{k: node[k] for k in ("lat", "lng", "elevation", "district") if k in node},
        })

        # Propagate to neighbors
        for nb in node.get("neighbors", []):
            if nb not in graph or nb in visited:
                continue
            nb_node = graph[nb]
            nb_elev = nb_node["elevation"]
            dist_m = _haversine(node["lat"], node["lng"], nb_node["lat"], nb_node["lng"])
            travel_time = dist_m / water_speed

            # Water only flows if enough pressure (rainfall can override elevation)
            elev_barrier = max(0.0, nb_elev - elev)
            rain_override = rainfall_mm / 50.0
            if elev_barrier > wl + rain_override:
                continue

            new_wl = max(0.0, wl - elev_barrier * 0.3 + rainfall_mm * 0.005)
            new_arrival = arrival + travel_time
            visited[nb] = new_arrival
            queue.append((nb, new_arrival, new_wl))

    return results


# ── Public prediction API ─────────────────────────────────────────────────────

def predict_flood_spread(
    seed_nodes: List[str],
    rainfall_mm: float = 50.0,
    tide_level: float = 0.5,
    hours_rain: float = 6.0,
    soil_saturation: float = 40.0,
    seed_water_levels: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Predict flood spread across the Da Nang graph given initial flooded nodes.

    Parameters
    ----------
    seed_nodes: list of already-flooded node IDs (e.g. ["hai_chau", "cho_bac"])
    rainfall_mm: current rainfall intensity mm/h
    tide_level: current tide level metres
    hours_rain: duration of rainfall in hours
    soil_saturation: soil saturation 0-100%
    seed_water_levels: optional dict mapping seed_id → current water level (m)

    Returns
    -------
    dict:
      node_predictions: list of per-node risk predictions
      critical_nodes: nodes with flood_probability > 0.8
      evacuation_zones: nodes with arrival_time_min < 30
      method: "graph_xgb" | "bfs_fallback"
      n_affected: count of affected nodes
    """
    graph = load_graph()
    if not graph:
        return {"error": "Graph not loaded", "node_predictions": [], "method": "none"}

    model_data = _load_model()
    graph_feats = compute_graph_features(graph)

    if model_data is not None:
        try:
            predictions = []
            xgb_models = model_data["models"]   # dict: target → XGBRegressor list
            scaler_mean = model_data["scaler_mean"]
            scaler_std  = model_data["scaler_std"]

            for nid in graph:
                feat = extract_node_features(
                    graph, graph_feats, nid, seed_nodes,
                    rainfall_mm, tide_level, hours_rain, soil_saturation,
                    seed_water_levels,
                )
                feat_scaled = (feat - scaler_mean) / (scaler_std + 1e-8)
                X = feat_scaled.reshape(1, -1)

                flood_prob   = float(np.clip(xgb_models["flood_prob"].predict(X)[0], 0, 1))
                arrival_time = float(np.clip(xgb_models["arrival_time"].predict(X)[0], 0, 360))
                water_depth  = float(np.clip(xgb_models["water_depth"].predict(X)[0], 0, 5))
                risk_score   = float(np.clip(xgb_models["risk_score"].predict(X)[0], 0, 100))

                node = graph[nid]
                predictions.append({
                    "node_id": nid,
                    "flood_probability": round(flood_prob, 3),
                    "arrival_time_min": round(arrival_time, 1),
                    "water_depth_m": round(water_depth, 2),
                    "risk_score": round(risk_score, 1),
                    "risk_level": _score_to_level(risk_score),
                    "lat": node["lat"],
                    "lng": node["lng"],
                    "elevation": node["elevation"],
                    "district": node.get("district", ""),
                    "method": "graph_xgb",
                })

            method = "graph_xgb"

        except Exception as exc:
            print(f"[GraphModel] Inference error: {exc}, using BFS fallback")
            predictions = _bfs_fallback(graph, seed_nodes, rainfall_mm, tide_level,
                                        hours_rain, seed_water_levels)
            method = "bfs_fallback"
    else:
        predictions = _bfs_fallback(graph, seed_nodes, rainfall_mm, tide_level,
                                    hours_rain, seed_water_levels)
        method = "bfs_fallback"

    critical = [p["node_id"] for p in predictions if p["flood_probability"] > 0.7]
    evacuation = [p["node_id"] for p in predictions
                  if p.get("arrival_time_min", 999) < 30 and p["flood_probability"] > 0.5]
    high_risk = [p["node_id"] for p in predictions if p["risk_score"] >= 60]

    # Sort by risk
    predictions.sort(key=lambda p: -p["risk_score"])

    return {
        "node_predictions": predictions,
        "critical_nodes": critical,
        "evacuation_zones": evacuation,
        "high_risk_nodes": high_risk,
        "n_affected": len([p for p in predictions if p["flood_probability"] > 0.3]),
        "method": method,
        "input_summary": {
            "seed_nodes": seed_nodes,
            "rainfall_mm": rainfall_mm,
            "tide_level": tide_level,
            "hours_rain": hours_rain,
        },
    }


def _score_to_level(score: float) -> str:
    if score >= 75: return "critical"
    elif score >= 50: return "high"
    elif score >= 25: return "medium"
    return "low"


# ── Station → Node mapper ─────────────────────────────────────────────────────

def map_stations_to_nodes(
    stations: List[Dict],
    threshold_km: float = 5.0,
) -> Dict[str, List[Dict]]:
    """
    Map sensor stations to their nearest flood graph node.

    Parameters
    ----------
    stations: list of dicts with lat, lng, id/name, water_level/rainfall
    threshold_km: max distance in km to assign station to node

    Returns
    -------
    dict: node_id → list of assigned stations with aggregated readings
    """
    graph = load_graph()
    mapping: Dict[str, List[Dict]] = {nid: [] for nid in graph}

    for station in stations:
        slat = float(station.get("lat") or station.get("latitude") or 0)
        slng = float(station.get("lng") or station.get("longitude") or 0)
        if not slat and not slng:
            continue

        best_node, best_dist = None, float("inf")
        for nid, node in graph.items():
            dist = _haversine(slat, slng, node["lat"], node["lng"])
            if dist < best_dist:
                best_dist = dist
                best_node = nid

        if best_node and best_dist / 1000 <= threshold_km:
            mapping[best_node].append({
                **station,
                "distance_m": round(best_dist, 0),
            })

    return mapping


def aggregate_node_readings(
    mapping: Dict[str, List[Dict]],
) -> Dict[str, Dict[str, float]]:
    """
    For each node, aggregate station readings into a single reading.
    Weight by inverse distance (closer stations matter more).
    """
    aggregated = {}
    for nid, stations in mapping.items():
        if not stations:
            continue
        total_weight = 0.0
        wl_sum = rain_sum = 0.0
        for s in stations:
            w = 1.0 / max(1.0, s.get("distance_m", 1000) / 100)
            wl   = float(s.get("water_level") or s.get("water_level_m") or 0.0)
            rain = float(s.get("rainfall") or s.get("rainfall_mm") or 0.0)
            wl_sum   += wl * w
            rain_sum += rain * w
            total_weight += w

        if total_weight > 0:
            aggregated[nid] = {
                "water_level_m": round(wl_sum / total_weight, 2),
                "rainfall_mm":   round(rain_sum / total_weight, 2),
                "n_stations":    len(stations),
            }

    return aggregated


def identify_seed_nodes_from_stations(
    station_readings: List[Dict],
    water_level_threshold: float = 1.0,
    rainfall_threshold: float = 50.0,
) -> Tuple[List[str], Dict[str, float]]:
    """
    From real sensor readings, determine which graph nodes are already flooding
    and return them as seed nodes for spread prediction.

    Returns (seed_node_ids, water_levels_by_node)
    """
    mapping = map_stations_to_nodes(station_readings)
    aggregated = aggregate_node_readings(mapping)

    seeds = []
    wl_map = {}
    for nid, readings in aggregated.items():
        wl   = readings["water_level_m"]
        rain = readings["rainfall_mm"]
        if wl >= water_level_threshold or rain >= rainfall_threshold:
            seeds.append(nid)
            wl_map[nid] = wl

    return seeds, wl_map
