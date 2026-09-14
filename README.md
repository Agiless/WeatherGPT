# WeatherGPT

**AI Conversational Weather Intelligence & Early Warning Platform**  
*SIH 2026 (Problem Statement SIH26068) · Persona-Based Advisory Abstraction · Weather Risk Engine · Multi-Model Consensus Scoring · Bhashini Vernacular Voice (ASR/NMT/TTS) · GPU Temperature Heatmaps & Rain Radar*

---

## 1. System Overview & Architecture

WeatherGPT delivers personalized, actionable, and safety-critical meteorological intelligence tailored to the operational needs of 8 distinct personas: **Farmers, Coastal Fishermen, Logistics Drivers, Daily Commuters, Travellers, Disaster Management Officials, Researchers, and Aviation Briefers**.

The system operates as a hybrid cloud-edge architecture, supporting both a responsive web interface and a cross-platform React Native (Expo) mobile application:

```
[ Android Phone (Expo Go) / Web Browser ]
         │  Voice (m4a/wav) / Text / Quick Chips
         ▼
[ FastAPI Backend (Python 3.11+) ] ────────► [ Supabase Postgres / PostGIS ]
   uvicorn 0.0.0.0:8000                         - 8 Seeded Personas & Profiles
   ├── Bhashini Indic Voice Layer               - 32 IMD Ground Weather Stations
   │    ├── ASR (Speech-to-Text)                - Risk Snapshots & Query Logs
   │    ├── NMT (Vernacular Translation)        - IMD Severe Warning Polygons
   │    └── TTS (Spoken Voice Synthesis)
   ├── LLM Layer 1 (Intent & Parameter Extraction)
   ├── Data Orchestrator (Parallel Async Fan-Out)
   │    ├── OpenWeather One Call 3.0 API
   │    ├── IMD Gateway (32-Station Network + Haversine)
   │    └── ERA5 Climatology & Baseline Fixtures
   ├── Meteorological Risk & Consensus Engine
   └── LLM Layer 2 (Strictly Grounded Persona Shaping)
         │
         ▼
[ MapLibre GL JS / Mapbox GL GPU Map Viewer ]
   ├── GPU Temperature Heatmap (-5°C to 45°C)
   ├── RainViewer Doppler Radar Tile Mosaic (mm/h)
   └── IMD Yellow / Orange / Red Warning Polygons
```

---

## 2. End-to-End Processing Pipeline

1. **Multilingual Input Capture:** User submits natural language text or records voice via `expo-audio` / Web Speech API in their native Indian language (Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, English).
2. **Bhashini ASR & NMT Translation:** Converts vernacular audio into text and translates query intents into standardized parameters.
3. **Intent & Parameter Extraction (LLM Layer 1):** Extracts structured entities (`persona_type`, `location`, `time_window`, `hazard_type`, `query_intent`) validated against strict Pydantic schemas.
4. **Data Orchestration:** Dispatches parallel asynchronous requests to:
   - **OpenWeather One Call 3.0:** Global current, hourly, and 8-day forecasts.
   - **IMD Gateway:** Official India ground observations and severe weather nowcasts.
   - **ERA5 / Copernicus:** Historical climatology baselines and anomaly trends.
5. **Weather Risk Engine:**
   - Standardizes units (m/s $\to$ km/h, mm accumulation).
   - Computes 0–100 standardized hazard scores for Rainfall, Wind, and Temperature.
   - Computes **Multi-Model Consensus Agreement**:
     $$\text{consensus\_score} = 100 - \left(\frac{\text{std\_dev}(\text{scores})}{\text{max\_possible\_std\_dev}}\right) \times 100$$
   - Enforces **IMD Authoritative Safety Overrides**: active Orange/Red IMD warnings elevate risk levels to at least `high`.
