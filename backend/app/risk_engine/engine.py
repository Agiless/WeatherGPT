"""
Weather Risk Engine Core Orchestrator.
Cleans and aligns multi-source meteorological inputs, computes per-hazard risk scores,
evaluates model consensus, applies authoritative overrides (IMD inside India),
and persists snapshots to risk_snapshots table if DB is available.
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import text
from app.db.engine import get_session_factory
from app.risk_engine.scoring import compute_hazard_score, score_to_risk_level
from app.risk_engine.consensus import compute_consensus
from app.schemas.risk import RiskObject, HazardScore

logger = logging.getLogger(__name__)


async def build_risk_object(weather_data: dict, hazard_focus: str = "general") -> RiskObject:
    """Transform unified multi-source weather data into a decision-ready RiskObject."""
    location = weather_data.get("location", {"lat": 13.0827, "lon": 80.2707})
    source_data = weather_data.get("source_data", {})
    owm = source_data.get("openweather", {})
    imd = source_data.get("imd", {})
    era5 = source_data.get("era5_climatology", {})

    # Extract raw values for Rainfall (mm / 24h)
    owm_rain = owm.get("rain_24h_mm", 0.0)
    imd_rain = imd.get("current", {}).get("rainfall_24h_mm", imd.get("rain_24h_mm", 0.0))
    era5_rain = era5.get("mean_rain_mm", 0.0)

    # Rainfall model scores
    rain_model_scores = {}
    if owm:
        rain_model_scores["owm_score"] = compute_hazard_score(owm_rain, "rainfall")
    if imd:
        rain_model_scores["imd_score"] = compute_hazard_score(imd_rain, "rainfall")
    if era5:
        rain_model_scores["era5_clim_score"] = compute_hazard_score(era5_rain, "rainfall")

    rain_consensus = compute_consensus(rain_model_scores)
    rain_score_values = list(rain_model_scores.values())
    rain_effective_score = sum(rain_score_values) / len(rain_score_values) if rain_score_values else 0
    rain_risk_level = score_to_risk_level(rain_effective_score)

    rainfall_hazard = HazardScore(
        owm_score=rain_model_scores.get("owm_score"),
        imd_score=rain_model_scores.get("imd_score"),
        era5_clim_score=rain_model_scores.get("era5_clim_score"),
        consensus_score=rain_consensus,
        final_risk_level=rain_risk_level,
    )

    # Extract raw values for Wind (km/h)
    owm_wind = owm.get("wind_kmh", 0.0)
    imd_wind = imd.get("current", {}).get("wind_speed_kmh", 0.0)
    wind_model_scores = {}
    if owm:
        wind_model_scores["owm_score"] = compute_hazard_score(owm_wind, "wind")
    if imd:
        wind_model_scores["imd_score"] = compute_hazard_score(imd_wind, "wind")

    wind_consensus = compute_consensus(wind_model_scores)
    wind_score_values = list(wind_model_scores.values())
    wind_effective_score = sum(wind_score_values) / len(wind_score_values) if wind_score_values else 0

    wind_hazard = HazardScore(
        owm_score=wind_model_scores.get("owm_score"),
        imd_score=wind_model_scores.get("imd_score"),
        consensus_score=wind_consensus,
        final_risk_level=score_to_risk_level(wind_effective_score),
    )

    # Collect active warnings
    warnings_active = list(weather_data.get("warnings_active", []))
    if "alerts" in owm:
        for a in owm["alerts"]:
            evt = a.get("event")
            if evt and f"OWM_{evt}" not in warnings_active:
                warnings_active.append(f"OWM_{evt}")

    # Authoritative override rule (India):
    # Active IMD warning or nowcast Orange/Red upgrades risk to at least 'high'
    imd_upgrade = False
    imd_color = (imd.get("nowcast_color") or "").lower()
    if imd_color in ("orange", "red"):
        imd_upgrade = True
        rainfall_hazard.final_risk_level = "high" if imd_color == "orange" else "severe"

    now_utc = datetime.now(timezone.utc)
    risk_obj = RiskObject(
        location=location,
        valid_time=now_utc,
        hazards={
            "rainfall": rainfall_hazard,
            "wind": wind_hazard,
        },
        warnings_active=warnings_active,
        computed_at=now_utc,
        imd_official_upgrade=imd_upgrade,
    )

    # Persist snapshot asynchronously if DB is configured
    try:
        factory = get_session_factory()
        async with factory() as session:
            await session.execute(
                text("""
                    INSERT INTO risk_snapshots (lat, lon, valid_time, hazard_type, model_scores, consensus_score, final_risk_level, computed_at)
                    VALUES (:lat, :lon, :valid_time, :hazard_type, :model_scores::jsonb, :consensus_score, :final_risk_level, :computed_at)
                """),
                {
                    "lat": location.get("lat"),
                    "lon": location.get("lon"),
                    "valid_time": now_utc.isoformat(),
                    "hazard_type": hazard_focus,
                    "model_scores": '{"rainfall": ' + str(rain_model_scores) + '}',
                    "consensus_score": rain_consensus,
                    "final_risk_level": rainfall_hazard.final_risk_level,
                    "computed_at": now_utc.isoformat(),
                }
            )
            await session.commit()
    except Exception as e:
        logger.debug(f"Risk snapshot persistence skipped: {e}")

    return risk_obj
