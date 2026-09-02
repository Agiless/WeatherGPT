"""
Profile endpoint — single demo user, no auth.
"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_db
from app.schemas.profile import UserProfileOut, UserProfileUpdate

router = APIRouter(tags=["profile"])

# Fixed demo user ID (matches seed.sql)
DEMO_USER_ID = "00000000-0000-0000-0000-000000000002"


@router.get("/v1/profile", response_model=UserProfileOut)
async def get_profile(db: AsyncSession = Depends(get_db)):
    """Return the single demo user profile."""
    result = await db.execute(
        text(
            "SELECT up.user_id, p.persona_type, up.preferred_language, "
            "up.home_lat, up.home_lon, up.connectivity_tier, up.phone_number "
            "FROM user_profiles up "
            "LEFT JOIN personas p ON up.persona_id = p.persona_id "
            "WHERE up.user_id = :uid"
        ),
        {"uid": DEMO_USER_ID},
    )
    row = result.mappings().first()
    if not row:
        return UserProfileOut(user_id=DEMO_USER_ID)
    return UserProfileOut(**dict(row))


@router.put("/v1/profile", response_model=UserProfileOut)
async def update_profile(
    update: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update the demo user profile (partial update)."""
    sets = []
    params: dict = {"uid": DEMO_USER_ID}

    # Handle persona_type → persona_id lookup
    if update.persona_type is not None:
        persona_result = await db.execute(
            text("SELECT persona_id FROM personas WHERE persona_type = :pt"),
            {"pt": update.persona_type},
        )
        persona_row = persona_result.first()
        if persona_row:
            sets.append("persona_id = :pid")
            params["pid"] = str(persona_row[0])

    # Simple field mappings
    field_map = {
        "preferred_language": "preferred_language",
        "home_lat": "home_lat",
        "home_lon": "home_lon",
        "connectivity_tier": "connectivity_tier",
        "phone_number": "phone_number",
    }
    for pydantic_field, db_col in field_map.items():
        value = getattr(update, pydantic_field)
        if value is not None:
            sets.append(f"{db_col} = :{pydantic_field}")
            params[pydantic_field] = value

    if sets:
        query = f"UPDATE user_profiles SET {', '.join(sets)} WHERE user_id = :uid"
        await db.execute(text(query), params)
        await db.commit()

    # Return the updated profile
    return await get_profile(db)
