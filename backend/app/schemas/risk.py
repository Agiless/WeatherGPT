"""
Pydantic schemas for the Weather Risk Engine.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class HazardScore(BaseModel):
    """Per-hazard risk scores from each weather model source."""
    owm_score: Optional[int] = None
    imd_score: Optional[int] = None
    era5_clim_score: Optional[int] = None
    consensus_score: float = 0.0
    final_risk_level: str = "low"  # low | moderate | high | severe


class RiskObject(BaseModel):
    """The core Risk Engine output — structured, decision-ready."""
    location: dict = Field(default_factory=dict)  # {"lat": ..., "lon": ...}
    valid_time: Optional[datetime] = None
    hazards: dict[str, HazardScore] = Field(default_factory=dict)
    warnings_active: list[str] = Field(default_factory=list)
    computed_at: Optional[datetime] = None
    imd_official_upgrade: bool = False
