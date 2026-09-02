"""
Health check endpoint — used by Expo Go splash screen to verify laptop is reachable.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/v1/health")
async def health_check():
    """Simple health check. Returns 200 if the API is running."""
    return {
        "status": "ok",
        "service": "weathergpt",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
