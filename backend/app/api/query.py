"""
Query API endpoint (/v1/query)
Coordinates the complete end-to-end pipeline:
Request -> Layer 1 Extract -> Data Orchestrator -> Risk Engine -> Layer 2 Persona Response
"""

import time
import json
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.engine import get_db
from app.schemas.query import QueryRequest, QueryResponse, ExtractedParams
from app.llm.layer1 import extract_params
from app.sources.orchestrator import fetch_weather_data
from app.risk_engine.engine import build_risk_object
from app.llm.layer2 import generate_response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["query"])


@router.post("/v1/query", response_model=QueryResponse)
async def query_weather(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Primary conversational query endpoint.
    Handles text queries, extracts intent via LLM Layer 1,
    retrieves meteorological consensus data, and generates a persona-shaped advisory.
    Logs each stage and any error to terminal.
    """
    start_time = time.time()
    raw_query = request.text or "Current weather conditions"

    print("\n" + "=" * 65)
    print(f"[QUERY RECEIVED] \"{raw_query}\"")
    print(f"  Language: {request.language or 'en'}")

    try:
        # Step 1: LLM Layer 1 Parameter Extraction
        extracted: ExtractedParams = await extract_params(
            query=raw_query,
            user_persona="generic",
            user_language=request.language or "en",
        )
        loc_str = (
            f"{extracted.location.place_name} ({extracted.location.lat:.4f}, {extracted.location.lon:.4f})"
            if extracted.location
            else "Auto/Default"
        )
        print(f"[LAYER 1 EXTRACTED] Persona: {extracted.persona_type} | Location: {loc_str} | Hazard: {extracted.hazard_type} | Intent: {extracted.query_intent}")

        # Step 2: Data Orchestrator (Parallel fan-out)
        weather_data = await fetch_weather_data(extracted)
        print(f"[DATA ORCHESTRATOR] Retrieved weather data points: {len(weather_data) if hasattr(weather_data, '__len__') else 'ok'}")

        # Step 3: Weather Risk Engine (Scores & Consensus)
        risk_obj = await build_risk_object(
            weather_data=weather_data,
            hazard_focus=extracted.hazard_type,
        )
        hazards_summary = {
            k: f"{v.final_risk_level} (Consensus: {v.consensus_score}%)"
            for k, v in risk_obj.hazards.items()
        }
        print(f"[RISK ENGINE] Evaluated hazards: {hazards_summary}")

        # Step 4: LLM Layer 2 Persona-Shaped Response Generation
        persona_type = extracted.persona_type
        response: QueryResponse = await generate_response(
            query=raw_query,
            persona_type=persona_type,
            risk_object=risk_obj.model_dump(mode="json"),
            extracted_params=extracted.model_dump(mode="json"),
        )

        elapsed_ms = int((time.time() - start_time) * 1000)
        print(f"[LAYER 2 ADVISORY] [{response.confidence_label}] Latency: {elapsed_ms}ms")
        print(f"  Advisory: \"{response.advisory_text}\"")
        print("=" * 65 + "\n")

        # Step 5: Logging to query_logs table (best effort)
        if db is not None:
            try:
                await db.execute(
                    text("""
                        INSERT INTO query_logs (
                            persona_type, raw_query, extracted_params, risk_object,
                            final_response, latency_ms, consensus_score, created_at
                        )
                        VALUES (
                            :persona, :raw_query, :extracted::jsonb, :risk_obj::jsonb,
                            :response, :latency_ms, :consensus, now()
                        )
                    """),
                    {
                        "persona": persona_type,
                        "raw_query": raw_query,
                        "extracted": json.dumps(extracted.model_dump(mode="json")),
                        "risk_obj": json.dumps(risk_obj.model_dump(mode="json")),
                        "response": response.advisory_text,
                        "latency_ms": elapsed_ms,
                        "consensus": risk_obj.hazards.get("rainfall", {}).consensus_score if "rainfall" in risk_obj.hazards else 90.0,
                    }
                )
                await db.commit()
            except Exception as e:
                logger.debug(f"Query logging skipped/deferred: {e}")

        return response

    except Exception as err:
        import traceback
        print("\n" + "!" * 65)
        print(f"[QUERY FAILED] Error during query execution: {err}")
        traceback.print_exc()
        print("!" * 65 + "\n")
        raise


@router.post("/v1/query/voice", response_model=QueryResponse)
async def query_weather_voice(
    audio: UploadFile = File(...),
    persona_type: str = Form("farmer"),
    language: str = Form("en"),
    db: AsyncSession = Depends(get_db),
):
    """
    Voice upload query endpoint for mobile audio recordings (expo-av m4a/wav).
    Passes through ASR (or simulated transcript) to standard query pipeline.
    """
    # For prototype without dedicated external Bhashini key:
    transcript = "What is the rain and wind forecast for my crops tomorrow?"
    req = QueryRequest(text=transcript, language=language)
    return await query_weather(req, db)
