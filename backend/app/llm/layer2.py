"""
LLM Layer 2 -- Persona-Shaped Response Generation.
Takes the risk object + actual weather data + persona config and generates a natural-language advisory.
The LLM is strictly constrained to ONLY use figures from the provided data -- no hallucinated numbers.

Anti-hallucination guardrails:
  - Weather data is formatted as readable bullet points in the prompt
  - Explicit FORBIDDEN rules block invention of numbers
  - Risk object provides the only source of scores and levels
"""

import json
from app.llm.provider import llm_call
from app.schemas.query import QueryResponse
from datetime import datetime, timezone

# Persona-specific response format configs (from Section 3.3)
PERSONA_CONFIGS = {
    "farmer": {
        "max_words": 60, "units": "simple", "show_probability_numbers": False,
        "voice_default": True,
        "fields_included": ["advisory_text", "action_recommendation", "next_48h_summary"],
    },
    "fisherman": {
        "max_words": 60, "units": "simple", "show_probability_numbers": False,
        "voice_default": True,
        "fields_included": ["advisory_text", "action_recommendation", "wind_wave_plain"],
    },
    "logistics": {
        "max_words": 180, "units": "mixed", "show_probability_numbers": True,
        "fields_included": ["route_hazard_forecast", "eta_impact_summary", "daywise_cards"],
    },
    "traveller": {
        "max_words": 180, "units": "mixed", "show_probability_numbers": True,
        "fields_included": ["daywise_forecast", "packing_advisory", "travel_advisory"],
    },
    "generic": {
        "max_words": 200, "units": "mixed", "show_probability_numbers": True,
        "fields_included": ["conversational_forecast", "next_48h_summary"],
    },
    "researcher_scientist": {
        "max_words": 500, "units": "technical", "show_probability_numbers": True,
        "fields_included": ["raw_model_outputs", "consensus_score", "historical_trend",
                            "confidence_interval", "downloadable_csv_link"],
    },
    "disaster_manager_govt": {
        "max_words": 300, "units": "technical", "show_probability_numbers": True,
        "fields_included": ["risk_matrix", "consensus_score",
                            "affected_population_estimate", "escalation_recommendation"],
    },
    "aviation": {
        "max_words": 250, "units": "technical", "show_probability_numbers": True,
        "fields_included": ["metar_taf_briefing", "consensus_score", "hazard_windows"],
    },
}


def _format_weather_summary(weather_data: dict) -> str:
    """Format weather data as human-readable bullet points for the LLM prompt."""
    lines = []

    current = weather_data.get("current", {})
    if current:
        lines.append("CURRENT CONDITIONS:")
        if "temperature_c" in current:
            lines.append(f"  • Temperature: {current['temperature_c']}°C")
        if "humidity_pct" in current:
            lines.append(f"  • Humidity: {current['humidity_pct']}%")
        if "wind_speed_kmh" in current:
            lines.append(f"  • Wind Speed: {current['wind_speed_kmh']} km/h")
        if "wind_direction" in current:
            lines.append(f"  • Wind Direction: {current['wind_direction']}")
        if "weather_description" in current:
            lines.append(f"  • Description: {current['weather_description']}")
        if "pressure_hpa" in current:
            lines.append(f"  • Pressure: {current['pressure_hpa']} hPa")

    f24 = weather_data.get("forecast_24h", {})
    if f24:
        lines.append("24-HOUR FORECAST:")
        if "max_temp_c" in f24:
            lines.append(f"  • Max Temp: {f24['max_temp_c']}°C")
        if "min_temp_c" in f24:
            lines.append(f"  • Min Temp: {f24['min_temp_c']}°C")
        if "total_rain_mm" in f24:
            lines.append(f"  • Expected Rainfall: {f24['total_rain_mm']} mm")
        if "precip_probability" in f24:
            prob_pct = round(f24['precip_probability'] * 100) if f24['precip_probability'] <= 1 else f24['precip_probability']
            lines.append(f"  • Precipitation Probability: {prob_pct}%")
        if "max_wind_kmh" in f24:
            lines.append(f"  • Max Wind: {f24['max_wind_kmh']} km/h")

    f48 = weather_data.get("forecast_48h", {})
    if f48:
        lines.append("48-HOUR FORECAST:")
        if "max_temp_c" in f48:
            lines.append(f"  • Max Temp: {f48['max_temp_c']}°C")
        if "min_temp_c" in f48:
            lines.append(f"  • Min Temp: {f48['min_temp_c']}°C")
        if "total_rain_mm" in f48:
            lines.append(f"  • Expected Rainfall: {f48['total_rain_mm']} mm")
        if "precip_probability" in f48:
            prob_pct = round(f48['precip_probability'] * 100) if f48['precip_probability'] <= 1 else f48['precip_probability']
            lines.append(f"  • Precipitation Probability: {prob_pct}%")

    return "\n".join(lines) if lines else "No detailed weather data available."


