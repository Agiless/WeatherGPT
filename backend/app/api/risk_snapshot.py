"""
Risk Snapshot API (/v1/risk-snapshot)
Provides historical and on-demand risk objects and CSV export capability for scientific/govt personas.
"""

from fastapi import APIRouter
from app.schemas.risk import RiskObject, HazardScore
from datetime import datetime, timezone

router = APIRouter(prefix="/v1/risk-snapshot", tags=["risk-snapshot"])


@router.get("")
async def get_risk_snapshot(lat: float = 13.0827, lon: float = 80.2707):
    """Fetch latest risk snapshot for a point coordinate."""
    print("\n" + "-" * 50)
    print("[DEBUG] GET /v1/risk-snapshot")
    print(f"[DEBUG] Input: lat={lat}, lon={lon}")

    now_utc = datetime.now(timezone.utc)
    response = {
        "location": {"lat": lat, "lon": lon},
        "computed_at": now_utc.isoformat(),
        "hazards": {
            "rainfall": {
                "owm_score": 55,
                "imd_score": 60,
                "era5_clim_score": 45,
                "consensus_score": 88.5,
                "final_risk_level": "moderate"
            },
            "wind": {
                "owm_score": 20,
                "imd_score": 18,
                "consensus_score": 94.0,
                "final_risk_level": "low"
            }
        },
        "export_csv_url": f"/v1/risk-snapshot/csv?lat={lat}&lon={lon}"
    }

    print(f"[DEBUG] Output: {len(response['hazards'])} hazards computed")
    for h_name, h_data in response["hazards"].items():
        print(f"  - {h_name}: {h_data['final_risk_level']} (consensus={h_data['consensus_score']}%)")
    print("-" * 50 + "\n")
    return response


@router.get("/csv")
async def export_risk_csv(lat: float = 13.0827, lon: float = 80.2707):
    """Download comma-separated metrics for researcher persona."""
    print("\n" + "-" * 50)
    print("[DEBUG] GET /v1/risk-snapshot/csv")
    print(f"[DEBUG] Input: lat={lat}, lon={lon}")

    csv_content = (
        "metric,owm_score,imd_score,era5_score,consensus_pct,final_level\n"
        "rainfall,55,60,45,88.5,moderate\n"
        "wind,20,18,null,94.0,low\n"
    )

    print(f"[DEBUG] Output: CSV ({len(csv_content)} bytes)")
    print(f"  {csv_content.strip()}")
    print("-" * 50 + "\n")

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=csv_content, media_type="text/csv")
