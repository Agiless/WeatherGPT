"""
Application configuration loaded from environment variables.
Uses pydantic-settings for type-safe .env loading.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """All application settings. Loaded from .env file in the backend directory."""

    # ── Supabase ──────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    supabase_db_url: str = ""  # postgresql+asyncpg://...

    # ── Weather APIs ──────────────────────────────────────────
    openweather_api_key: str = ""
    mapbox_access_token: str = ""
    era5_cds_url: str = "https://cds.climate.copernicus.eu/api"
    era5_cds_key: str = ""
    imd_api_base: str = "https://api.imd.gov.in/api/v1"
    imd_api_key: str = ""
    rainviewer_enabled: bool = True
    use_fixture_weather: bool = False

    # ── LLM ───────────────────────────────────────────────────
    llm_api_key: str = ""

    # ── Server ────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — call this everywhere instead of constructing Settings()."""
    return Settings()
