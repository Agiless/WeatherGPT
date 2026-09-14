"""
API endpoints for Citizen Crowdsourced Hazard & Weather Reporting (/v1/reports).
Provides ground-truth validation for radar and satellite predictions.
"""

import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException

from app.schemas.reports import CitizenReportCreate, CitizenReport, CitizenReportGeoJSON

router = APIRouter(prefix="/v1/reports", tags=["Crowdsourced Reports"])

# In-memory store initialized with realistic verified ground reports across India
REPORTS_DB: List[CitizenReport] = [
    CitizenReport(
        id="rep-101",
        hazard_type="waterlogging",
        severity="high",
        lat=13.0827,
        lon=80.2707,
        location_name="Chennai Central, Tamil Nadu",
        description="Waterlogging up to 1.5 ft near underpass due to heavy local downpour.",
        reporter_alias="Ravi K.",
        verified=True,
        upvotes=14,
        created_at=datetime.now(timezone.utc)
    ),
    CitizenReport(
        id="rep-102",
        hazard_type="heavy_rain",
        severity="medium",
        lat=11.0168,
        lon=76.9558,
        location_name="Coimbatore, Tamil Nadu",
        description="Continuous thunderstorm rain since 2 PM. Low visibility on highways.",
        reporter_alias="Priya S.",
        verified=True,
        upvotes=9,
        created_at=datetime.now(timezone.utc)
    ),
    CitizenReport(
        id="rep-103",
        hazard_type="tree_fall",
        severity="severe",
        lat=12.9716,
        lon=77.5946,
        location_name="Indiranagar, Bengaluru",
        description="Large tree branch fallen across main road after gusty winds.",
        reporter_alias="Anand M.",
        verified=True,
        upvotes=22,
        created_at=datetime.now(timezone.utc)
    ),
    CitizenReport(
        id="rep-104",
        hazard_type="extreme_wind",
        severity="medium",
        lat=18.5204,
        lon=73.8567,
        location_name="Shivajinagar, Pune",
        description="Sudden squall winds ~45 km/h, temporary power disruption.",
        reporter_alias="Karan D.",
        verified=True,
        upvotes=6,
        created_at=datetime.now(timezone.utc)
    )
]


@router.post("", response_model=CitizenReport, status_code=201)
async def submit_citizen_report(payload: CitizenReportCreate):
    """Submits a new real-time citizen hazard observation."""
    report = CitizenReport(
        id=f"rep-{uuid.uuid4().hex[:8]}",
        hazard_type=payload.hazard_type,
        severity=payload.severity,
        lat=payload.lat,
        lon=payload.lon,
        location_name=payload.location_name or "Reported Location",
        description=payload.description or "",
        reporter_alias=payload.reporter_alias or "Citizen Observer",
        verified=True,
        upvotes=1,
        created_at=datetime.now(timezone.utc)
    )
    REPORTS_DB.insert(0, report)
    return report


@router.get("", response_model=CitizenReportGeoJSON)
async def get_citizen_reports_geojson():
    """Returns active crowdsourced reports formatted as GeoJSON for MapLibre GPU display."""
    features = []
    
    hazard_colors = {
        "waterlogging": "#38BDF8",  # Cyan Blue
        "heavy_rain": "#6366F1",    # Indigo
        "hailstorm": "#E0E7FF",     # Ice White
        "tree_fall": "#F59E0B",     # Amber
        "extreme_wind": "#F43F5E",  # Rose Red
        "dense_fog": "#94A3B8"      # Gray
    }

    hazard_icons = {
        "waterlogging": "🌊",
        "heavy_rain": "🌧️",
        "hailstorm": "🧊",
        "tree_fall": "🌳",
        "extreme_wind": "💨",
        "dense_fog": "🌫️"
    }

    for rep in REPORTS_DB:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [rep.lon, rep.lat]
            },
            "properties": {
                "id": rep.id,
                "hazard_type": rep.hazard_type,
                "hazard_icon": hazard_icons.get(rep.hazard_type, "⚠️"),
                "severity": rep.severity,
                "color": hazard_colors.get(rep.hazard_type, "#F59E0B"),
                "location_name": rep.location_name,
                "description": rep.description,
                "reporter_alias": rep.reporter_alias,
                "upvotes": rep.upvotes,
                "created_at": rep.created_at.isoformat()
            }
        })

    return CitizenReportGeoJSON(features=features)


@router.post("/{report_id}/upvote")
async def upvote_report(report_id: str):
    """Upvotes a report to reinforce community verification score."""
    for rep in REPORTS_DB:
        if rep.id == report_id:
            rep.upvotes += 1
            return {"status": "ok", "report_id": report_id, "upvotes": rep.upvotes}
    raise HTTPException(status_code=404, detail="Report not found")
