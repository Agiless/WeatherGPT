"""
Pydantic schemas for user profile endpoints.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class UserProfileOut(BaseModel):
    """User profile as returned by GET /v1/profile."""
    user_id: str
    persona_type: Optional[str] = "generic"
    preferred_language: str = "en"
    home_lat: Optional[float] = None
    home_lon: Optional[float] = None
    connectivity_tier: str = "online"
    phone_number: Optional[str] = None


class UserProfileUpdate(BaseModel):
    """Fields the client can update via PUT /v1/profile."""
    persona_type: Optional[str] = None
    preferred_language: Optional[str] = None
    home_lat: Optional[float] = None
    home_lon: Optional[float] = None
    connectivity_tier: Optional[str] = None
    phone_number: Optional[str] = None
