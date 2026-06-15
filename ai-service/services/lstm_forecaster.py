"""
Multi-step flood risk forecaster.

Architecture: Temporal MLP — flattens the last SEQ_LEN sensor readings
into a feature vector and feeds it through a multi-layer perceptron
to predict flood risk scores at t+1h, t+3h, and t+6h.

Uses sklearn MLPRegressor (stable, well-tested, no external DL framework
needed). Falls back to trend-extrapolated XGBoost predictions when no
trained model file exists.
"""
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import joblib

# ── Constants ────────────────────────────────────────────────────────────────
SEQ_LEN = 24                          # historical steps fed to the model
FORECAST_STEPS = [4, 12, 24]          # steps ahead at 15-min interval → 1h/3h/6h
FORECAST_LABELS = ["1h", "3h", "6h"]
STEP_INTERVAL_MIN = 15

SEQUENCE_FEATURES = [
    "water_level_m",
    "rainfall_mm",
    "water_level_trend",
    "rain_6h",
    "soil_saturation",
    "tide_level",
    "hour_sin",
    "hour_cos",
    "month_sin",
    "month_cos",
]
N_FEATURES = len(SEQUENCE_FEATURES)
INPUT_DIM = SEQ_LEN * N_FEATURES      # 240 flattened features

RISK_THRESHOLDS = [
    (75, "critical"),
    (50, "high"),
    (25, "medium"),
    (0,  "low"),
]

MODEL_PATH = Path(__file__).parent.parent / "models" / "lstm_flood_forecaster.pkl"

_model_cache: Optional[Dict[str, Any]] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _score_to_level(score: float) -> str:
    for threshold, label in RISK_THRESHOLDS:
        if score >= threshold:
            return label
    return "low"


def _cyclic(value: float, period: float) -> Tuple[float, float]:
    angle = 2 * math.pi * value / period
    return math.sin(angle), math.cos(angle)


# ── Model I/O ─────────────────────────────────────────────────────────────────

def _load_model() -> Optional[Dict[str, Any]]:
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    if not MODEL_PATH.exists():
        return None
    try:
        data = joblib.load(MODEL_PATH)
        _model_cache = data
        print(f"[Forecaster] Loaded v{data.get('version', '?')} "
              f"acc={data.get('val_accuracy', 0)*100:.1f}%")
        return _model_cache
    except Exception as exc:
        print(f"[Forecaster] Failed to load: {exc}")
        return None


def reload_lstm():
    global _model_cache
    _model_cache = None
    return _load_model()


# ── Sequence building ─────────────────────────────────────────────────────────

def build_sequence(readings: List[Dict]) -> np.ndarray:
    """
    Convert list of reading dicts (newest-first) into a flat feature vector.
    Shape: (INPUT_DIM,) = (SEQ_LEN × N_FEATURES,)
    """
    rows = []
    last = {f: 0.0 for f in SEQUENCE_FEATURES}

    for r in reversed(readings[-SEQ_LEN:]):
        wl    = float(r.get("water_level") or r.get("water_level_m") or last["water_level_m"])
        rain  = float(r.get("rainfall") or r.get("rainfall_mm") or last["rainfall_mm"])
        trend = float(r.get("trend") or r.get("water_level_trend") or last["water_level_trend"])
        r6h   = float(r.get("rain_6h") or last["rain_6h"])
        sat   = float(r.get("soil_saturation") or last["soil_saturation"])
        tide  = float(r.get("tide_level") or last["tide_level"])

        ts = r.get("timestamp") or r.get("created_at") or ""
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            h_sin, h_cos = _cyclic(dt.hour + dt.minute / 60.0, 24.0)
            m_sin, m_cos = _cyclic(dt.month, 12.0)
        except Exception:
            h_sin, h_cos = last["hour_sin"], last["hour_cos"]
            m_sin, m_cos = last["month_sin"], last["month_cos"]

        row = {
            "water_level_m": wl, "rainfall_mm": rain,
            "water_level_trend": trend, "rain_6h": r6h,
            "soil_saturation": sat, "tide_level": tide,
            "hour_sin": h_sin, "hour_cos": h_cos,
            "month_sin": m_sin, "month_cos": m_cos,
        }
        last = row
        rows.append([row[f] for f in SEQUENCE_FEATURES])

    if len(rows) < SEQ_LEN:
        pad = rows[0] if rows else [0.0] * N_FEATURES
        rows = [pad] * (SEQ_LEN - len(rows)) + rows

    # Return oldest-to-newest, flattened
    return np.array(rows, dtype=np.float32).flatten()


# ── Fallback forecasting ──────────────────────────────────────────────────────

