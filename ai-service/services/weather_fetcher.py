"""
weather_fetcher.py — Fetch real weather data for Da Nang from Open-Meteo API.

Main API:
    get_danang_weather() -> dict
"""

import time
from datetime import datetime, timezone
from typing import Optional

try:
    import requests as _requests
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

# ── Constants ─────────────────────────────────────────────────────────────────

DANANG_LAT = 16.0544
DANANG_LNG = 108.2022

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_PARAMS = {
    "latitude": DANANG_LAT,
    "longitude": DANANG_LNG,
    "hourly": "precipitation,rain,wind_speed_10m,surface_pressure",
    "daily": "precipitation_sum,rain_sum",
    "timezone": "Asia/Bangkok",
    "forecast_days": 3,
}

CACHE_TTL_SECONDS = 15 * 60  # 15 minutes

# ── Simple in-memory cache ────────────────────────────────────────────────────

_cache: dict = {
    "data": None,
    "fetched_at": 0.0,
}


def _is_cache_valid() -> bool:
    return (
        _cache["data"] is not None
        and (time.monotonic() - _cache["fetched_at"]) < CACHE_TTL_SECONDS
    )


def _zeros_fallback() -> dict:
    return {
        "current": {
            "rainfall_mm": 0.0,
            "wind_speed_kmh": 0.0,
            "pressure_hpa": 0.0,
        },
        "hourly_forecast": [
            {"hour_offset": i, "rainfall_mm": 0.0, "cumulative_mm": 0.0}
            for i in range(24)
        ],
        "6h_total_mm": 0.0,
        "24h_total_mm": 0.0,
        "peak_hour_mm": 0.0,
        "source": "fallback",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _parse_response(data: dict) -> dict:
    """Parse Open-Meteo JSON response into the structured result dict."""
    hourly = data.get("hourly", {})
    times: list = hourly.get("time", [])
    precipitation: list = hourly.get("precipitation") or []
    rain: list = hourly.get("rain") or []
    wind_speed: list = hourly.get("wind_speed_10m") or []
    pressure: list = hourly.get("surface_pressure") or []

    def _safe(lst: list, idx: int, default: float = 0.0) -> float:
        try:
            v = lst[idx]
            return float(v) if v is not None else default
        except (IndexError, TypeError, ValueError):
            return default

    # Find the current hour index by matching wall-clock hour
    now_iso_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H")
    current_idx = 0
    for i, t in enumerate(times):
        if str(t).startswith(now_iso_prefix):
            current_idx = i
            break

    current_rain = _safe(rain, current_idx) or _safe(precipitation, current_idx)
    current_wind = _safe(wind_speed, current_idx)
    current_pressure = _safe(pressure, current_idx)

    # Build next-24-hours forecast
    hourly_forecast = []
    cumulative = 0.0
    for offset in range(24):
        idx = current_idx + offset
        hour_rain = _safe(rain, idx) or _safe(precipitation, idx)
        cumulative += hour_rain
        hourly_forecast.append({
            "hour_offset": offset,
            "rainfall_mm": round(hour_rain, 2),
            "cumulative_mm": round(cumulative, 2),
        })

    next_6h_rain = sum(h["rainfall_mm"] for h in hourly_forecast[:6])
    next_24h_rain = sum(h["rainfall_mm"] for h in hourly_forecast)
    peak_hour = max((h["rainfall_mm"] for h in hourly_forecast), default=0.0)

    return {
        "current": {
            "rainfall_mm": round(current_rain, 2),
            "wind_speed_kmh": round(current_wind, 2),
            "pressure_hpa": round(current_pressure, 2),
        },
        "hourly_forecast": hourly_forecast,
        "6h_total_mm": round(next_6h_rain, 2),
        "24h_total_mm": round(next_24h_rain, 2),
        "peak_hour_mm": round(peak_hour, 2),
        "source": "open_meteo",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _fetch_from_api() -> dict:
    """Fetch weather data from Open-Meteo; return fallback zeros on any error."""
    if not _REQUESTS_AVAILABLE:
        return _zeros_fallback()

    try:
        response = _requests.get(
            OPEN_METEO_URL,
            params=OPEN_METEO_PARAMS,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return _parse_response(data)
    except Exception:
        return _zeros_fallback()


# ── Public API ────────────────────────────────────────────────────────────────

def get_danang_weather() -> dict:
    """
    Return current and forecast weather for Da Nang (lat=16.0544, lng=108.2022).

    Result is cached for 15 minutes. Falls back to zeros if the API is unavailable.

    Returns:
        {
            "current": {"rainfall_mm": float, "wind_speed_kmh": float, "pressure_hpa": float},
            "hourly_forecast": [{"hour_offset": int, "rainfall_mm": float, "cumulative_mm": float}, ...],  # 24 entries
            "6h_total_mm": float,
            "24h_total_mm": float,
            "peak_hour_mm": float,
            "source": "open_meteo" | "fallback",
            "fetched_at": "ISO string",
        }
    """
    if _is_cache_valid():
        return _cache["data"]  # type: ignore[return-value]

    result = _fetch_from_api()
    _cache["data"] = result
    _cache["fetched_at"] = time.monotonic()
    return result