6. **Persona Synthesis & Grounding (LLM Layer 2):** Generates strictly grounded advisories (zero hallucination of raw metrics) shaped for the user's operational abstraction level.
7. **Bhashini TTS Speech Synthesis:** Generates natural regional audio playback for voice-first personas (*Farmer*, *Fisherman*).
8. **Interactive Visualizations:** GPU-accelerated heatmaps, Doppler rain radar sweeps, and consensus gauges render on Web and Mobile.

---

## 3. Project Structure

```
WeatherGPT/
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI REST endpoints
│   │   │   ├── health.py         # GET /v1/health probe
│   │   │   ├── personas.py       # GET /v1/personas
│   │   │   ├── profile.py        # GET/PUT /v1/profile
│   │   │   ├── query.py          # POST /v1/query, /v1/query/voice, /v1/tts
│   │   │   ├── maps.py           # /v1/maps (config, heatmap, radar, polygons, html)
│   │   │   ├── warnings.py       # GET /v1/warnings/active
│   │   │   └── risk_snapshot.py  # GET /v1/risk-snapshot & CSV export
│   │   ├── bhashini/             # MeitY Bhashini Indic Voice Suite
│   │   │   └── client.py         # ASR, NMT translation, and TTS speech synthesis
│   │   ├── core/
│   │   │   └── config.py         # Pydantic Settings (.env loader)
│   │   ├── db/
│   │   │   ├── engine.py         # Async SQLAlchemy with asyncpg
│   │   │   ├── schema.sql        # Supabase Postgres DDL (UUID, JSONB)
│   │   │   └── seed.sql          # 8 Personas & 32 IMD stations seed
│   │   ├── llm/
│   │   │   ├── provider.py       # Async OpenAI & Gemini client
│   │   │   ├── layer1.py         # Intent & parameter extraction
│   │   │   └── layer2.py         # Persona response synthesis
│   │   ├── maps/
│   │   │   └── map.html          # MapLibre GL JS / Mapbox map application
│   │   ├── risk_engine/
│   │   │   ├── thresholds.py     # Meteorological hazard thresholds
│   │   │   ├── scoring.py        # 0-100 hazard risk scoring formulas
│   │   │   ├── consensus.py      # Multi-model consensus spread algorithm
│   │   │   └── engine.py         # Risk Engine orchestrator
│   │   ├── schemas/              # Pydantic data contracts
│   │   │   ├── query.py
│   │   │   ├── persona.py
│   │   │   ├── risk.py
│   │   │   ├── maps.py
│   │   │   └── profile.py
│   │   ├── sources/              # Multi-source weather integrations
│   │   │   ├── orchestrator.py   # Parallel async fan-out & merge
│   │   │   ├── openweather.py    # One Call 3.0 API wrapper
│   │   │   ├── imd.py            # IMD client & Haversine resolver
│   │   │   └── era5.py           # ERA5 climatology loader
│   │   ├── web/
│   │   │   └── index.html        # Interactive dark glassmorphic web application
│   │   └── main.py               # FastAPI application entry point
│   ├── fixtures/                 # Pre-computed fixtures & fallback packs
│   ├── tests/
│   │   ├── test_weathergpt.py    # Core pipeline & risk engine tests
│   │   └── test_bhashini.py      # Bhashini ASR, NMT, and TTS tests
│   ├── requirements.txt
│   └── .env.example
├── mobile/                       # React Native (Expo) mobile application
│   ├── app.json                  # Expo config (extra.apiBaseUrl, extra.mapboxToken)
│   ├── App.tsx                   # Main entry point with AppNavigator
│   ├── package.json
│   └── src/
│       ├── api/
│       │   └── client.ts         # LAN fetch client wrapper
│       ├── maps/
│       │   └── WebViewMap.tsx    # Mapbox / MapLibre WebView container
│       ├── navigation/
│       │   └── AppNavigator.tsx  # Stack navigator
│       ├── screens/
│       │   ├── SplashScreen.tsx       # Screen 1: Animated launch & health ping
│       │   ├── OnboardingScreen.tsx   # Screen 2: Persona & location setup
│       │   ├── HomeScreen.tsx         # Screen 3: Persona-aware query dashboard
│       │   ├── VoiceInputScreen.tsx   # Screen 4: expo-audio voice recording
│       │   ├── LoadingScreen.tsx      # Screen 5: Multi-step pipeline ticker
│       │   ├── ResponseScreen.tsx     # Screen 6: Persona advisory & model deltas
│       │   ├── MapScreen.tsx          # Screen 7: GPU Heatmap & Radar viewer
│       │   ├── HistoryScreen.tsx      # Screen 8: Past query timeline
│       │   ├── SettingsScreen.tsx     # Screen 9: Persona switch & preferences
│       │   └── OfflineFallbackScreen.tsx # Screen 10: Low-bandwidth SMS preview (≤160 chars)
│       └── voice/
│           └── useRecorder.ts    # Native audio recording hook
└── README.md
```

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` or `/web` | Interactive WeatherGPT Web Application |
| `GET` | `/v1/health` | Health probe & service status |
| `GET` | `/v1/personas` | List 8 supported personas and configurations |
| `POST` | `/v1/query` | Primary conversational query endpoint |
| `POST` | `/v1/query/voice` | Multipart voice upload endpoint (Bhashini ASR $\to$ LLM $\to$ TTS) |
| `POST` | `/v1/tts` | On-demand Text-to-Speech synthesis |
| `GET` | `/v1/maps/config` | Map configuration, default center & styles |
| `GET` | `/v1/maps/temperature-heatmap` | GeoJSON FeatureCollection of station temperatures |
| `GET` | `/v1/maps/rain-radar` | RainViewer Doppler precipitation tile templates |
| `GET` | `/v1/maps/imd-polygons` | Official IMD warning and nowcast polygon geometries |
| `GET` | `/v1/maps/map.html` | Standalone GPU map application inside WebView |
| `GET` | `/v1/warnings/active` | Active severe weather alerts |
| `GET` | `/v1/risk-snapshot` | Export current risk assessment (JSON or CSV) |

---

## 5. Quick Start & Run Guide

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** & npm installed
- *(Optional for mobile)* **Expo Go** app on Android/iOS

---

### Step 1: Start the Backend Server

```powershell
# From the backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Run FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Open **[http://localhost:8000/](http://localhost:8000/)** to access the interactive Web UI.
- Open **[http://localhost:8000/docs](http://localhost:8000/docs)** to access the Swagger API documentation.

---

### Step 2: Run Automated Tests

```powershell
# Run Bhashini Voice, Translation & TTS tests
python -m pytest backend/tests/test_bhashini.py -v

# Run Full WeatherGPT Test Suite (Health, Risk Engine, Consensus, Maps)
python -m pytest backend/tests/test_weathergpt.py -v
```

---

### Step 3: Run the Mobile App (Expo Go)

1. Find your laptop's local Wi-Fi IP address:
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.42)
   ```
2. Update `mobile/app.json`:
   ```json
   "extra": {
     "apiBaseUrl": "http://192.168.1.42:8000",
     "mapboxToken": "pk.your_token_or_leave_blank"
   }
   ```
3. Start Expo:
   ```powershell
   cd mobile
   npm install
   npx expo start
   ```
4. Scan the QR code using the **Expo Go** app on your phone.

---

## 6. Environment Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` to configure live API keys (all optional with built-in fallbacks):

```env
# Google Gemini (Free key: https://aistudio.google.com/app/apikey)
LLM_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# OpenWeather One Call 3.0 (https://home.openweathermap.org/api_keys)
OPENWEATHER_API_KEY=your_key

# Mapbox Access Token (https://account.mapbox.com/access-tokens/)
MAPBOX_ACCESS_TOKEN=pk.your_token

# Bhashini Indic Voice Suite (https://bhashini.gov.in/ulca/user/login)
BHASHINI_USER_ID=your_user_id
BHASHINI_API_KEY=your_api_key
BHASHINI_INFERENCE_API_KEY=your_inference_key

# Supabase PostgreSQL (https://supabase.com/dashboard)
SUPABASE_DB_URL=postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```