def _format_risk_summary(risk_object: dict) -> str:
    """Format risk object as human-readable text for the LLM prompt."""
    lines = ["RISK ASSESSMENT:"]
    hazards = risk_object.get("hazards", {})
    for hazard_name, hazard_data in hazards.items():
        if isinstance(hazard_data, dict):
            level = hazard_data.get("final_risk_level", "unknown")
            consensus = hazard_data.get("consensus_score", 0)
            owm = hazard_data.get("owm_score", "N/A")
            imd = hazard_data.get("imd_score", "N/A")
            era5 = hazard_data.get("era5_clim_score", "N/A")
            lines.append(f"  {hazard_name.upper()}: Risk Level = {level.upper()}")
            lines.append(f"    OpenWeather Score: {owm}/100 | IMD Score: {imd}/100 | ERA5 Climatology: {era5}/100")
            lines.append(f"    Inter-Model Consensus: {consensus}%")

    warnings = risk_object.get("warnings_active", [])
    if warnings:
        lines.append(f"  ACTIVE WARNINGS: {', '.join(warnings)}")

    imd_upgrade = risk_object.get("imd_official_upgrade", False)
    if imd_upgrade:
        lines.append("  ⚠ IMD AUTHORITATIVE OVERRIDE ACTIVE — risk elevated by official warning")

    return "\n".join(lines)


def _build_system_prompt(persona_type: str) -> str:
    config = PERSONA_CONFIGS.get(persona_type, PERSONA_CONFIGS["generic"])
    return f"""You are WeatherGPT, an AI weather advisory assistant generating persona-specific weather advisories.

PERSONA: {persona_type}
MAX WORDS: {config['max_words']}
UNITS: {config['units']}
SHOW PROBABILITY NUMBERS: {config['show_probability_numbers']}
FIELDS TO INCLUDE: {', '.join(config['fields_included'])}

## CRITICAL ANTI-HALLUCINATION RULES
1. You MUST ONLY use numbers and data from the WEATHER DATA and RISK ASSESSMENT sections provided below.
2. NEVER invent, estimate, or hallucinate any weather numbers (temperatures, rainfall amounts, wind speeds, probabilities).
3. If a data point is missing, say "data not available" rather than making up a value.
4. Every numerical claim MUST be traceable to the provided data.
5. When citing specific values, attribute them to the correct source (OpenWeather, IMD, ERA5).

## RESPONSE FORMAT RULES
- If units are "simple", use plain everyday language (e.g. "heavy rain expected" not "65mm/24h").
- If units are "mixed", include key numbers with simple explanations.
- If units are "technical", include precise numbers with SI units and source attribution.
- Always include a clear, actionable recommendation appropriate for the persona.
- State confidence level based on the consensus score: >=85% = "High confidence", 60-84% = "Moderate confidence", <60% = "Low confidence — models disagree".

## OUTPUT JSON FORMAT
Return a JSON object:
{{
  "advisory_text": "Main advisory message tailored to the persona. This is the primary text the user will read.",
  "confidence_label": "High confidence" | "Moderate confidence" | "Low confidence - models disagree",
  "fields": {{
    // Include persona-specific structured fields using ONLY provided data
  }},
  "source_attribution": "List the data sources used (e.g. OpenWeather, IMD Official, ERA5 Climatology)"
}}"""


