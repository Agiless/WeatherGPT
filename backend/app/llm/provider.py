"""
LLM provider wrapper — supports Google Gemini native API and OpenAI-compatible APIs.
Configurable via LLM_API_KEY in .env.
Logs full request/response/error visibility in the terminal.
"""

import json
import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _clean_json_text(text: str) -> str:
    """Strip markdown code blocks and optional trailing wrappers."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]
    return text


async def _call_gemini(
    api_key: str,
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.3,
) -> str:
    """
    Call Google Gemini REST API using generateContent.
    Tries gemini-2.5-flash first, falling back to gemini-2.0-flash or gemini-1.5-flash.
    Logs request and response in terminal.
    """
    models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    last_err = None

    payload: dict = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
    }

    if system_prompt:
        payload["system_instruction"] = {"parts": [{"text": system_prompt}]}

    if json_mode:
        payload["generationConfig"]["response_mime_type"] = "application/json"

    async with httpx.AsyncClient(timeout=35.0) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            print(f"\n[GEMINI REQUEST] Model: {model} | JSON Mode: {json_mode}")
            print(f"  User Prompt: {user_prompt[:140]}..." if len(user_prompt) > 140 else f"  User Prompt: {user_prompt}")
            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                        raw_text = candidates[0]["content"]["parts"][0].get("text", "")
                        cleaned = _clean_json_text(raw_text) if json_mode else raw_text
                        print(f"[GEMINI RESPONSE] 200 OK | {len(cleaned)} chars")
                        preview = cleaned[:180].replace("\n", " ")
                        print(f"  Preview: {preview}...")
                        return cleaned
                    raise ValueError(f"Unexpected Gemini candidate structure: {data}")

                print(f"[GEMINI ERROR] Model: {model} | HTTP {response.status_code}")
                print(f"  Response: {response.text[:300]}")
                last_err = Exception(f"Gemini API error ({model}): {response.status_code} {response.text[:200]}")
            except Exception as e:
                print(f"[GEMINI EXCEPTION] Model {model} failed: {e}")
                last_err = e

    if last_err:
        print(f"[GEMINI ALL MODELS FAILED] Error: {last_err}")
        raise last_err
    raise RuntimeError("All Gemini models failed.")


async def _call_openai(
    api_key: str,
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.3,
) -> str:
    """Call OpenAI-compatible chat completions API."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    body = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    if json_mode:
        body["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    print(f"\n[OPENAI REQUEST] Model: gpt-4o-mini | JSON Mode: {json_mode}")
    print(f"  User Prompt: {user_prompt[:140]}...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json=body,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]
            cleaned = _clean_json_text(raw_text) if json_mode else raw_text
            print(f"[OPENAI RESPONSE] 200 OK | {len(cleaned)} chars")
            print(f"  Preview: {cleaned[:180].replace(chr(10), ' ')}...")
            return cleaned
        except Exception as e:
            print(f"[OPENAI ERROR] {e}")
            raise


async def llm_call(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.3,
) -> str:
    """
    Make an LLM API call using Gemini (default for Google API keys) or OpenAI.
    Falls back to a structured mock response if no API key is configured.
    """
    settings = get_settings()

    if not settings.llm_api_key:
        print("[LLM WARN] No LLM_API_KEY configured — using fallback mock response")
        if json_mode:
            return json.dumps({
                "persona_type": "generic",
                "location": {"lat": 13.0827, "lon": 80.2707, "place_name": "Chennai"},
                "time_window": {"start": None, "end": None},
                "hazard_type": "general",
                "query_intent": "forecast",
                "language": "en",
            })
        return (
            "Weather advisory: Conditions are generally fair. "
            "Temperature around 32 degrees C with partly cloudy skies. "
            "No significant weather warnings at this time. "
            "Stay hydrated and check back for updates."
        )

    # Dispatch based on API key prefix
    if settings.llm_api_key.startswith("sk-"):
        return await _call_openai(
            api_key=settings.llm_api_key,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            json_mode=json_mode,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    else:
        # Gemini (AIzaSy... or standard Google Gemini keys)
        return await _call_gemini(
            api_key=settings.llm_api_key,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            json_mode=json_mode,
            max_tokens=max_tokens,
            temperature=temperature,
        )
