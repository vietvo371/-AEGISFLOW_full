"""
Train the multi-step flood risk forecaster.

Architecture: Temporal XGBoost — flattens the last 24 sensor readings
(24 × 10 features = 240 inputs) and trains one XGBRegressor per
forecast horizon (1h, 3h, 6h).

XGBoost is numerically stable and produces excellent results on
tabular time-series data without requiring a DL framework.

Usage:
    python models/train_lstm_model.py

Env vars:
    N_EPISODES=2000    synthetic training episodes
    N_ESTIMATORS=300   XGBoost trees per model
"""
import math
import os
import sys
import time
import warnings
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import joblib

warnings.filterwarnings("ignore")

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.lstm_forecaster import (
    SEQUENCE_FEATURES, N_FEATURES, SEQ_LEN, INPUT_DIM,
    FORECAST_STEPS, FORECAST_LABELS, STEP_INTERVAL_MIN, MODEL_PATH,
    _score_to_level,
)
from services.flood_calculator import calculate_flood_risk

# ── Config ────────────────────────────────────────────────────────────────────
N_EPISODES   = int(os.getenv("N_EPISODES", "3000"))
N_ESTIMATORS = int(os.getenv("N_ESTIMATORS", "300"))
VALIDATE_SPLIT = 0.15

MONTHLY_RISK = {
    1: 5, 2: 4, 3: 6, 4: 8, 5: 12, 6: 18,
    7: 22, 8: 25, 9: 37, 10: 52, 11: 42, 12: 20,
}

SCENARIOS = {
    "normal":      {"wl": (0.0, 0.3),  "rain": (0, 5),    "hours": (0, 2)},
    "light_rain":  {"wl": (0.1, 0.8),  "rain": (5, 30),   "hours": (2, 6)},
    "heavy_rain":  {"wl": (0.5, 2.0),  "rain": (30, 100), "hours": (6, 18)},
    "flood_event": {"wl": (1.5, 4.0),  "rain": (80, 200), "hours": (12, 36)},
    "typhoon":     {"wl": (2.5, 5.0),  "rain": (150, 400),"hours": (18, 48)},
    "receding":    {"wl": (0.8, 2.5),  "rain": (0, 20),   "hours": (3, 12)},
}

SCENARIO_NAMES   = list(SCENARIOS.keys())
SCENARIO_WEIGHTS = [0.28, 0.24, 0.20, 0.12, 0.06, 0.10]


def _cyclic(val: float, period: float) -> Tuple[float, float]:
    a = 2 * math.pi * val / period
    return math.sin(a), math.cos(a)


