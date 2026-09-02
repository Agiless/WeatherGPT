"""
Map Endpoints (/v1/maps/...)
Serves Mapbox configuration, GeoJSON temperature points for heatmaps,
raster radar tile templates, IMD warning polygons, and the interactive map.html.
"""

from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, Response
from fastapi.responses import HTMLResponse
from app.core.config import get_settings

router = APIRouter(prefix="/v1/maps", tags=["maps"])

MAP_HTML_PATH = Path(__file__).parent.parent / "maps" / "map.html"

# Demo Heatmap Points across India
DEMO_HEATMAP_POINTS = [
    {"lon": 80.2707, "lat": 13.0827, "temperature_c": 33.4, "anomaly_c": 1.5, "source": "IMD_AWS"},
    {"lon": 78.1198, "lat": 9.9252, "temperature_c": 35.8, "anomaly_c": 2.1, "source": "IMD_AWS"},
    {"lon": 76.9558, "lat": 11.0168, "temperature_c": 29.4, "anomaly_c": -0.5, "source": "IMD_AWS"},
    {"lon": 78.7047, "lat": 10.7905, "temperature_c": 34.2, "anomaly_c": 1.2, "source": "IMD_AWS"},
    {"lon": 77.5946, "lat": 12.9716, "temperature_c": 27.5, "anomaly_c": 0.3, "source": "IMD_AWS"},
    {"lon": 78.4867, "lat": 17.3850, "temperature_c": 32.0, "anomaly_c": 0.8, "source": "IMD_AWS"},
    {"lon": 72.8777, "lat": 19.0760, "temperature_c": 31.2, "anomaly_c": 1.0, "source": "OWM"},
    {"lon": 77.2090, "lat": 28.6139, "temperature_c": 36.5, "anomaly_c": 2.4, "source": "IMD_AWS"},
    {"lon": 88.3639, "lat": 22.5726, "temperature_c": 32.8, "anomaly_c": 1.1, "source": "OWM"},
    {"lon": 85.8245, "lat": 20.2961, "temperature_c": 33.1, "anomaly_c": 1.3, "source": "IMD_AWS"},
    {"lon": 73.8567, "lat": 18.5204, "temperature_c": 28.9, "anomaly_c": -0.2, "source": "IMD_AWS"},
    {"lon": 76.2673, "lat": 9.9312, "temperature_c": 29.8, "anomaly_c": 0.4, "source": "IMD_AWS"},
]

# Simulated IMD Warning Polygons (Coastal Tamil Nadu and Odisha)
DEMO_POLYGONS = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "district": "Madurai",
                "severity": "Orange",
                "warning": "Heavy to very heavy rainfall advisory",
                "fillColor": "#ff7f00",
                "lineColor": "#e65100"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [[77.8, 9.6], [78.5, 9.6], [78.5, 10.2], [77.8, 10.2], [77.8, 9.6]]
                ]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "district": "Chennai Coastal",
                "severity": "Yellow",
                "warning": "Thunderstorm with gusty winds",
                "fillColor": "#ffd92f",
                "lineColor": "#f57f17"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [[79.9, 12.8], [80.5, 12.8], [80.5, 13.4], [79.9, 13.4], [79.9, 12.8]]
                ]
            }
        }
    ]
}


@router.get("/config")
async def get_map_config():
    """Returns Mapbox styling configs, legends, and tokens."""
    settings = get_settings()
    return {
        "styles": {
            "temperature": "mapbox://styles/mapbox/outdoors-v12",
            "radar": "mapbox://styles/mapbox/dark-v11"
        },
        "default_center": [78.9629, 20.5937],
        "default_zoom": 4.5,
        "mapbox_token": settings.mapbox_access_token or "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
    }


@router.get("/temperature-heatmap")
async def get_temperature_heatmap():
    """Returns GeoJSON FeatureCollection of station observations and anomalies."""
    features = []
    now_str = datetime.now(timezone.utc).isoformat()
    for pt in DEMO_HEATMAP_POINTS:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [pt["lon"], pt["lat"]]
            },
            "properties": {
                "temperature_c": pt["temperature_c"],
                "anomaly_c": pt["anomaly_c"],
                "source": pt["source"],
                "valid_time": now_str
            }
        })
    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/rain-radar")
async def get_rain_radar():
    """Returns animated or latest frame templates for rain radar overlay."""
    settings = get_settings()
    owm_key = settings.openweather_api_key

    # OpenWeather or RainViewer public precipitation mosaic
    if owm_key:
        tile_template = f"https://tile.openweathermap.org/map/precipitation_new/{{z}}/{{x}}/{{y}}.png?appid={owm_key}"
    else:
        # High quality RainViewer public open radar tile cache
        tile_template = "https://tilecache.rainviewer.com/v2/radar/nowcast_latest/256/{z}/{x}/{y}/2/1_1.png"

    return {
        "mode": "radar",
        "frames": [
            {
                "frame_id": "latest_radar_frame",
                "valid_time": datetime.now(timezone.utc).isoformat(),
                "tile_url_template": tile_template,
                "source": "OWM_PRECIP" if owm_key else "RAINVIEWER"
            }
        ],
        "legend": {
            "unit": "mm/h",
            "stops": [0, 1, 4, 8, 16, 32]
        }
    }


@router.get("/imd-polygons")
async def get_imd_polygons():
    """Returns official IMD warning and nowcast polygon geometries."""
    return DEMO_POLYGONS


@router.get("/map.html", response_class=HTMLResponse)
async def serve_map_html():
    """Serves the Mapbox GL JS map application inside WebView."""
    if MAP_HTML_PATH.exists():
        with open(MAP_HTML_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(content=content)
    return HTMLResponse(content="<h3>Map template loading...</h3>")
