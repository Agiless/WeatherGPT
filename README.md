# WeatherGPT

**AI Conversational Weather Intelligence Platform**  
*Persona-based response abstraction · Weather Risk Engine · Multi-model consensus scoring · Mapbox GL JS temperature heatmap & rain radar*

---

## 1. System Overview & Architecture

WeatherGPT delivers personalized, actionable weather intelligence tailored to the specific operational needs of farmers, coastal fishermen, logistics planners, travellers, disaster managers, researchers, and aviation briefers.

The prototype runtime operates as **two lightweight processes on one local Wi-Fi network**, connecting to Supabase cloud Postgres and live weather data sources:

```
[ Android Phone (Expo Go) ]
         │  http://<laptop-LAN-IP>:8000/v1/...
         ▼
[ Laptop FastAPI Backend ] ────────► [ Supabase Postgres (Cloud) ]
   uvicorn 0.0.0.0:8000                 - Personas & Configs
   ├── LLM Layer 1 (Extract)            - Station Directory (Haversine)
   ├── Data Orchestrator                - Risk Snapshots & Logs
   │    ├── OpenWeather One Call 3.0    - Active Warnings
   │    ├── IMD (api.imd.gov.in)
   │    └── ERA5 Reanalysis Fixtures
   ├── Weather Risk Engine (Scoring & Consensus)
   └── LLM Layer 2 (Persona Shaping)
         │
         ▼
[ Screen 7: Mapbox GL JS in WebView ]
   - Temperature Heatmap (-5°C to 45°C)
   - Rain Radar Mosaic + Official IMD Polygons
```

---

## 2. End-to-End Workflow

1. **Input Capture:** User enters a natural language query or records voice (`expo-av`) on the mobile app.
2. **Intent & Parameter Extraction (LLM Layer 1):** Extracts structured parameters (`persona_type`, `location`, `time_window`, `hazard_type`, `query_intent`) validated against strict Pydantic schemas.
3. **Data Orchestration:** Dispatches parallel asynchronous requests to:
   - **OpenWeather One Call 3.0:** Global fast-path current, hourly, and 8-day forecasts.
   - **IMD Gateway:** Official India observations, district nowcasts, and severe weather warnings.
   - **ERA5 / Copernicus:** Climatology baseline and anomaly trends.
4. **Weather Risk Engine:**
   - Normalizes units (m/s $\to$ km/h, mm accumulation).
   - Computes 0–100 standardized hazard scores for Rainfall, Wind, and Temperature.
   - Calculates the **Inter-Model Consensus Score**:
     $$\text{consensus\_score} = 100 - \left(\frac{\text{std\_dev}(\text{scores})}{\text{max\_possible\_std\_dev}}\right) \times 100$$
   - Enforces the **Authoritative Override Rule**: inside India, active Orange/Red IMD warnings elevate risk level to at least `high`.
5. **Decision / Response Generation (LLM Layer 2):** Injects calculated numbers into a persona-specific prompt. The LLM is strictly constrained to use only figures present in the risk object.
6. **Mobile Rendering:** Expo Go renders persona-appropriate UI (simplified for farmers, daywise cards for travellers, model deltas and consensus gauges for researchers). Screen 7 embeds Mapbox GL JS inside a `WebView` for GPU-accelerated heatmaps and radar sweeps.

---

## 3. Project Structure

```
WeatherGPT/
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI routers
│   │   │   ├── health.py         # GET /v1/health probe
│   │   │   ├── personas.py       # GET /v1/personas
│   │   │   ├── profile.py        # GET/PUT /v1/profile
│   │   │   ├── query.py          # POST /v1/query & /v1/query/voice
│   │   │   ├── maps.py           # /v1/maps (config, heatmap, radar, html)
│   │   │   ├── warnings.py       # GET /v1/warnings/active
│   │   │   └── risk_snapshot.py  # GET /v1/risk-snapshot & CSV export
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
│   │   │   └── map.html          # Standalone Mapbox GL JS map application
│   │   ├── risk_engine/
│   │   │   ├── thresholds.py     # Meteorological thresholds
│   │   │   ├── scoring.py        # 0-100 hazard risk scoring
│   │   │   ├── consensus.py      # Model consensus algorithm
│   │   │   └── engine.py         # Risk Engine orchestrator
│   │   ├── schemas/              # Pydantic data contracts
│   │   │   ├── query.py
│   │   │   ├── persona.py
│   │   │   ├── risk.py
│   │   │   ├── maps.py
│   │   │   └── profile.py
│   │   ├── sources/              # Weather data integrations
│   │   │   ├── orchestrator.py   # Parallel async fan-out & merge
│   │   │   ├── openweather.py    # One Call 3.0 API wrapper
│   │   │   ├── imd.py            # IMD client & Haversine resolver
│   │   │   └── era5.py           # ERA5 climatology loader
│   │   └── main.py               # FastAPI application entry point
│   ├── fixtures/                 # Pre-computed fixtures & fallback packs
│   │   ├── demo_pack/
│   │   │   └── demo_risk_pack.json
│   │   └── demo_risk_objects/
│   │       └── chennai_generic.json
│   ├── tests/
│   │   └── test_weathergpt.py    # Automated pytest test suite
│   ├── requirements.txt
│   └── .env.example
├── mobile/                       # Expo managed React Native app
│   ├── app.json                  # Expo config (extra.apiBaseUrl, extra.mapboxToken)
│   ├── App.tsx                   # Main entry point with AppNavigator
│   ├── package.json
│   └── src/
│       ├── api/
│       │   └── client.ts         # LAN fetch wrapper
│       ├── maps/
│       │   └── WebViewMap.tsx    # Mapbox GL JS WebView container
│       ├── navigation/
│       │   └── AppNavigator.tsx  # Stack navigator (Dark theme)
│       ├── screens/
│       │   ├── SplashScreen.tsx       # Screen 1: Animated launch & health ping
│       │   ├── OnboardingScreen.tsx   # Screen 2: 3-step persona & location setup
│       │   ├── HomeScreen.tsx         # Screen 3: Persona-aware query dashboard
│       │   ├── VoiceInputScreen.tsx   # Screen 4: expo-av audio recording
│       │   ├── LoadingScreen.tsx      # Screen 5: Multi-step pipeline ticker
│       │   ├── ResponseScreen.tsx     # Screen 6: Persona advisory & model deltas
│       │   ├── MapScreen.tsx          # Screen 7: Mapbox Heatmap & Radar viewer
│       │   ├── HistoryScreen.tsx      # Screen 8: Past query timeline
│       │   ├── SettingsScreen.tsx     # Screen 9: Persona switch & preferences
│       │   └── OfflineFallbackScreen.tsx # Screen 10: SMS preview (≤160 chars)
│       └── voice/
│           └── useRecorder.ts    # Audio recording hook
└── README.md
```

