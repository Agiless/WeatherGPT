# WeatherGPT (Griffins) — Implementation, Verification & Video Recording Guide
**Smart India Hackathon 2026 | Theme: Disaster Management | Problem Statement: SIH26068**

---

## 🌟 Executive Summary & Direct Answers to Key Questions

### 1. Does the Multi-Language System Work?
> **YES, 100% Operational.**
- **Supported Languages (9+ Indic Languages)**: Tamil (`ta`), Hindi (`hi`), Telugu (`te`), Kannada (`kn`), Bengali (`bn`), Gujarati (`gu`), Marathi (`mr`), Punjabi (`pa`), Malayalam (`ml`), and English (`en`).
- **How it Works**:
  1. The user selects their language on the Web UI or Mobile App (or speaks in their native tongue).
  2. The **Bhashini Indic Engine** (`backend/app/bhashini/client.py`) performs Neural Machine Translation (NMT) & Automated Speech Recognition (ASR) to convert queries to structured English context for the Risk Calculation Engine.
  3. The Gemini AI advisory engine generates specialized disaster advisories in English.
  4. The response is translated back into the user's native language with natural phrasing and rendered as text and spoken audio via Bhashini Text-to-Speech (TTS).

---

### 2. Does Voice Input Work?
> **YES, fully supported across both Web and Mobile.**
- **Web UI (`http://localhost:8000/`)**:
  - Click the **🎙️ Mic button** next to the prompt input.
  - Browser Web Speech API records your voice in real time with continuous waveform animation.
  - Clicking **Submit** sends the transcribed voice query to `/v1/query`.
  - Backend endpoint `/v1/query/voice` also accepts raw `.wav` / `.mp3` / `.webm` audio uploads and transcribes them using Bhashini ASR.
- **Mobile App (`mobile/src/screens/VoiceInputScreen.tsx`)**:
  - Uses `expo-audio` to record voice directly from the smartphone microphone.
  - Uploads the audio file as multipart `FormData` to `/v1/query/voice`.
  - Returns both translated text and a playable TTS audio URI.

---

