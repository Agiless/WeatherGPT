"""
Pydantic schemas for the /v1/query endpoint.
Covers the full request → Layer 1 extract → Layer 2 response pipeline.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Query Request ─────────────────────────────────────────

class QueryRequest(BaseModel):
    """Incoming query from Expo Go — text and/or audio."""
    text: Optional[str] = None
    language: Optional[str] = "en"
    voice_requested: Optional[bool] = False
    connectivity_tier: Optional[str] = "online"  # online | low-bandwidth | sms-only
    # audio is handled via multipart form-data, not in this JSON body


# ── LLM Layer 1 Output ───────────────────────────────────

class LocationParam(BaseModel):
    lat: float
    lon: float
    place_name: Optional[str] = None


class TimeWindow(BaseModel):
    start: Optional[str] = None  # ISO date string
    end: Optional[str] = None


class ExtractedParams(BaseModel):
    """Structured output from LLM Layer 1 — intent & parameter extraction."""
    persona_type: str = "generic"
    location: Optional[LocationParam] = None
    time_window: Optional[TimeWindow] = None
    hazard_type: str = "general"  # rainfall, wind, flood, cyclone, temperature, general
    query_intent: str = "forecast"
    language: str = "en"


# ── Query Response ────────────────────────────────────────

class QueryResponse(BaseModel):
    """Response sent back to Expo Go — persona-shaped."""
    advisory_text: str
    transcribed_text: Optional[str] = None
    confidence_label: str = "Moderate confidence"  # High / Moderate / Low
    persona_type: str = "generic"
    fields: dict = Field(default_factory=dict)  # persona-specific structured fields
    audio_url: Optional[str] = None
    audio_base64: Optional[str] = None
    risk_object: Optional[dict] = None  # included for high-abstraction personas only
    weather_data: Optional[dict] = None  # current conditions + forecast for display
    source_attribution: str = ""
    computed_at: Optional[datetime] = None


class TTSRequest(BaseModel):
    """Request payload for text-to-speech synthesis."""
    text: str
    language: str = "hi"
    gender: Optional[str] = "female"

