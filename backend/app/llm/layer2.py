"""
LLM Layer 2 -- Persona-Shaped Response Generation.
Takes the risk object + persona config and generates a natural-language advisory.
The LLM is constrained to ONLY use figures from the risk object -- no hallucinated numbers.
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


def _build_system_prompt(persona_type: str) -> str:
    config = PERSONA_CONFIGS.get(persona_type, PERSONA_CONFIGS["generic"])
    return f"""You are WeatherGPT, an AI weather advisory assistant.

PERSONA: {persona_type}
MAX WORDS: {config['max_words']}
UNITS: {config['units']}
SHOW PROBABILITY NUMBERS: {config['show_probability_numbers']}
FIELDS TO INCLUDE: {', '.join(config['fields_included'])}

CRITICAL RULES:
1. ONLY use numbers and data from the provided risk object. NEVER invent or hallucinate weather numbers.
2. Keep your response under {config['max_words']} words.
3. If units are "simple", use plain language (e.g. "heavy rain" not "65mm/24h").
4. If units are "technical", include precise numbers with units.
5. Always mention the data source (OpenWeather, IMD, ERA5) when citing specific values.
6. Include a clear action recommendation appropriate for the persona.
7. State the confidence level based on the consensus score provided.

Return a JSON object:
{{
  "advisory_text": "main advisory message",
  "confidence_label": "High confidence" | "Moderate confidence" | "Low confidence - models disagree",
  "fields": {{
    // persona-specific structured fields from the risk object
  }},
  "source_attribution": "data sources used"
}}"""


async def generate_response(
    query: str,
    persona_type: str,
    risk_object: dict,
    extracted_params: dict,
) -> QueryResponse:
    """Generate a persona-shaped response from the risk object."""
    config = PERSONA_CONFIGS.get(persona_type, PERSONA_CONFIGS["generic"])
    system_prompt = _build_system_prompt(persona_type)

    user_msg = (
        f"User query: {query}\n"
        f"Extracted parameters: {json.dumps(extracted_params, default=str)}\n"
        f"Risk object (use ONLY these numbers): {json.dumps(risk_object, default=str)}"
    )

    try:
        raw = await llm_call(
            system_prompt=system_prompt,
            user_prompt=user_msg,
            json_mode=True,
            max_tokens=1024,
            temperature=0.4,
        )
        data = json.loads(raw)
        return QueryResponse(
            advisory_text=data.get("advisory_text", raw),
            confidence_label=data.get("confidence_label", "Moderate confidence"),
            persona_type=persona_type,
            fields=data.get("fields", {}),
            source_attribution=data.get("source_attribution", ""),
            risk_object=risk_object if config.get("show_probability_numbers") else None,
            computed_at=datetime.now(timezone.utc),
        )
    except Exception:
        # Fallback: return the raw LLM text or a default
        return QueryResponse(
            advisory_text=(
                "Weather conditions are being analyzed. "
                "Please check back shortly for detailed advisory."
            ),
            confidence_label="Moderate confidence",
            persona_type=persona_type,
            fields={},
            source_attribution="WeatherGPT",
            computed_at=datetime.now(timezone.utc),
        )
