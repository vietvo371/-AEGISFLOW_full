"""
Train the graph-enhanced spatial flood predictor.

For each (graph_node, scenario) pair, generates flood outcomes
using simulation, then trains XGBoost models to predict:
  - flood_probability (0-1)
  - arrival_time_min (0-360)
  - water_depth_m (0-5)
  - risk_score (0-100)

Usage:
    python models/train_graph_model.py

Env vars:
    N_SCENARIOS=2000   training scenarios
    N_ESTIMATORS=200   XGBoost trees
"""
import json
import math
import os
import sys
import time
import warnings
from collections import deque
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import joblib

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.graph_flood_predictor import (
    load_graph, compute_graph_features, extract_node_features,
    N_GRAPH_FEATURES, MODEL_PATH, _bfs_fallback, _haversine,
    COAST_LAT, COAST_LNG,
)

N_SCENARIOS   = int(os.getenv("N_SCENARIOS", "2500"))
N_ESTIMATORS  = int(os.getenv("N_ESTIMATORS", "200"))
VALIDATE_SPLIT = 0.15

# ── Simulation ────────────────────────────────────────────────────────────────

def _simulate_scenario(
    graph: Dict,
    seed_nodes: List[str],
    rainfall_mm: float,
    tide_level: float,
    hours_rain: float,
    soil_saturation: float,
) -> Dict[str, Dict[str, float]]:
    """
    Run physics BFS and return per-node outcomes.
    Returns: node_id → {flood_probability, arrival_time_min, water_depth_m, risk_score}
    """
    sw = {}
    for sid in seed_nodes:
        if sid in graph:
            n = graph[sid]
            wl = max(1.0, rainfall_mm * 0.02 + tide_level + hours_rain * 0.05)
            sw[sid] = wl

    results_list = _bfs_fallback(graph, seed_nodes, rainfall_mm, tide_level, hours_rain, sw)

    outcomes = {}
    for r in results_list:
        nid = r["node_id"]
        outcomes[nid] = {
            "flood_probability": r["flood_probability"],
            "arrival_time_min":  r.get("arrival_time_min", 999),
            "water_depth_m":     r["water_depth_m"],
            "risk_score":        r["risk_score"],
        }

    # Unvisited nodes: no flood
    for nid in graph:
        if nid not in outcomes:
            outcomes[nid] = {
                "flood_probability": 0.0,
                "arrival_time_min":  360.0,
                "water_depth_m":     0.0,
                "risk_score":        5.0,
            }

    return outcomes


def generate_dataset(n_scenarios: int, rng: np.random.Generator):
    graph = load_graph()
    if not graph:
        raise RuntimeError("Graph not found. Ensure danang_flood_graph.json exists.")

    node_ids = list(graph.keys())
    low_elev_nodes = [n for n in node_ids if graph[n]["elevation"] <= 5.0]
    graph_feats = compute_graph_features(graph)

    Xs, Y_prob, Y_time, Y_depth, Y_risk = [], [], [], [], []

    for s in range(n_scenarios):
        # Randomise scenario
        n_seeds = rng.integers(1, min(5, len(low_elev_nodes)) + 1)
        seed_nodes = list(rng.choice(low_elev_nodes, size=n_seeds, replace=False))
        rainfall_mm    = float(rng.choice([
            rng.uniform(0, 10),
            rng.uniform(10, 50),
            rng.uniform(50, 120),
            rng.uniform(120, 300),
        ], p=[0.25, 0.30, 0.25, 0.20]))
        tide_level     = float(rng.uniform(0.0, 2.5))
        hours_rain     = float(rng.uniform(0.5, 36.0))
        soil_sat       = float(rng.uniform(0, 100))
        seed_wl        = {s: float(rng.uniform(0.5, 4.0)) for s in seed_nodes}

        outcomes = _simulate_scenario(graph, seed_nodes, rainfall_mm, tide_level, hours_rain, soil_sat)

        # One row per node
        for nid in node_ids:
            feat = extract_node_features(
                graph, graph_feats, nid, seed_nodes,
                rainfall_mm, tide_level, hours_rain, soil_sat, seed_wl,
            )
            outcome = outcomes.get(nid, {
                "flood_probability": 0.0,
                "arrival_time_min": 360.0,
                "water_depth_m": 0.0,
                "risk_score": 5.0,
            })
            Xs.append(feat)
            Y_prob.append(outcome["flood_probability"])
            Y_time.append(min(outcome["arrival_time_min"], 360.0))
            Y_depth.append(outcome["water_depth_m"])
            Y_risk.append(outcome["risk_score"])

        if (s + 1) % 500 == 0:
            print(f"  Simulated {s+1}/{n_scenarios} scenarios "
                  f"({len(Xs)} node-samples)...")

    return (
        np.stack(Xs, dtype=np.float32),
        np.array(Y_prob,  dtype=np.float32),
        np.array(Y_time,  dtype=np.float32),
        np.array(Y_depth, dtype=np.float32),
        np.array(Y_risk,  dtype=np.float32),
    )