async def generate_response(
    query: str,
    persona_type: str,
    risk_object: dict,
    extracted_params: dict,
    weather_data: dict | None = None,
) -> QueryResponse:
    """Generate a persona-shaped response from the risk object and weather data."""
    config = PERSONA_CONFIGS.get(persona_type, PERSONA_CONFIGS["generic"])
    system_prompt = _build_system_prompt(persona_type)

    # Build weather summary from actual data
    weather_summary = "No weather data available."
    if weather_data:
        weather_summary = _format_weather_summary(weather_data)

    risk_summary = _format_risk_summary(risk_object)

    user_msg = (
        f"User query: {query}\n\n"
        f"Extracted parameters: {json.dumps(extracted_params, default=str)}\n\n"
        f"--- WEATHER DATA (use ONLY these numbers) ---\n"
        f"{weather_summary}\n\n"
        f"--- RISK ASSESSMENT (use ONLY these scores) ---\n"
        f"{risk_summary}\n\n"
        f"Generate the persona-appropriate advisory using ONLY the data above."
    )

    try:
        raw = await llm_call(
            system_prompt=system_prompt,
            user_prompt=user_msg,
            json_mode=True,
            max_tokens=2048,
            temperature=0.3,
        )
        data = json.loads(raw)
        return QueryResponse(
            advisory_text=data.get("advisory_text", raw),
            confidence_label=data.get("confidence_label", "Moderate confidence"),
            persona_type=persona_type,
            fields=data.get("fields", {}),
            source_attribution=data.get("source_attribution", ""),
            risk_object=risk_object if config.get("show_probability_numbers") else None,
            weather_data=weather_data,
            computed_at=datetime.now(timezone.utc),
        )
    except Exception as e:
        print(f"[LAYER 2 ERROR] Response generation failed: {e}")
        # Fallback: construct a basic advisory from the raw weather data
        fallback_text = _build_fallback_advisory(weather_data, risk_object, persona_type)
        return QueryResponse(
            advisory_text=fallback_text,
            confidence_label="Moderate confidence",
            persona_type=persona_type,
            fields={},
            source_attribution="WeatherGPT Risk Engine",
            risk_object=risk_object if config.get("show_probability_numbers") else None,
            weather_data=weather_data,
            computed_at=datetime.now(timezone.utc),
        )


def _build_fallback_advisory(
    weather_data: dict | None,
    risk_object: dict,
    persona_type: str,
) -> str:
    """Build a simple data-driven advisory without LLM when Layer 2 fails."""
    parts = []

    if weather_data:
        current = weather_data.get("current", {})
        temp = current.get("temperature_c")
        desc = current.get("weather_description", "")
        wind = current.get("wind_speed_kmh")
        humidity = current.get("humidity_pct")

        if temp is not None:
            parts.append(f"Current temperature is {temp}°C")
        if desc:
            parts.append(f"with {desc}")
        if wind is not None:
            parts.append(f"Wind speed: {wind} km/h")
        if humidity is not None:
            parts.append(f"Humidity: {humidity}%")

        f24 = weather_data.get("forecast_24h", {})
        rain = f24.get("total_rain_mm")
        if rain is not None and rain > 0:
            parts.append(f"Expected rainfall in 24h: {rain} mm")

    # Add risk level
    hazards = risk_object.get("hazards", {})
    rain_risk = hazards.get("rainfall", {})
    if isinstance(rain_risk, dict):
        level = rain_risk.get("final_risk_level", "unknown")
        parts.append(f"Rainfall risk level: {level}")

    wind_risk = hazards.get("wind", {})
    if isinstance(wind_risk, dict):
        level = wind_risk.get("final_risk_level", "unknown")
        parts.append(f"Wind risk level: {level}")

    if not parts:
        return (
            "Weather conditions are being analyzed. "
            "Please check back shortly for detailed advisory."
        )

    return ". ".join(parts) + "."
