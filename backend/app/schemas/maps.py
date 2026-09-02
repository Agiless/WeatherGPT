"""
Pydantic schemas for map endpoints (heatmap, radar, config).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class HeatmapPoint(BaseModel):
    """A single point for the Mapbox GL JS temperature heatmap."""
    lon: float
    lat: float
    temperature_c: float
    anomaly_c: Optional[float] = None
    source: str = "OWM"  # OWM | IMD | ERA5
    valid_time: Optional[datetime] = None


class RadarFrame(BaseModel):
    """One frame of the rain radar animation."""
    frame_id: str
    valid_time: Optional[datetime] = None
    tile_url_template: str
    source: str = "OWM_PRECIP"  # OWM_PRECIP | RAINVIEWER | IMD_DWR


class MapLegend(BaseModel):
    """Colour scale legend for a map layer."""
    unit: str  # °C or mm/h
    stops: list[dict] = Field(default_factory=list)  # [{"value": 0, "color": "#313695"}, ...]


class MapConfig(BaseModel):
    """Configuration for Mapbox GL JS, per persona."""
    style_url: str = "mapbox://styles/mapbox/outdoors-v12"
    default_layers: list[str] = Field(default_factory=list)
    legend: Optional[MapLegend] = None
    persona_type: Optional[str] = None
