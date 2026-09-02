"""
Pydantic schemas for persona configuration.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PersonaConfig(BaseModel):
    """Response-format config stored as JSONB on the personas table."""
    max_words: int = 200
    units: str = "mixed"  # simple | mixed | technical
    show_probability_numbers: bool = True
    show_map: bool = True
    show_model_deltas: bool = False
    show_alert_polygons: bool = False
    map_layers_default: list[str] = Field(default_factory=lambda: ["temp_heatmap", "rain_radar"])
    voice_default: bool = False
    sms_fallback: bool = False
    fields_included: list[str] = Field(default_factory=list)


class PersonaOut(BaseModel):
    """Persona as returned by GET /v1/personas."""
    persona_id: UUID
    persona_type: str
    abstraction_level: str  # low | medium | high
    default_language: str
    response_format: Optional[PersonaConfig] = None
    created_at: Optional[datetime] = None
