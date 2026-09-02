"""
Personas endpoint — returns all persona types with their response-format configs.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_db

router = APIRouter(tags=["personas"])


@router.get("/v1/personas")
async def list_personas(db: AsyncSession | None = Depends(get_db)):
    """Return all personas with their response_format config."""
    if db is not None:
        try:
            result = await db.execute(
                text(
                    "SELECT persona_id, persona_type, abstraction_level, "
                    "default_language, response_format, created_at "
                    "FROM personas ORDER BY persona_type"
                )
            )
            rows = result.mappings().all()
            if rows:
                return {
                    "personas": [
                        {
                            "persona_id": str(row["persona_id"]),
                            "persona_type": row["persona_type"],
                            "abstraction_level": row["abstraction_level"],
                            "default_language": row["default_language"],
                            "response_format": row["response_format"],
                            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                        }
                        for row in rows
                    ]
                }
        except Exception:
            pass

    # Built-in fallback personas
    from app.llm.layer2 import PERSONA_CONFIGS
    levels = {
        "farmer": "low", "fisherman": "low", "logistics": "medium",
        "traveller": "medium", "generic": "medium", "researcher_scientist": "high",
        "disaster_manager_govt": "high", "aviation": "high",
    }
    return {
        "personas": [
            {
                "persona_id": f"00000000-0000-0000-0000-0000000000{i+1:02d}",
                "persona_type": p_type,
                "abstraction_level": levels.get(p_type, "medium"),
                "default_language": "en",
                "response_format": conf,
                "created_at": None,
            }
            for i, (p_type, conf) in enumerate(PERSONA_CONFIGS.items())
        ]
    }