def _xgb_fallback_forecast(
    readings: List[Dict],
    current_risk: Dict[str, Any],
) -> List[Dict[str, Any]]:
    from services.flood_calculator import calculate_flood_risk

    wl_values = []
    for r in readings[:12]:
        try:
            wl_values.append(float(r.get("water_level") or r.get("water_level_m") or 0.0))
        except (TypeError, ValueError):
            pass

    trend = 0.0
    if len(wl_values) >= 2:
        trend = (wl_values[0] - wl_values[-1]) / max(1, len(wl_values) - 1)

    base_score = current_risk.get("risk_score", 25.0)
    r0 = readings[0] if readings else {}
    base_wl   = float(r0.get("water_level") or r0.get("water_level_m") or 0.0)
    base_rain = float(r0.get("rainfall") or r0.get("rainfall_mm") or 0.0)
    base_tide = float(r0.get("tide_level") or 0.0)
    base_hist = float(r0.get("historical_score") or 0.0)

    forecasts = []
    for step, label in zip(FORECAST_STEPS, FORECAST_LABELS):
        hours_ahead = step * STEP_INTERVAL_MIN / 60.0
        future_wl   = max(0.0, base_wl + trend * hours_ahead)
        future_rain = max(0.0, base_rain * max(0.2, 1.0 - hours_ahead * 0.1))

        res = calculate_flood_risk(
            water_level_m=future_wl,
            rainfall_mm=future_rain,
            hours_rain=int(hours_ahead + 1),
            tide_level=base_tide,
            historical_score=base_hist,
            water_level_trend=trend,
        )
        forecasts.append({
            "horizon": label,
            "hours_ahead": hours_ahead,
            "risk_score": res["risk_score"],
            "risk_level": res["risk_level"],
            "confidence": round(float(res.get("confidence", 0.6)) * 0.8, 4),
            "method": "xgb_extrapolation",
            "estimated_water_level_m": round(future_wl, 2),
            "trend_m_per_hour": round(trend, 4),
        })

    return forecasts


# ── Public API ────────────────────────────────────────────────────────────────

def forecast_flood_risk(
    readings: List[Dict],
    current_risk: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Multi-step flood risk forecast (1h, 3h, 6h ahead).

    Parameters
    ----------
    readings : list of dicts, newest-first
        Each dict: water_level, rainfall, timestamp, etc.
    current_risk : optional result from calculate_flood_risk()

    Returns
    -------
    dict:
        forecasts: list of {horizon, hours_ahead, risk_score, risk_level, confidence, method}
        method: "temporal_mlp" | "xgb_extrapolation"
        warning: escalation notice if risk rising sharply
        sequence_length: steps used
    """
    if not readings:
        return {"forecasts": [], "method": "none", "sequence_length": 0,
                "error": "No readings provided"}

    model_data = _load_model()

    if model_data is not None:
        try:
            feat = build_sequence(readings).astype(np.float32)    # (INPUT_DIM,)
            scaler_mean = model_data.get("scaler_mean")
            scaler_std  = model_data.get("scaler_std")
            if scaler_mean is not None:
                feat = (feat - scaler_mean) / (scaler_std + 1e-8)

            model_type = model_data.get("model_type", "xgb_temporal")
            val_acc = float(model_data.get("val_accuracy", 0.85))

            if model_type == "xgb_temporal" and isinstance(model_data["model"], list):
                # List of 3 XGBRegressors, one per horizon
                xgb_models = model_data["model"]
                scores = np.array([
                    float(m.predict(feat.reshape(1, -1))[0])
                    for m in xgb_models
                ])
            else:
                scores = model_data["model"].predict(feat.reshape(1, -1))[0]

            forecasts = []
            for score, label, step in zip(scores, FORECAST_LABELS, FORECAST_STEPS):
                score = float(np.clip(score, 0, 100))
                forecasts.append({
                    "horizon": label,
                    "hours_ahead": step * STEP_INTERVAL_MIN / 60.0,
                    "risk_score": round(score, 2),
                    "risk_level": _score_to_level(score),
                    "confidence": round(val_acc, 4),
                    "method": "temporal_xgb",
                })
            method = "temporal_xgb"
        except Exception as exc:
            print(f"[Forecaster] Inference error: {exc}")
            forecasts = _xgb_fallback_forecast(readings, current_risk or {})
            method = "xgb_extrapolation"
    else:
        forecasts = _xgb_fallback_forecast(readings, current_risk or {})
        method = "xgb_extrapolation"

    # Escalation warning
    warning = None
    if len(forecasts) >= 2:
        t1 = forecasts[0]["risk_score"]
        t6 = forecasts[-1]["risk_score"]
        if t6 - t1 >= 20:
            warning = (f"Rủi ro đang tăng nhanh: "
                       f"{forecasts[0]['risk_level']} → {forecasts[-1]['risk_level']} "
                       f"trong 6 giờ tới")
        elif t6 < t1 - 15:
            warning = f"Rủi ro đang giảm: dự báo xuống {forecasts[-1]['risk_level']} sau 6 giờ"

    return {
        "forecasts": forecasts,
        "method": method,
        "sequence_length": min(len(readings), SEQ_LEN),
        "warning": warning,
    }
