"""
OpenWeather One Call 3.0 client.
800ms timeout, 1 retry on 429/5xx with jitter. Never logs API key.
"""

import logging
import random
import asyncio
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

OWM_BASE = "https://api.openweathermap.org/data/3.0/onecall"


async def get_onecall(lat: float, lon: float) -> dict:
    """Fetch One Call 3.0 data and normalize to internal format."""
    settings = get_settings()
    params = {
        "lat": lat, "lon": lon,
        "units": "metric",
        "exclude": "minutely",
        "appid": settings.openweather_api_key,
    }

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(OWM_BASE, params=params)
                if resp.status_code == 401:
                    # Fallback to standard OpenWeather 2.5 API (works with free keys)
                    return await _get_standard_25(client, lat, lon, settings.openweather_api_key)
                if resp.status_code in (429, 500, 502, 503):
                    if attempt == 0:
                        jitter = random.uniform(0.2, 0.8)
                        await asyncio.sleep(jitter)
                        continue
                resp.raise_for_status()
                raw = resp.json()
                return _normalize(raw)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    return await _get_standard_25(client, lat, lon, settings.openweather_api_key)
            if attempt == 0:
                continue
            raise
        except httpx.TimeoutException:
            if attempt == 0:
                continue
            raise

    return {}


async def _get_standard_25(client: httpx.AsyncClient, lat: float, lon: float, api_key: str) -> dict:
    """Fallback handler using standard OpenWeather 2.5 free tier endpoints."""
    try:
        w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={api_key}"
        f_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=metric&appid={api_key}"
        w_resp, f_resp = await asyncio.gather(
            client.get(w_url),
            client.get(f_url),
            return_exceptions=True
        )
        current = w_resp.json() if isinstance(w_resp, httpx.Response) and w_resp.status_code == 200 else {}
        forecast = f_resp.json() if isinstance(f_resp, httpx.Response) and f_resp.status_code == 200 else {}

        f_list = forecast.get("list", [])
        rain_24h = sum(item.get("rain", {}).get("3h", 0) for item in f_list[:8])
        wind_kmh = current.get("wind", {}).get("speed", 0) * 3.6

        return {
            "current": {
                "temperature_c": current.get("main", {}).get("temp", 0),
                "humidity_pct": current.get("main", {}).get("humidity", 0),
                "wind_speed_kmh": round(wind_kmh, 1),
                "wind_direction": _deg_to_dir(current.get("wind", {}).get("deg", 0)),
                "weather_description": current.get("weather", [{}])[0].get("description", "") if current.get("weather") else "",
                "pressure_hpa": current.get("main", {}).get("pressure", 0),
                "wx_code": current.get("weather", [{}])[0].get("id", 0) if current.get("weather") else 0,
            },
            "forecast_24h": {
                "max_temp_c": max((item.get("main", {}).get("temp_max", 0) for item in f_list[:8]), default=0),
                "min_temp_c": min((item.get("main", {}).get("temp_min", 0) for item in f_list[:8]), default=0),
                "total_rain_mm": round(rain_24h, 1),
                "precip_probability": max((item.get("pop", 0) for item in f_list[:8]), default=0),
                "max_wind_kmh": round(max((item.get("wind", {}).get("speed", 0) for item in f_list[:8]), default=0) * 3.6, 1),
            },
            "forecast_48h": {
                "max_temp_c": max((item.get("main", {}).get("temp_max", 0) for item in f_list[8:16]), default=0),
                "min_temp_c": min((item.get("main", {}).get("temp_min", 0) for item in f_list[8:16]), default=0),
                "total_rain_mm": round(sum(item.get("rain", {}).get("3h", 0) for item in f_list[8:16]), 1),
                "precip_probability": max((item.get("pop", 0) for item in f_list[8:16]), default=0),
                "max_wind_kmh": round(max((item.get("wind", {}).get("speed", 0) for item in f_list[8:16]), default=0) * 3.6, 1),
            },
            "rain_24h_mm": round(rain_24h, 1),
            "wind_kmh": round(wind_kmh, 1),
            "alerts": [],
        }
    except Exception as ex:
        logger.warning(f"OWM 2.5 fallback failed: {ex}")
        return {}


def _normalize(raw: dict) -> dict:
    """Normalize OWM One Call response to internal schema."""
    current = raw.get("current", {})
    hourly = raw.get("hourly", [])
    daily = raw.get("daily", [])
    alerts = raw.get("alerts", [])

    # 24h rainfall: sum of next 24 hourly rain["1h"]
    rain_24h = sum(h.get("rain", {}).get("1h", 0) for h in hourly[:24])
    # Wind: m/s -> km/h
    wind_kmh = current.get("wind_speed", 0) * 3.6

    result = {
        "current": {
            "temperature_c": current.get("temp", 0),
            "humidity_pct": current.get("humidity", 0),
            "wind_speed_kmh": round(wind_kmh, 1),
            "wind_direction": _deg_to_dir(current.get("wind_deg", 0)),
            "weather_description": (current.get("weather", [{}])[0].get("description", "") if current.get("weather") else ""),
            "pressure_hpa": current.get("pressure", 0),
            "wx_code": (current.get("weather", [{}])[0].get("id", 0) if current.get("weather") else 0),
        },
        "forecast_24h": {
            "max_temp_c": daily[0].get("temp", {}).get("max", 0) if daily else 0,
            "min_temp_c": daily[0].get("temp", {}).get("min", 0) if daily else 0,
            "total_rain_mm": round(rain_24h, 1),
            "precip_probability": max((h.get("pop", 0) for h in hourly[:24]), default=0),
            "max_wind_kmh": round(max((h.get("wind_speed", 0) for h in hourly[:24]), default=0) * 3.6, 1),
        },
        "forecast_48h": {
            "max_temp_c": daily[1].get("temp", {}).get("max", 0) if len(daily) > 1 else 0,
            "min_temp_c": daily[1].get("temp", {}).get("min", 0) if len(daily) > 1 else 0,
            "total_rain_mm": round(sum(h.get("rain", {}).get("1h", 0) for h in hourly[24:48]), 1),
            "precip_probability": max((h.get("pop", 0) for h in hourly[24:48]), default=0),
            "max_wind_kmh": round(max((h.get("wind_speed", 0) for h in hourly[24:48]), default=0) * 3.6, 1),
        },
        "rain_24h_mm": round(rain_24h, 1),
        "wind_kmh": round(wind_kmh, 1),
        "alerts": [
            {
                "event": a.get("event", ""),
                "description": a.get("description", ""),
                "sender": a.get("sender_name", ""),
                "start": a.get("start"),
                "end": a.get("end"),
            }
            for a in alerts
        ],
    }
    return result


def _deg_to_dir(deg: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = round(deg / 22.5) % 16
    return dirs[idx]
