"""
Pydantic schemas for Citizen Weather & Hazard Crowdsourcing (/v1/reports).
"""

from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field


class CitizenReportCreate(BaseModel):
    """Payload to submit a crowdsourced hazard report."""
    hazard_type: str = Field(..., description="waterlogging | hailstorm | tree_fall | extreme_wind | heavy_rain | dense_fog")
    severity: str = Field("medium", description="low | medium | high | severe")
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    location_name: Optional[str] = "Current Location"
    description: Optional[str] = ""
    reporter_alias: Optional[str] = "Citizen Observer"


class CitizenReport(CitizenReportCreate):
    """Complete report object with ID and timestamp."""
    id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified: bool = True
    upvotes: int = 1


class CitizenReportGeoJSON(BaseModel):
    """GeoJSON wrapper for MapLibre rendering."""
    type: str = "FeatureCollection"
    features: List[dict] = []
