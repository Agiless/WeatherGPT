"""
WeatherGPT Server Runner Script.
Run directly with:
    python main.py
or
    python backend/main.py

Equivalent to:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

import sys
from pathlib import Path
import uvicorn

# Ensure the backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("=" * 60)
    print("  WeatherGPT FastAPI Server")
    print("=" * 60)
    print("  Local:   http://localhost:8000")
    print("  LAN:     http://0.0.0.0:8000")
    print("  API Docs: http://localhost:8000/docs")
    print("=" * 60 + "\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
