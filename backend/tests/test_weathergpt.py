"""
WeatherGPT Automated Test Suite
Covers:
- Phase 0: Health, Personas & Config
- Phase 1: Two-layer LLM intent extraction & persona generation
- Phase 2: Weather maps & active warnings
- Phase 3: Risk Engine hazard scoring, consensus algorithm, and overrides
"""

import pytest
import httpx
from app.main import app
from app.risk_engine.scoring import compute_hazard_score, score_to_risk_level
from app.risk_engine.consensus import compute_consensus, consensus_to_label


@pytest.mark.asyncio
async def test_health_endpoint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_personas_endpoint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/personas")
        assert resp.status_code == 200
        personas = resp.json().get("personas", [])
        assert len(personas) == 8
        types = {p["persona_type"] for p in personas}
        assert "farmer" in types
        assert "researcher_scientist" in types
        assert "fisherman" in types


def test_hazard_scoring():
    # Low rain (< 15mm) -> score <= 30
    s_low = compute_hazard_score(10.0, "rainfall")
    assert 0 <= s_low <= 30
    assert score_to_risk_level(s_low) == "low"

    # Moderate rain (35mm) -> score 31-60
    s_mod = compute_hazard_score(35.0, "rainfall")
    assert 31 <= s_mod <= 60
    assert score_to_risk_level(s_mod) == "moderate"

    # Severe rain (150mm) -> score >= 86
    s_sev = compute_hazard_score(150.0, "rainfall")
    assert s_sev >= 86
    assert score_to_risk_level(s_sev) == "severe"


def test_model_consensus():
    # Identical scores -> 100% consensus
    c_perf = compute_consensus({"owm": 60, "imd": 60, "era5": 60})
    assert c_perf == 100.0
    assert consensus_to_label(c_perf) == "High confidence"

    # Strong agreement (60, 64, 58) -> High confidence (> 85%)
    c_high = compute_consensus({"owm": 60, "imd": 64, "era5": 58})
    assert c_high >= 85.0
    assert consensus_to_label(c_high) == "High confidence"

    # Strong disagreement (20 vs 90) -> Low confidence (< 60%)
    c_low = compute_consensus({"owm": 20, "imd": 90})
    assert c_low < 60.0
    assert "Low confidence" in consensus_to_label(c_low)


@pytest.mark.asyncio
async def test_farmer_query_flow():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/v1/query",
            json={"text": "Should I irrigate my crops in Madurai tomorrow?", "language": "en"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "advisory_text" in data
        assert data["confidence_label"] in ["High confidence", "Moderate confidence", "Low confidence — models disagree"]


@pytest.mark.asyncio
async def test_maps_and_warnings():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Map config
        r_cfg = await client.get("/v1/maps/config")
        assert r_cfg.status_code == 200

        # Heatmap GeoJSON
        r_heat = await client.get("/v1/maps/temperature-heatmap")
        assert r_heat.status_code == 200
        assert r_heat.json()["type"] == "FeatureCollection"

        # Rain radar
        r_rad = await client.get("/v1/maps/rain-radar")
        assert r_rad.status_code == 200
        assert len(r_rad.json()["frames"]) > 0

        # Active warnings
        r_warn = await client.get("/v1/warnings/active")
        assert r_warn.status_code == 200
        assert r_warn.json()["status"] == "active"


@pytest.mark.asyncio
async def test_crowdsourced_reports():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Get reports
        r_get = await client.get("/v1/reports")
        assert r_get.status_code == 200
        assert r_get.json()["type"] == "FeatureCollection"
        assert len(r_get.json()["features"]) > 0

        # Post report
        r_post = await client.post(
            "/v1/reports",
            json={
                "hazard_type": "waterlogging",
                "severity": "high",
                "lat": 13.0827,
                "lon": 80.2707,
                "location_name": "Anna Nagar, Chennai",
                "description": "Water logging test"
            }
        )
        assert r_post.status_code == 201
        assert r_post.json()["hazard_type"] == "waterlogging"