---

## 4. Quick Start & Run Commands

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** & npm installed
- **Expo Go** app installed on your Android device (from Google Play Store)
- Phone and laptop connected to the **same Wi-Fi network**

---

### Step 1: Backend Setup & Configuration

1. **Activate Virtual Environment & Install Dependencies:**
   ```powershell
   # From project root
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r backend\requirements.txt
   ```

2. **Configure Environment Secrets:**
   Copy `backend/.env.example` to `backend/.env` and provide your credentials:
   ```env
   # Supabase Postgres (Transaction pooler connection string)
   SUPABASE_DB_URL=postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

   # Weather APIs
   OPENWEATHER_API_KEY=your_openweather_key
   MAPBOX_ACCESS_TOKEN=pk.your_mapbox_public_token
   IMD_API_BASE=https://api.imd.gov.in/api/v1
   RAINVIEWER_ENABLED=true
   USE_FIXTURE_WEATHER=false

   # LLM Provider (OpenAI or Gemini)
   LLM_API_KEY=your_llm_api_key
   ```
   *(Note: The system automatically falls back to offline fixtures and regional baselines if external keys are not yet provided).*

3. **Database Schema (Supabase):**
   In your Supabase project's **SQL Editor**, execute:
   - [`backend/app/db/schema.sql`](backend/app/db/schema.sql) (Creates tables)
   - [`backend/app/db/seed.sql`](backend/app/db/seed.sql) (Seeds 8 personas and 32 IMD weather stations)

---

### Step 2: Mobile App Configuration

1. **Find your laptop's Wi-Fi IP address:**
   ```powershell
   ipconfig
   # Look for "IPv4 Address", e.g., 192.168.1.42
   ```

2. **Update `mobile/app.json`:**
   Set `extra.apiBaseUrl` to your laptop IP and port 8000:
   ```json
   "extra": {
     "apiBaseUrl": "http://192.168.1.42:8000",
     "mapboxToken": "pk.your_mapbox_public_token"
   }
   ```

---

### Step 3: Run the Application

Open **two terminal windows**:

#### Terminal 1 — Start FastAPI Backend (Laptop)
```powershell
cd c:\projects\WeatherGPT\backend
python main.py
# or: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
> **Important:** `--host 0.0.0.0` is configured so your mobile device on the local network can communicate with the backend. Ensure Windows Firewall allows inbound TCP traffic on port 8000.

#### Terminal 2 — Start Expo Go (Mobile)
```powershell
cd c:\projects\WeatherGPT\mobile
npx expo start
```
- A QR code will display in the terminal.
- Open **Expo Go** on your Android phone and scan the QR code.

---

## 5. Verification & Testing

### Run Backend Unit & Integration Tests
```powershell
cd c:\projects\WeatherGPT\backend
..\.venv\Scripts\python.exe -m pytest tests\test_weathergpt.py -v
```
All 6 test suites verify health, personas, hazard scoring, consensus calculations, query flows, and map endpoints.

### Run Mobile TypeScript Check
```powershell
cd c:\projects\WeatherGPT\mobile
npx tsc --noEmit
```
Confirms clean TypeScript compilation across all 10 screens and components.

---

## 6. Demo Walkthrough Flow

1. **Launch Screen (Screen 1):** App launches, pings `http://<laptop-ip>:8000/v1/health`, and displays green "API Connected" badge.
2. **Onboarding (Screen 2):** Select language $\to$ Choose **Farmer** persona $\to$ Pin location (e.g., Madurai).
3. **Home & Query (Screen 3):** Tap the **Rain** chip or use the voice button $\to$ backend executes Layer 1 intent extraction, fetches live OpenWeather + IMD data, and computes consensus.
4. **Advisory Report (Screen 6):** Displays practical agricultural advice, simplified confidence badge, and Text-to-Speech audio playback (`expo-speech`).
5. **Interactive Map (Screen 7):** Tap the map icon in the header:
   - **Heatmap Mode:** View the temperature field with zoom station circles and tap-to-inspect metrics.
   - **Rain Radar Mode:** View precipitation raster overlay with official IMD warning vectors.
6. **Switch Persona (Screen 9):** Open Settings $\to$ Switch to **Researcher** $\to$ re-run query to inspect quantitative model deltas (OpenWeather vs. IMD vs. ERA5) and numerical consensus scores (e.g., 91.5%).
7. **Offline Preview (Screen 10):** Inspect the condensed $\le 160$-character SMS advisory designed for low-bandwidth rural operations.