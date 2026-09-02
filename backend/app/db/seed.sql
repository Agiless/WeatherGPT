-- WeatherGPT — Seed Data
-- Run this AFTER schema.sql in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- Seed Personas (8 types from Section 3.2)
-- ═══════════════════════════════════════════════════════════

INSERT INTO personas (persona_type, abstraction_level, default_language, response_format) VALUES
(
  'farmer', 'low', 'en',
  '{
    "max_words": 60,
    "units": "simple",
    "show_probability_numbers": false,
    "show_map": false,
    "voice_default": true,
    "fields_included": ["advisory_text", "action_recommendation", "next_48h_summary"]
  }'::jsonb
),
(
  'fisherman', 'low', 'en',
  '{
    "max_words": 60,
    "units": "simple",
    "show_probability_numbers": false,
    "show_map": false,
    "voice_default": true,
    "sms_fallback": true,
    "fields_included": ["advisory_text", "action_recommendation", "wind_wave_plain"]
  }'::jsonb
),
(
  'logistics', 'medium', 'en',
  '{
    "max_words": 180,
    "units": "mixed",
    "show_probability_numbers": true,
    "show_map": true,
    "map_layers_default": ["rain_radar", "route_hazards"],
    "voice_default": false,
    "fields_included": ["route_hazard_forecast", "eta_impact_summary", "daywise_cards"]
  }'::jsonb
),
(
  'traveller', 'medium', 'en',
  '{
    "max_words": 180,
    "units": "mixed",
    "show_probability_numbers": true,
    "show_map": true,
    "map_layers_default": ["temp_heatmap"],
    "voice_default": false,
    "fields_included": ["daywise_forecast", "packing_advisory", "travel_advisory"]
  }'::jsonb
),
(
  'generic', 'medium', 'en',
  '{
    "max_words": 200,
    "units": "mixed",
    "show_probability_numbers": true,
    "show_map": true,
    "map_layers_default": ["temp_heatmap", "rain_radar"],
    "voice_default": false,
    "fields_included": ["conversational_forecast", "next_48h_summary"]
  }'::jsonb
),
(
  'researcher_scientist', 'high', 'en',
  '{
    "max_words": 500,
    "units": "technical",
    "show_probability_numbers": true,
    "show_map": true,
    "show_model_deltas": true,
    "map_layers_default": ["temp_heatmap", "rain_radar", "alert_polygons", "era5_anomaly"],
    "voice_default": false,
    "fields_included": ["raw_model_outputs", "consensus_score", "historical_trend", "confidence_interval", "downloadable_csv_link"]
  }'::jsonb
),
(
  'disaster_manager_govt', 'high', 'en',
  '{
    "max_words": 300,
    "units": "technical",
    "show_probability_numbers": true,
    "show_map": true,
    "show_alert_polygons": true,
    "map_layers_default": ["rain_radar", "alert_polygons", "cyclone_track"],
    "voice_default": false,
    "fields_included": ["risk_matrix", "consensus_score", "affected_population_estimate", "escalation_recommendation"]
  }'::jsonb
),
(
  'aviation', 'high', 'en',
  '{
    "max_words": 250,
    "units": "technical",
    "show_probability_numbers": true,
    "show_map": true,
    "map_layers_default": ["rain_radar", "temp_heatmap"],
    "voice_default": false,
    "fields_included": ["metar_taf_briefing", "consensus_score", "hazard_windows"]
  }'::jsonb
)
ON CONFLICT (persona_type) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- Seed IMD Stations (major cities for prototype demo)
-- ═══════════════════════════════════════════════════════════

