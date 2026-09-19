"""
WeatherGPT — FastAPI application entry point.

Run with:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, personas, profile, query, maps, warnings, risk_snapshot, reports
from app.db.engine import get_engine, dispose_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: verify Supabase Postgres connection. Shutdown: dispose engine."""
    # ── Startup ───────────────────────────────────────────────
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            from sqlalchemy import text as sa_text
            result = await conn.execute(sa_text("SELECT 1"))
            result.fetchone()
        print("[OK] Connected to Supabase Postgres")
    except RuntimeError as e:
        # SUPABASE_DB_URL not set — expected during early setup
        print(f"[WARN] {e}")
        print("  The API will start but DB-dependent endpoints will fail.")
    except Exception as e:
        print(f"[WARN] Supabase Postgres not available: {e}")
        print("  The API will start but DB-dependent endpoints will fail.")
        print("  Set SUPABASE_DB_URL in .env to fix this.")

    yield

    # ── Shutdown ──────────────────────────────────────────────
    try:
        await dispose_engine()
        print("[OK] Database connections closed")
    except Exception:
        pass


app = FastAPI(
    title="WeatherGPT",
    description="AI conversational weather intelligence platform",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS — allow everything for the prototype ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pathlib import Path
from fastapi.responses import HTMLResponse

WEB_HTML_PATH = Path(__file__).parent / "web" / "index.html"


@app.get("/", response_class=HTMLResponse)
@app.get("/web", response_class=HTMLResponse)
async def serve_web_ui():
    """Serves the interactive WeatherGPT web application."""
    if WEB_HTML_PATH.exists():
        with open(WEB_HTML_PATH, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>WeatherGPT Web UI loading...</h1>")


@app.get("/health")
async def root_health():
    return {"status": "ok", "app": "WeatherGPT", "version": "1.0.0"}


# ── Register routers ─────────────────────────────────────
app.include_router(health.router)
app.include_router(personas.router)
app.include_router(profile.router)
app.include_router(query.router)
app.include_router(maps.router)
app.include_router(warnings.router)
app.include_router(risk_snapshot.router)
app.include_router(reports.router)