### 3. Why Did the Map Show "API Key Required" & Is It Resolved?
> **RESOLVED — NO API KEY IS REQUIRED!**
- **Previous Issue**: Mapbox GL JS v2 required a proprietary, paid account `MAPBOX_ACCESS_TOKEN` (`pk.***`). If left empty, tiles failed to load.
- **Permanent Fix**: We upgraded [`backend/app/maps/map.html`](file:///d:/SIH_20267/WeatherGPT/backend/app/maps/map.html) to **MapLibre GL JS** (open-source GPU engine) powered by:
  - **CARTO Positron & CARTO Dark Matter** open raster basemaps (100% free, zero tokens).
  - **RainViewer Live Doppler Rain Radar API** (100% free global radar satellite composite).
  - **Temperature Heatmaps & IMD Warning Polygons** computed dynamically from GeoJSON.
- **Result**: Maps now load instantly on both the Web UI and React Native WebView without requiring any Mapbox API key.

---

## 🏗️ Implemented Features Matrix

| Module | Component | Description | Status |
| :--- | :--- | :--- | :---: |
| **AI & NLP** | Gemini 2.5 Flash Advisory | Contextual prompt generation with real-time weather & disaster context | ✅ Verified |
| **AI & NLP** | 8 Persona Algorithms | Customized risk calculation for Farmer, Fisherman, Disaster Manager, Commuter, Construction, Event Planner, Tourist, School Admin | ✅ Verified |
| **Indic Voice** | Bhashini ASR | Speech-to-Text for 9+ Indian languages | ✅ Verified |
| **Indic Voice** | Bhashini NMT | Bi-directional translation between English and Indic vernaculars | ✅ Verified |
| **Indic Voice** | Bhashini TTS | High quality Text-to-Speech audio synthesis with playback | ✅ Verified |
| **Maps & GIS** | MapLibre GPU Engine | Vector & raster map canvas with zero API keys required | ✅ Verified |
| **Maps & GIS** | RainViewer Doppler Radar | Animated live rain and thunderstorm radar overlay | ✅ Verified |
| **Maps & GIS** | Dynamic Heatmaps | Temperature gradient and cyclone storm path rendering | ✅ Verified |
| **Maps & GIS** | IMD Warning Polygons | Red/Orange/Yellow district level meteorological hazard overlays | ✅ Verified |
| **Frontend** | Modern Web Glassmorphism UI | Responsive dashboard with language selector, audio player, map split view | ✅ Verified |
| **Mobile** | React Native Expo App | 10 screens (Home, Voice, Personas, Advisory, Alert Banner, Warnings, Map, Offline Fallback, Settings) | ✅ Verified |
| **Resilience** | Offline Fallback Engine | SQLite/local cache storage and rule-based emergency advisories | ✅ Verified |

---

## 🎬 Step-by-Step Video Recording & Presentation Script (3-5 Minutes)

Use this script and sequence to record a video demonstrating the project to SIH judges.

### **Preparation Before Recording**
1. Open a terminal and start the backend:
   ```bash
   python main.py
   ```
2. Open your browser to `http://localhost:8000/`.
3. Open presentation slides: `WeatherGPT_GRIFFINS.pptx`.
4. Open screen recording software (e.g. OBS Studio, Windows Game Bar `Win + G`, or Loom).

---

### **Video Script & Scene Breakdown**

#### **Scene 1: Introduction & Problem Context (0:00 - 0:45)**
* **Visual**: Show Slide 1 & Slide 3 of `WeatherGPT_GRIFFINS.pptx` or the Web Dashboard header (`WeatherGPT: Hyperlocal Indic Disaster Intelligence`).
* **Spoken Pitch**:
  > *"Respected Judges, India experiences diverse and severe extreme weather events, yet standard weather apps deliver generic forecasts that fail rural farmers, coastal fishermen, and disaster managers. WeatherGPT (Team Griffins) bridges this gap with an Indic-first, persona-driven Hyperlocal Weather & Disaster Advisory System powered by Gemini AI and Bhashini."*

---

#### **Scene 2: Multilingual Voice Input & Persona Intelligence (0:45 - 1:45)**
* **Visual**: On the Web Dashboard (`http://localhost:8000/`):
  1. Switch Language dropdown to **Tamil (`தமிழ்`)** or **Hindi (`हिन्दी`)**.
  2. Select the **Farmer (விவசாயி / किसान)** persona chip.
  3. Click the **🎙️ Mic button** and speak (e.g., *"நாளை மழை பெய்யுமா? என் பயிர்களுக்கு பூச்சிக்கொல்லி தெளிக்கலாமா?"* or type it).
  4. Click **Analyze & Generate Advisory**.
* **Demonstration Highlights**:
  - Show the **Gemini AI Advisory** generating customized agricultural advice in Tamil.
  - Click the **🔊 Listen (TTS)** button to show natural voice synthesis speaking out the alert.
  - Show the **Urgency Gauge** (e.g., *Moderate Risk / Safe Window*).

---

#### **Scene 3: Zero-Token MapLibre Radar & Heatmap Engine (1:45 - 2:30)**
* **Visual**: On the right side of the Web Dashboard (or `http://localhost:8000/v1/maps/app`):
  1. Click **🌧️ Rain Radar** to show live animated Doppler rain clouds moving across India.
  2. Click **🌡️ Heatmap** to show temperature gradients.
  3. Click **⚠️ Hazard Polygons** to show IMD active warning zones.
* **Spoken Pitch**:
  > *"Unlike conventional apps requiring expensive proprietary map subscriptions, our GIS pipeline uses MapLibre with open CARTO tiles and real-time RainViewer Doppler satellite radar with zero token requirements, ensuring zero operational cost for municipal deployments."*

---

#### **Scene 4: Multi-Persona Role Differentiation (2:30 - 3:15)**
* **Visual**: Switch personas on the dashboard to show instant contextual recalculation:
  - **Fisherman**: Shows wave height, gust speed, and marine coastal safety advisories.
  - **Disaster Official**: Displays NDMA evacuation protocols, shelter availability, and resource routing.
  - **School Admin**: Shows outdoor activity safety warnings and heatwave index.

---

#### **Scene 5: Mobile App Experience & Offline Resilience (3:15 - 3:45)**
* **Visual**: Show Expo React Native app preview or screen capture of Mobile Screens:
  - Voice Recording screen with haptic audio feedback.
  - Offline Fallback screen showing cached weather parameters when network connectivity drops during cyclones.

---

#### **Scene 6: Conclusion & Impact (3:45 - 4:00)**
* **Spoken Pitch**:
  > *"WeatherGPT combines high-precision AI risk modeling with native Indian voice accessibility, saving lives and livelihoods before disasters strike. Thank you!"*

---

## 🛠️ Testing & Verification Checklist

### 1. Test Backend Endpoints
Run these curl commands to verify backend responses:
```bash
# Health check
curl http://localhost:8000/health

# Multilingual Farmer Query in Hindi
curl -X POST http://localhost:8000/v1/query \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"क्या कल भारी बारिश होगी?\", \"persona\": \"farmer\", \"language\": \"hi\", \"location\": \"Pune\"}"

# Mapbox/MapLibre Style Config
curl http://localhost:8000/v1/maps/config
```

### 2. Verify Map Direct URL
Open `http://localhost:8000/v1/maps/app` in any browser. The interactive map should load smoothly without any console errors or missing token popups.

---
*Created for Team Griffins | SIH 2026 Submission*
