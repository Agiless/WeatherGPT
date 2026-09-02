"""
WeatherGPT Root Runner.
Allows running the server directly from the project root with:
    py main.py
or
    python main.py
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  WeatherGPT FastAPI Server (Root Runner)")
    print("=" * 60)
    print("  Local:    http://localhost:8000")
    print("  LAN:      http://0.0.0.0:8000")
    print("  API Docs: http://localhost:8000/docs")
    print("=" * 60 + "\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
