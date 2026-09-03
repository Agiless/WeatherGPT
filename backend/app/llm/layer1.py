"""
LLM Layer 1 — Intent & Parameter Extraction.
Extracts persona, location, time window, hazard type from a natural language query.
Output validates against ExtractedParams schema; retries once on failure, then 422.

Fine-tuned system prompt includes:
  - Explicit Indian city coordinate lookup table
  - Few-shot examples for each query_intent type
  - Strict hazard_type inference rules
"""

import json
import logging
from app.llm.provider import llm_call
from app.schemas.query import ExtractedParams

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are WeatherGPT Layer 1 — a weather query parser that extracts structured parameters from natural language.

## OUTPUT FORMAT
Return a JSON object with EXACTLY these fields:
{
  "persona_type": "farmer" | "fisherman" | "logistics" | "traveller" | "generic" | "researcher_scientist" | "disaster_manager_govt" | "aviation",
  "location": {"lat": number, "lon": number, "place_name": "string"} or null,
  "time_window": {"start": "YYYY-MM-DD" or null, "end": "YYYY-MM-DD" or null},
  "hazard_type": "rainfall" | "wind" | "flood" | "cyclone" | "temperature" | "general",
  "query_intent": "forecast" | "irrigation_advisory" | "travel_advisory" | "route_hazard" | "trend" | "climate" | "vs_normal" | "historical" | "general",
  "language": "en" | "hi" | "ta" | "te" | "bn" | "mr"
}

## INDIAN CITY COORDINATES (use these exact values)
Chennai: 13.0827, 80.2707
Madurai: 9.9252, 78.1198
Coimbatore: 11.0168, 76.9558
Tiruchirappalli: 10.7905, 78.7047
Bengaluru: 12.9716, 77.5946
Mangaluru: 12.9141, 74.8560
Thiruvananthapuram: 8.5241, 76.9366
Kochi: 9.9312, 76.2673
Hyderabad: 17.3850, 78.4867
Visakhapatnam: 17.6868, 83.2185
Mumbai: 19.0760, 72.8777
Pune: 18.5204, 73.8567
Nagpur: 21.1458, 79.0882
New Delhi / Delhi: 28.6139, 77.2090
Lucknow: 26.8467, 80.9462
Varanasi: 25.3176, 82.9739
Jaipur: 26.9124, 75.7873
Jodhpur: 26.2389, 73.0243
Ahmedabad: 23.0225, 72.5714
Bhopal: 23.2599, 77.4126
Kolkata: 22.5726, 88.3639
Bhubaneswar: 20.2961, 85.8245
Patna: 25.6093, 85.1376
Guwahati: 26.1445, 91.7362
Chandigarh: 30.7333, 76.7794
Ranchi: 23.3441, 85.3096
Panaji / Goa: 15.4909, 73.8278
Raipur: 21.2514, 81.6296

For cities NOT in this list, use your best knowledge of geographic coordinates.

## HAZARD TYPE RULES
- "will it rain" / "rainfall" / "precipitation" / "monsoon" / "showers" → "rainfall"
- "wind" / "storm" / "gale" / "breeze" → "wind"
- "flood" / "waterlogging" / "submergence" → "flood"
- "cyclone" / "hurricane" / "typhoon" / "depression" → "cyclone"
- "temperature" / "heat" / "cold" / "heatwave" / "cold wave" → "temperature"
- Everything else or multi-hazard queries → "general"

## QUERY INTENT RULES
- "forecast" / "what's the weather" / "how will it be" → "forecast"
- "should I irrigate" / "watering" / "crop" / "sowing" → "irrigation_advisory"
- "travel" / "trip" / "packing" / "visit" → "travel_advisory"
- "route" / "highway" / "logistics" / "delivery" / "transport" → "route_hazard"
- "trend" / "pattern" / "changing" → "trend"
- "climate" / "climatology" / "long-term" → "climate"
- "vs normal" / "anomaly" / "compared to average" → "vs_normal"
- "historical" / "last year" / "past data" → "historical"
- Otherwise → "general"

## FEW-SHOT EXAMPLES

Query: "Will it rain in Chennai tomorrow?"
Output: {"persona_type":"generic","location":{"lat":13.0827,"lon":80.2707,"place_name":"Chennai"},"time_window":{"start":null,"end":null},"hazard_type":"rainfall","query_intent":"forecast","language":"en"}

Query: "What's the weather like in Mumbai?"
Output: {"persona_type":"generic","location":{"lat":19.076,"lon":72.8777,"place_name":"Mumbai"},"time_window":{"start":null,"end":null},"hazard_type":"general","query_intent":"forecast","language":"en"}

Query: "Should I irrigate my crops in Madurai this week?"
Output: {"persona_type":"farmer","location":{"lat":9.9252,"lon":78.1198,"place_name":"Madurai"},"time_window":{"start":null,"end":null},"hazard_type":"rainfall","query_intent":"irrigation_advisory","language":"en"}

Query: "Wind and wave conditions for fishing near Tuticorin"
Output: {"persona_type":"fisherman","location":{"lat":8.7642,"lon":78.1348,"place_name":"Tuticorin"},"time_window":{"start":null,"end":null},"hazard_type":"wind","query_intent":"forecast","language":"en"}

Query: "Is there a cyclone warning for the Bay of Bengal coast?"
Output: {"persona_type":"generic","location":{"lat":13.0827,"lon":80.2707,"place_name":"Bay of Bengal Coast"},"time_window":{"start":null,"end":null},"hazard_type":"cyclone","query_intent":"forecast","language":"en"}

## RULES
- If location is mentioned by name, resolve to approximate lat/lon using the table above or your geographic knowledge.
- If NO location is mentioned at all, set location to null (the system will use the user's home location).
- If no specific time is mentioned, set time_window start and end to null (means "now/today").
- Default persona_type to the user's current persona if provided, otherwise "generic".
- Always return valid JSON and nothing else — no markdown, no explanation, no extra text."""


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
                temperature=0.05,  # Very low temperature for deterministic extraction
            )
            data = json.loads(raw)

            # Validate location coordinates are reasonable
            if data.get("location"):
                loc = data["location"]
                lat = loc.get("lat", 0)
                lon = loc.get("lon", 0)
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    logger.warning(f"Invalid coordinates from LLM: ({lat}, {lon}), nullifying")
                    data["location"] = None

            params = ExtractedParams(**data)

            # Fall back to home location if LLM didn't extract one
            if params.location is None and home_lat is not None and home_lon is not None:
                from app.schemas.query import LocationParam
                params.location = LocationParam(lat=home_lat, lon=home_lon, place_name="Home")

            # Override persona if user has a registered one
            if user_persona != "generic":
                params.persona_type = user_persona

            logger.info(
                f"Layer 1 extracted: persona={params.persona_type}, "
                f"location={params.location.place_name if params.location else 'None'}, "
                f"hazard={params.hazard_type}, intent={params.query_intent}"
            )
            return params

        except json.JSONDecodeError as e:
            logger.warning(f"Layer 1 attempt {attempt + 1} JSON parse failed: {e}")
            if attempt == 0:
                continue
        except Exception as e:
            logger.warning(f"Layer 1 attempt {attempt + 1} failed: {e}")
            if attempt == 0:
                continue

    # Final fallback — structured defaults
    logger.warning("Layer 1 extraction failed after 2 attempts, using fallback defaults")
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
