"""
Active Warnings API (/v1/warnings/active)
Returns current meteorology warnings and alert polygons.
"""

from fastapi import APIRouter
from app.api.maps import DEMO_POLYGONS

router = APIRouter(prefix="/v1/warnings", tags=["warnings"])


@router.get("/active")
async def get_active_warnings(bbox: str | None = None):
    """Retrieve active meteorological warnings."""
    return {
        "status": "active",
        "count": len(DEMO_POLYGONS["features"]),
        "warnings": [
            {
                "id": "WARN_TN_001",
                "source": "IMD",
                "hazard_type": "rainfall",
                "severity": "Orange",
                "title": "Heavy Rain Advisory - Madurai & South TN",
                "issued_at": "2026-09-02T06:00:00Z",
                "expires_at": "2026-09-03T18:00:00Z"
            },
            {
                "id": "WARN_TN_002",
                "source": "IMD",
                "hazard_type": "wind",
                "severity": "Yellow",
                "title": "Squally Wind Warning for Coastal Fishermen",
                "issued_at": "2026-09-02T08:00:00Z",
                "expires_at": "2026-09-04T00:00:00Z"
            }
        ],
        "polygons": DEMO_POLYGONS
    }
