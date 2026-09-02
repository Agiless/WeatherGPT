"""
ERA5 Climatology and historical anomaly loader.
Loads pre-computed ERA5 climatology and trend data from JSON fixtures.
(ERA5 live CDS retrieval is a batch/manual script, never blocking the request path).
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures" / "era5"

# Fallback climatology normal for India (summer/monsoon season baseline)
DEFAULT_CLIMATOLOGY = {
    "mean_temp_c": 30.2,
    "std_temp_c": 2.1,
    "mean_rain_mm": 6.8,
    "p90_rain_mm": 24.5,
    "source": "ERA5_1991_2020_CLIM",
}

# Pre-computed fixture anomalies for key demo cities
CITY_COORDINATES = {
    "chennai": {"lat": 13.0827, "lon": 80.2707, "mean_temp": 30.5, "mean_rain": 8.2},
    "madurai": {"lat": 9.9252, "lon": 78.1198, "mean_temp": 31.8, "mean_rain": 5.4},
    "delhi": {"lat": 28.6139, "lon": 77.2090, "mean_temp": 29.4, "mean_rain": 7.1},
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "mean_temp": 28.9, "mean_rain": 14.2},
    "bengaluru": {"lat": 12.9716, "lon": 77.5946, "mean_temp": 24.8, "mean_rain": 6.0},
}


def _find_closest_city(lat: float, lon: float) -> dict | None:
    min_dist = float("inf")
    closest = None
    for city, data in CITY_COORDINATES.items():
        dist = ((lat - data["lat"]) ** 2 + (lon - data["lon"]) ** 2) ** 0.5
        if dist < min_dist:
            min_dist = dist
            closest = city
    if min_dist < 4.0:  # within ~400km
        return CITY_COORDINATES[closest]
    return None


async def get_era5_climatology(lat: float, lon: float) -> dict:
    """Return ERA5 historical climatology and anomaly baseline for a given coordinate."""
    # Check if a custom fixture JSON exists
    fixture_file = FIXTURES_DIR / f"era5_clim.json"
    if fixture_file.exists():
        try:
            with open(fixture_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read ERA5 fixture: {e}")

    city_match = _find_closest_city(lat, lon)
    if city_match:
        return {
            "mean_temp_c": city_match["mean_temp"],
            "mean_rain_mm": city_match["mean_rain"],
            "anomaly_temp_c": round(1.2, 1),
            "anomaly_rain_mm": round(3.5, 1),
            "source": "ERA5_REANALYSIS_FIXTURE",
        }

    return {
        "mean_temp_c": DEFAULT_CLIMATOLOGY["mean_temp_c"],
        "mean_rain_mm": DEFAULT_CLIMATOLOGY["mean_rain_mm"],
        "anomaly_temp_c": 0.0,
        "anomaly_rain_mm": 0.0,
        "source": "ERA5_DEFAULT_CLIM",
    }