def _generate_episode(
    sc_name: str, sc: Dict, month: int, rng: np.random.Generator
) -> Tuple[np.ndarray, np.ndarray]:
    wl    = rng.uniform(*sc["wl"])
    rain  = rng.uniform(*sc["rain"])
    hours = rng.uniform(*sc["hours"])
    tide  = rng.uniform(0.0, 1.5)
    hist  = rng.uniform(10, 80)

    is_receding = (sc_name == "receding")
    direction   = -1.0 if is_receding else 1.0

    total_steps = SEQ_LEN + max(FORECAST_STEPS)
    rain_hist = []
    all_rows  = []
    soil_sat  = float(np.clip(rain * 0.4 + hours * 0.8, 0, 100))

    for t in range(total_steps):
        wl_delta   = direction * rng.uniform(0.0, 0.12) + rng.normal(0, 0.04)
        rain_noise = rng.normal(0, max(rain * 0.08, 0.5))
        wl   = float(np.clip(wl + wl_delta, 0.0, 5.5))
        rain = float(np.clip(rain + rain_noise, 0.0, 450.0))

        rain_hist.append(rain)
        rain_6h = float(sum(rain_hist[-6:])) if len(rain_hist) >= 6 else rain * min(t + 1, 6)

        trend = (all_rows[-1][0] - all_rows[-4][0]) / 4.0 if len(all_rows) >= 4 else 0.0
        soil_sat = float(np.clip(soil_sat + rain * 0.012 - 0.25, 0.0, 100.0))
        hour = (t * STEP_INTERVAL_MIN // 60) % 24
        h_sin, h_cos = _cyclic(float(hour), 24.0)
        m_sin, m_cos = _cyclic(float(month), 12.0)

        all_rows.append([wl, rain, trend, rain_6h, soil_sat, tide, h_sin, h_cos, m_sin, m_cos])

    # Input: first SEQ_LEN rows flattened
    X = np.array(all_rows[:SEQ_LEN], dtype=np.float64).flatten()

    # Targets
    Y = []
    for step in FORECAST_STEPS:
        idx = min(SEQ_LEN + step - 1, len(all_rows) - 1)
        fut = all_rows[idx]
        res = calculate_flood_risk(
            water_level_m=fut[0], rainfall_mm=fut[1],
            hours_rain=int(hours + step * STEP_INTERVAL_MIN / 60),
            tide_level=tide, historical_score=hist,
            water_level_trend=fut[2], rain_6h=fut[3], soil_saturation=fut[4],
        )
        Y.append(float(res["risk_score"]))

    return X, np.array(Y, dtype=np.float64)


def generate_dataset(n: int, rng: np.random.Generator):
    months  = list(range(1, 13))
    m_probs = np.array([MONTHLY_RISK[m] for m in months], dtype=float)
    m_probs /= m_probs.sum()

    Xs, Ys = [], []
    for i in range(n):
        sc_name = rng.choice(SCENARIO_NAMES, p=SCENARIO_WEIGHTS)
        month   = int(rng.choice(months, p=m_probs))
        try:
            X, Y = _generate_episode(sc_name, SCENARIOS[sc_name], month, rng)
            Xs.append(X)
            Ys.append(Y)
        except Exception as exc:
            print(f"  [warn] Episode {i}: {exc}")
        if (i + 1) % 500 == 0:
            print(f"  Generated {i+1}/{n} episodes...")

    return np.stack(Xs), np.stack(Ys)


def main():
    from xgboost import XGBRegressor

    print("=" * 60)
    print("AegisFlow Flood Forecaster — Training (Temporal XGBoost)")
    print("=" * 60)
    print(f"Config: n_estimators={N_ESTIMATORS}, episodes={N_EPISODES}")
    print(f"Input: {SEQ_LEN} steps × {N_FEATURES} features = {INPUT_DIM} dims")
    print(f"Output: risk scores at {FORECAST_LABELS}")
    print()

    rng = np.random.default_rng(2026)

    print("[1/4] Generating synthetic time-series episodes...")
    t0 = time.time()
    X, Y = generate_dataset(N_EPISODES, rng)
    print(f"  Dataset: X={X.shape}, Y={Y.shape}  ({time.time()-t0:.1f}s)")
    print(f"  Y: mean={Y.mean():.1f}, std={Y.std():.1f}, "
          f"min={Y.min():.1f}, max={Y.max():.1f}")

    print("\n[2/4] Scaling features...")
    scaler_mean = X.mean(axis=0)
    scaler_std  = X.std(axis=0) + 1e-8
    X_scaled = ((X - scaler_mean) / scaler_std).astype(np.float32)
    Y = Y.astype(np.float32)

    N = len(X_scaled)
    val_n  = int(N * VALIDATE_SPLIT)
    test_n = int(N * VALIDATE_SPLIT)
    idx = rng.permutation(N)

    X_tr = X_scaled[idx[:N-val_n-test_n]]
    Y_tr = Y[idx[:N-val_n-test_n]]
    X_val = X_scaled[idx[N-val_n-test_n:N-test_n]]
    Y_val = Y[idx[N-val_n-test_n:N-test_n]]
    X_te = X_scaled[idx[N-test_n:]]
    Y_te = Y[idx[N-test_n:]]
    print(f"  Train={len(X_tr)}, Val={len(X_val)}, Test={len(X_te)}")

    print("\n[3/4] Training XGBoost models (one per horizon)...")
    models = []
    t0 = time.time()

    for i, label in enumerate(FORECAST_LABELS):
        xgb = XGBRegressor(
            n_estimators=N_ESTIMATORS,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            reg_alpha=0.1,
            reg_lambda=1.0,
            objective="reg:squarederror",
            tree_method="hist",
            random_state=42 + i,
            n_jobs=-1,
            eval_metric="rmse",
            early_stopping_rounds=20,
            verbosity=0,
        )
        xgb.fit(
            X_tr, Y_tr[:, i],
            eval_set=[(X_val, Y_val[:, i])],
            verbose=False,
        )
        models.append(xgb)
        best_iter = xgb.best_iteration if hasattr(xgb, 'best_iteration') else N_ESTIMATORS
        print(f"  {label}: best_iteration={best_iter}")

    print(f"  Training done in {time.time()-t0:.1f}s")

    print("\n[4/4] Evaluating on test set...")
    Y_pred = np.column_stack([m.predict(X_te) for m in models])
    Y_pred = np.clip(Y_pred, 0, 100)

    mse  = float(np.mean((Y_pred - Y_te) ** 2))
    rmse = float(np.sqrt(mse))
    mae  = float(np.mean(np.abs(Y_pred - Y_te)))

    for i, label in enumerate(FORECAST_LABELS):
        h_rmse = float(np.sqrt(np.mean((Y_pred[:, i] - Y_te[:, i]) ** 2)))
        h_mae  = float(np.mean(np.abs(Y_pred[:, i] - Y_te[:, i])))
        print(f"  {label}: RMSE={h_rmse:.2f}, MAE={h_mae:.2f}")

    correct = sum(
        _score_to_level(float(Y_pred[i, j])) == _score_to_level(float(Y_te[i, j]))
        for i in range(len(Y_pred))
        for j in range(3)
    )
    level_acc = correct / (len(Y_pred) * 3)

    Y_val_pred = np.clip(np.column_stack([m.predict(X_val) for m in models]), 0, 100)
    val_correct = sum(
        _score_to_level(float(Y_val_pred[i, j])) == _score_to_level(float(Y_val[i, j]))
        for i in range(len(Y_val_pred))
        for j in range(3)
    )
    val_acc = val_correct / (len(Y_val_pred) * 3)

    print(f"  Overall RMSE={rmse:.2f}, MAE={mae:.2f}")
    print(f"  Level Accuracy — Test={level_acc*100:.1f}%, Val={val_acc*100:.1f}%")

    # Save
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model_data = {
        "model": models,                 # list of 3 XGBRegressors
        "model_type": "xgb_temporal",
        "version": "3.0.0",
        "scaler_mean": scaler_mean.astype(np.float32),
        "scaler_std":  scaler_std.astype(np.float32),
        "val_accuracy": val_acc,
        "metrics": {
            "rmse": rmse, "mae": mae,
            "level_accuracy": level_acc,
            "val_level_accuracy": val_acc,
        },
        "config": {
            "n_estimators": N_ESTIMATORS, "n_episodes": N_EPISODES,
            "seq_len": SEQ_LEN, "input_dim": INPUT_DIM,
            "forecast_horizons": FORECAST_LABELS,
        },
        "features": SEQUENCE_FEATURES,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    joblib.dump(model_data, MODEL_PATH)
    print(f"\n  Saved: {MODEL_PATH}")
    print(f"  Val Accuracy: {val_acc*100:.1f}%")
    print("\nDone. Endpoint: POST /api/predict/forecast")


if __name__ == "__main__":
    main()
