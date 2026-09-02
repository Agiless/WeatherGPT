-- WeatherGPT — Supabase Postgres Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- All tables use native Postgres types: UUID, JSONB, TIMESTAMP, REAL

-- ═══════════════════════════════════════════════════════════
-- Tenancy
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name VARCHAR(100),
  tenant_type VARCHAR(50)  -- individual, govt_agency, logistics_company
);

-- ═══════════════════════════════════════════════════════════
-- Personas & User Profiles
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS personas (
  persona_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_type VARCHAR(50) NOT NULL UNIQUE,  -- farmer, fisherman, logistics, etc.
  abstraction_level VARCHAR(20) NOT NULL CHECK (abstraction_level IN ('low', 'medium', 'high')),
  default_language VARCHAR(10) DEFAULT 'en',
  response_format JSONB,  -- config: {"voice_first":true,"max_words":80,...}
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  persona_id UUID REFERENCES personas(persona_id) ON DELETE SET NULL,
  phone_number VARCHAR(15),
  preferred_language VARCHAR(10) DEFAULT 'en',
  home_lat REAL,
  home_lon REAL,
  connectivity_tier VARCHAR(10) DEFAULT 'online',  -- online, low-bandwidth, sms-only
  created_at TIMESTAMP DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- Weather Grid Data (from NWP ingestion)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nwp_grid_data (
  id BIGSERIAL PRIMARY KEY,
  model_source VARCHAR(20),  -- OWM, IMD, ERA5
  lat REAL,
  lon REAL,
  valid_time TIMESTAMP,
  variable_name VARCHAR(50),
  value REAL,
  ingested_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nwp_grid_latlon ON nwp_grid_data(lat, lon);
CREATE INDEX IF NOT EXISTS idx_nwp_grid_time ON nwp_grid_data(valid_time);

-- ═══════════════════════════════════════════════════════════
-- Active Warnings
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS active_warnings (
  warning_id VARCHAR(128) PRIMARY KEY,
  source VARCHAR(20),  -- IMD, OWM
  hazard_type VARCHAR(50),
  severity VARCHAR(20),  -- low, moderate, high, severe
  polygon_geojson JSONB,
  issued_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- Risk Snapshots
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id BIGSERIAL PRIMARY KEY,
  lat REAL,
  lon REAL,
  valid_time TIMESTAMP,
  hazard_type VARCHAR(50),
  model_scores JSONB,  -- {"owm_score":60,"imd_score":64,...}
  consensus_score REAL,
  final_risk_level VARCHAR(20),
  computed_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_latlon ON risk_snapshots(lat, lon);

-- ═══════════════════════════════════════════════════════════
-- Query / Response Logs
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS query_logs (
  log_id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  persona_type VARCHAR(50),
  raw_query TEXT,
  extracted_params JSONB,
  risk_object JSONB,
  final_response TEXT,
  latency_ms INTEGER,
  consensus_score REAL,
  created_at TIMESTAMP DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- IMD Station / District Resolver (seeded from fixture)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS imd_stations (
  station_id VARCHAR(20) PRIMARY KEY,
  station_name VARCHAR(100),
  district_id VARCHAR(20),
  state_name VARCHAR(80),
  lat REAL,
  lon REAL
);

CREATE INDEX IF NOT EXISTS idx_imd_stations_latlon ON imd_stations(lat, lon);

-- ═══════════════════════════════════════════════════════════
-- Temperature Heatmap Points (for Mapbox GL JS)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS heatmap_points (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(20),  -- OWM, IMD, ERA5
  lat REAL,
  lon REAL,
  valid_time TIMESTAMP,
  temperature_c REAL,
  anomaly_c REAL,
  ingested_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_heatmap_latlon ON heatmap_points(lat, lon);

-- ═══════════════════════════════════════════════════════════
-- Rain Radar Frames (tile templates, not pixels)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS radar_frames (
  frame_id VARCHAR(64) PRIMARY KEY,
  source VARCHAR(20),  -- OWM_PRECIP, RAINVIEWER, IMD_DWR
  valid_time TIMESTAMP,
  tile_url_template TEXT,
  ingested_at TIMESTAMP DEFAULT now()
);
