"""
Data Orchestrator -- fans out to weather sources with asyncio.gather.
800ms timeout per source. Graceful degradation: if one source fails, continue with others.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from datetime import datetime, timezone

from app.core.config import get_settings
from app.schemas.query import ExtractedParams

logger = logging.getLogger(__name__)
FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures"


async def fetch_weather_data(params: ExtractedParams) -> dict:
    """
    Fan out to weather sources based on extracted params.
    Returns a merged weather data dict for the Risk Engine.
    """
    settings = get_settings()
    lat = params.location.lat if params.location else 13.0827
    lon = params.location.lon if params.location else 80.2707

    if settings.use_fixture_weather:
        return _load_fixture_data(lat, lon)

    # Parallel fetch from live sources
    owm_task = _fetch_openweather(lat, lon, settings)
    imd_task = _fetch_imd(lat, lon, settings)
    era5_task = _fetch_era5_fixture(lat, lon)

    results = await asyncio.gather(owm_task, imd_task, era5_task, return_exceptions=True)

    owm_data = results[0] if not isinstance(results[0], Exception) else None
    imd_data = results[1] if not isinstance(results[1], Exception) else None
    era5_data = results[2] if not isinstance(results[2], Exception) else None

    if owm_data is None and imd_data is None:
        logger.warning("All live sources failed, using fixtures")
        return _load_fixture_data(lat, lon)

    return _merge_sources(lat, lon, owm_data, imd_data, era5_data)


async def _fetch_openweather(lat: float, lon: float, settings) -> dict | None:
    """Fetch from OpenWeather One Call 3.0."""
    if not settings.openweather_api_key:
        logger.info("No OpenWeather API key, skipping")
        return None

    try:
        from app.sources.openweather import get_onecall
        return await asyncio.wait_for(get_onecall(lat, lon), timeout=5.0)
    except asyncio.TimeoutError:
        logger.warning("OpenWeather timeout")
        return None
    except Exception as e:
        logger.warning(f"OpenWeather error: {e}")
        return None


async def _fetch_imd(lat: float, lon: float, settings) -> dict | None:
    """Fetch from IMD. Skip if outside India bbox."""
    if not (6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0):
        logger.info("Location outside India, skipping IMD")
        return None

    try:
        from app.sources.imd import get_imd_data
        return await asyncio.wait_for(get_imd_data(lat, lon), timeout=5.0)
    except asyncio.TimeoutError:
        logger.warning("IMD timeout")
        return None
    except Exception as e:
        logger.warning(f"IMD error: {e}")
        return None


async def _fetch_era5_fixture(lat: float, lon: float) -> dict | None:
    """Load ERA5 climatology from fixtures (never live on request path)."""
    try:
        from app.sources.era5 import get_era5_climatology
        return await get_era5_climatology(lat, lon)
    except Exception as e:
        logger.warning(f"ERA5 fixture error: {e}")
        return None


def _load_fixture_data(lat: float, lon: float) -> dict:
    """Load fixture weather data for demo mode."""
    fixture_file = FIXTURES_DIR / "demo_risk_objects" / "chennai_generic.json"
    if fixture_file.exists():
        with open(fixture_file) as f:
            data = json.load(f)
            data["location"] = {"lat": lat, "lon": lon}
            data["computed_at"] = datetime.now(timezone.utc).isoformat()
            return data

    # Minimal fallback
    return {
        "location": {"lat": lat, "lon": lon},
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "weather_data": {
            "current": {
                "temperature_c": 30.0, "humidity_pct": 70,
                "wind_speed_kmh": 12.0, "weather_description": "Partly cloudy",
            },
            "forecast_24h": {
                "max_temp_c": 33.0, "min_temp_c": 25.0,
                "total_rain_mm": 5.0, "precip_probability": 0.3,
            },
        },
        "source_data": {},
    }


def _merge_sources(
    lat: float, lon: float,
    owm: dict | None, imd: dict | None, era5: dict | None
) -> dict:
    """Merge data from multiple sources into a unified weather data dict."""
    merged = {
        "location": {"lat": lat, "lon": lon},
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "weather_data": {"current": {}, "forecast_24h": {}, "forecast_48h": {}},
        "source_data": {},
    }

    if owm:
        merged["source_data"]["openweather"] = owm
        if "current" in owm:
            merged["weather_data"]["current"].update({
                "temperature_c": owm["current"].get("temperature_c", 0),
                "humidity_pct": owm["current"].get("humidity_pct", 0),
                "wind_speed_kmh": owm["current"].get("wind_speed_kmh", 0),
                "weather_description": owm["current"].get("weather_description", ""),
            })
        if "forecast_24h" in owm:
            merged["weather_data"]["forecast_24h"].update(owm["forecast_24h"])

    if imd:
        merged["source_data"]["imd"] = imd
        if "warnings" in imd:
            merged["warnings_active"] = imd["warnings"]
        # IMD overrides for India
        if "current" in imd and (6.0 <= lat <= 38.0):
            for key in ["temperature_c", "wind_speed_kmh"]:
                if key in imd["current"]:
                    merged["weather_data"]["current"][key] = imd["current"][key]

    if era5:
        merged["source_data"]["era5_climatology"] = era5

    return merged
