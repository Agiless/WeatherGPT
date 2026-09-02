"""
LLM Layer 1 — Intent & Parameter Extraction.
Extracts persona, location, time window, hazard type from a natural language query.
Output validates against ExtractedParams schema; retries once on failure, then 422.
"""

import json
import logging
from app.llm.provider import llm_call
from app.schemas.query import ExtractedParams

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a weather query parser. Extract structured parameters from the user's weather question.

Return a JSON object with exactly these fields:
{
  "persona_type": "farmer" | "fisherman" | "logistics" | "traveller" | "generic" | "researcher_scientist" | "disaster_manager_govt" | "aviation",
  "location": {"lat": number, "lon": number, "place_name": "string"} or null,
  "time_window": {"start": "YYYY-MM-DD" or null, "end": "YYYY-MM-DD" or null},
  "hazard_type": "rainfall" | "wind" | "flood" | "cyclone" | "temperature" | "general",
  "query_intent": "forecast" | "irrigation_advisory" | "travel_advisory" | "route_hazard" | "trend" | "climate" | "vs_normal" | "historical" | "general",
  "language": "en" | "hi" | "ta" | "te" | "bn" | "mr"
}

Rules:
- If location is mentioned by name, resolve to approximate lat/lon. For Indian cities use known coordinates.
- If no location is mentioned, set location to null.
- If no specific time is mentioned, default time_window to null (means "now/today").
- Infer hazard_type from the query context (e.g. "will it rain" -> "rainfall", "wind speed" -> "wind").
- Default persona_type to "generic" if not clear from context.
- Always return valid JSON, nothing else."""


async def extract_params(
    query: str,
    user_persona: str = "generic",
    user_language: str = "en",
    home_lat: float | None = None,
    home_lon: float | None = None,
) -> ExtractedParams:
    """
    Call LLM Layer 1 to extract structured parameters from a natural language query.
    Retries once on parse failure. Falls back to defaults if both attempts fail.
    """
    user_msg = f"User persona: {user_persona}\nUser language: {user_language}\nQuery: {query}"

    for attempt in range(2):
        try:
            raw = await llm_call(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_msg,
                json_mode=True,
                max_tokens=512,
                temperature=0.1,
            )
            data = json.loads(raw)
            params = ExtractedParams(**data)

            # Fall back to home location if LLM didn't extract one
            if params.location is None and home_lat is not None and home_lon is not None:
                from app.schemas.query import LocationParam
                params.location = LocationParam(lat=home_lat, lon=home_lon, place_name="Home")

            # Override persona if user has a registered one
            if user_persona != "generic":
                params.persona_type = user_persona

            return params

        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Layer 1 attempt {attempt + 1} failed: {e}")
            if attempt == 0:
                continue
            # Final fallback
            from app.schemas.query import LocationParam
            loc = None
            if home_lat is not None and home_lon is not None:
                loc = LocationParam(lat=home_lat, lon=home_lon, place_name="Home")
            return ExtractedParams(
                persona_type=user_persona,
                location=loc,
                hazard_type="general",
                query_intent="forecast",
                language=user_language,
            )