INSERT INTO imd_stations (station_id, station_name, district_id, state_name, lat, lon) VALUES
-- Tamil Nadu
('43279', 'Chennai', 'TN001', 'Tamil Nadu', 13.0827, 80.2707),
('43283', 'Madurai', 'TN010', 'Tamil Nadu', 9.9252, 78.1198),
('43285', 'Coimbatore', 'TN004', 'Tamil Nadu', 11.0168, 76.9558),
('43287', 'Tiruchirappalli', 'TN013', 'Tamil Nadu', 10.7905, 78.7047),
-- Karnataka
('43295', 'Bengaluru', 'KA001', 'Karnataka', 12.9716, 77.5946),
('43296', 'Mangaluru', 'KA010', 'Karnataka', 12.9141, 74.8560),
-- Kerala
('43353', 'Thiruvananthapuram', 'KL001', 'Kerala', 8.5241, 76.9366),
('43354', 'Kochi', 'KL007', 'Kerala', 9.9312, 76.2673),
-- Andhra Pradesh / Telangana
('43128', 'Hyderabad', 'TS001', 'Telangana', 17.3850, 78.4867),
('43189', 'Visakhapatnam', 'AP001', 'Andhra Pradesh', 17.6868, 83.2185),
-- Maharashtra
('43003', 'Mumbai', 'MH001', 'Maharashtra', 19.0760, 72.8777),
('43014', 'Pune', 'MH025', 'Maharashtra', 18.5204, 73.8567),
('43015', 'Nagpur', 'MH019', 'Maharashtra', 21.1458, 79.0882),
-- Delhi NCR
('42182', 'New Delhi', 'DL001', 'Delhi', 28.6139, 77.2090),
('42189', 'Delhi Safdarjung', 'DL001', 'Delhi', 28.5849, 77.2068),
-- Uttar Pradesh
('42260', 'Lucknow', 'UP041', 'Uttar Pradesh', 26.8467, 80.9462),
('42369', 'Varanasi', 'UP076', 'Uttar Pradesh', 25.3176, 82.9739),
-- Rajasthan
('42348', 'Jaipur', 'RJ014', 'Rajasthan', 26.9124, 75.7873),
('42339', 'Jodhpur', 'RJ015', 'Rajasthan', 26.2389, 73.0243),
-- Gujarat
('42647', 'Ahmedabad', 'GJ001', 'Gujarat', 23.0225, 72.5714),
-- Madhya Pradesh
('42667', 'Bhopal', 'MP006', 'Madhya Pradesh', 23.2599, 77.4126),
-- West Bengal
('42809', 'Kolkata', 'WB011', 'West Bengal', 22.5726, 88.3639),
-- Odisha
('42971', 'Bhubaneswar', 'OR019', 'Odisha', 20.2961, 85.8245),
-- Bihar
('42492', 'Patna', 'BR028', 'Bihar', 25.6093, 85.1376),
-- Assam
('42410', 'Guwahati', 'AS014', 'Assam', 26.1445, 91.7362),
-- Punjab
('42101', 'Chandigarh', 'CH001', 'Chandigarh', 30.7333, 76.7794),
-- Jharkhand
('42701', 'Ranchi', 'JH017', 'Jharkhand', 23.3441, 85.3096),
-- Goa
('43192', 'Panaji', 'GA001', 'Goa', 15.4909, 73.8278),
-- Chhattisgarh
('42865', 'Raipur', 'CG016', 'Chhattisgarh', 21.2514, 81.6296),
-- Coastal / Fisherman-relevant
('43185', 'Machilipatnam', 'AP010', 'Andhra Pradesh', 16.1875, 81.1389),
('43150', 'Kakinada', 'AP006', 'Andhra Pradesh', 16.9891, 82.2475),
('43346', 'Tuticorin', 'TN014', 'Tamil Nadu', 8.7642, 78.1348),
('43347', 'Rameswaram', 'TN012', 'Tamil Nadu', 9.2876, 79.3129)
ON CONFLICT (station_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Demo tenant + user profile (single demo user)
-- ═══════════════════════════════════════════════════════════

INSERT INTO tenants (tenant_id, tenant_name, tenant_type) VALUES
('00000000-0000-0000-0000-000000000001', 'Demo User', 'individual')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO user_profiles (user_id, tenant_id, persona_id, preferred_language, home_lat, home_lon, connectivity_tier) VALUES
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  (SELECT persona_id FROM personas WHERE persona_type = 'generic' LIMIT 1),
  'en',
  13.0827,  -- Chennai default
  80.2707,
  'online'
)
ON CONFLICT (user_id) DO NOTHING;
