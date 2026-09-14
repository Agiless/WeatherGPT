"""
Tests for Bhashini Voice, Translation, and Speech Synthesis Integration
"""

import pytest
import httpx
import io
import wave
import struct
from app.main import app
from app.bhashini.client import get_bhashini_client


def create_dummy_wav() -> bytes:
    """Creates a minimal valid PCM WAV in-memory byte buffer."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(16000)
        # 0.5 second of silence / tone
        frames = [struct.pack("<h", 0) for _ in range(8000)]
        wav_file.writeframes(b"".join(frames))
    return buf.getvalue()


@pytest.mark.asyncio
async def test_bhashini_transcribe_fallback():
    client = get_bhashini_client()
    wav_bytes = create_dummy_wav()
    result = await client.transcribe_audio(wav_bytes, audio_format="wav", source_language="ta")
    assert "transcript" in result
    assert len(result["transcript"]) > 0
    assert result["source_language"] == "ta"


@pytest.mark.asyncio
async def test_bhashini_translation_fallback():
    client = get_bhashini_client()
    text = "Hello farmer, heavy rain expected tomorrow."
    result = await client.translate_text(text, "en", "hi")
    assert result is not None
    assert len(result) > 0


@pytest.mark.asyncio
async def test_voice_query_endpoint():
    wav_bytes = create_dummy_wav()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        files = {
            "audio": ("recording.wav", wav_bytes, "audio/wav")
        }
        data = {
            "persona_type": "farmer",
            "language": "ta"
        }
        resp = await client.post("/v1/query/voice", files=files, data=data)
        assert resp.status_code == 200
        json_data = resp.json()
        assert "advisory_text" in json_data
        assert "transcribed_text" in json_data
        assert json_data["transcribed_text"] is not None


@pytest.mark.asyncio
async def test_tts_endpoint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/v1/tts",
            json={"text": "Heavy rainfall warning for coastal districts.", "language": "en"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["success", "client_fallback"]