def main():
    from xgboost import XGBRegressor, XGBClassifier

    print("=" * 60)
    print("AegisFlow Graph Flood Predictor — Training")
    print("=" * 60)
    print(f"Graph nodes: {len(load_graph())}")
    print(f"Config: n_scenarios={N_SCENARIOS}, n_estimators={N_ESTIMATORS}")
    print(f"Features per node: {N_GRAPH_FEATURES}")
    print()

    rng = np.random.default_rng(2026)

    print("[1/4] Generating graph simulation dataset...")
    t0 = time.time()
    X, Y_prob, Y_time, Y_depth, Y_risk = generate_dataset(N_SCENARIOS, rng)
    print(f"  Samples: {len(X)} ({time.time()-t0:.1f}s)")
    print(f"  Flood rate: {Y_prob.mean()*100:.1f}%  "
          f"Avg depth: {Y_depth.mean():.2f}m  "
          f"Avg risk: {Y_risk.mean():.1f}")

    print("\n[2/4] Scaling features...")
    mean = X.mean(axis=0)
    std  = X.std(axis=0) + 1e-8
    X_sc = (X - mean) / std

    N = len(X_sc)
    val_n  = int(N * VALIDATE_SPLIT)
    test_n = int(N * VALIDATE_SPLIT)
    idx = rng.permutation(N)

    tr_i  = idx[:N-val_n-test_n]
    val_i = idx[N-val_n-test_n:N-test_n]
    te_i  = idx[N-test_n:]

    X_tr, X_val, X_te = X_sc[tr_i], X_sc[val_i], X_sc[te_i]
    print(f"  Train={len(X_tr)}, Val={len(X_val)}, Test={len(X_te)}")

    def make_xgb(seed=42):
        return XGBRegressor(
            n_estimators=N_ESTIMATORS, max_depth=5, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            min_child_weight=3, reg_alpha=0.1, reg_lambda=1.0,
            objective="reg:squarederror", tree_method="hist",
            random_state=seed, n_jobs=-1, verbosity=0,
            early_stopping_rounds=15, eval_metric="rmse",
        )

    print("\n[3/4] Training per-target XGBoost models...")
    targets = {
        "flood_prob":   (Y_prob,  "probability"),
        "arrival_time": (Y_time,  "minutes"),
        "water_depth":  (Y_depth, "metres"),
        "risk_score":   (Y_risk,  "score"),
    }

    models = {}
    t0 = time.time()
    for i, (name, (Y, unit)) in enumerate(targets.items()):
        m = make_xgb(42 + i)
        m.fit(X_tr, Y[tr_i],
              eval_set=[(X_val, Y[val_i])],
              verbose=False)
        models[name] = m
        best = getattr(m, "best_iteration", N_ESTIMATORS)
        rmse = float(np.sqrt(np.mean((np.clip(m.predict(X_te), 0, None) - Y[te_i]) ** 2)))
        print(f"  {name:15s}: best_iter={best:3d}  test_RMSE={rmse:.3f} {unit}")

    print(f"  Training done in {time.time()-t0:.1f}s")

    print("\n[4/4] Evaluating flood probability classification...")
    prob_pred = np.clip(models["flood_prob"].predict(X_te), 0, 1)
    prob_true = Y_prob[te_i]
    thresh = 0.5
    tp = ((prob_pred >= thresh) & (prob_true >= thresh)).sum()
    tn = ((prob_pred <  thresh) & (prob_true <  thresh)).sum()
    fp = ((prob_pred >= thresh) & (prob_true <  thresh)).sum()
    fn = ((prob_pred <  thresh) & (prob_true >= thresh)).sum()
    acc   = (tp + tn) / max(1, tp + tn + fp + fn)
    prec  = tp / max(1, tp + fp)
    rec   = tp / max(1, tp + fn)
    f1    = 2 * prec * rec / max(1e-9, prec + rec)
    print(f"  Flood detection — Acc={acc*100:.1f}%  Prec={prec*100:.1f}%  "
          f"Rec={rec*100:.1f}%  F1={f1*100:.1f}%")

    risk_pred = np.clip(models["risk_score"].predict(X_te), 0, 100)
    risk_true = Y_risk[te_i]

    def level(s):
        if s >= 75: return "critical"
        elif s >= 50: return "high"
        elif s >= 25: return "medium"
        return "low"

    level_acc = np.mean([level(risk_pred[i]) == level(risk_true[i]) for i in range(len(risk_pred))])
    print(f"  Risk level accuracy: {level_acc*100:.1f}%")

    # Save
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "models":       models,
        "version":      "1.0.0",
        "scaler_mean":  mean.astype(np.float32),
        "scaler_std":   std.astype(np.float32),
        "metrics": {
            "flood_accuracy": acc,
            "flood_f1": f1,
            "risk_level_acc": level_acc,
        },
        "config": {
            "n_scenarios": N_SCENARIOS,
            "n_estimators": N_ESTIMATORS,
            "n_features": N_GRAPH_FEATURES,
        },
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }, MODEL_PATH)

    print(f"\n  Saved: {MODEL_PATH}")
    print(f"  Flood F1={f1*100:.1f}%  Risk level acc={level_acc*100:.1f}%")
    print("\nDone. Endpoint: POST /api/predict/spread")


if __name__ == "__main__":
    main()
