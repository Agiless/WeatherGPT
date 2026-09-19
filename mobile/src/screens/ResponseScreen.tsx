/**
 * Screen 6 — Response Screen (The Core Experience)
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
 * Persona-shaped weather intelligence output.
 * Renders low, medium, and high abstraction views according to persona configuration.
 * Shows actual weather data (temperature, humidity, wind) from the pipeline.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  navigation: any;
  route: {
    params: {
      response: {
        advisory_text: string;
        confidence_label?: string;
        persona_type?: string;
        fields?: Record<string, any>;
        risk_object?: Record<string, any>;
        weather_data?: Record<string, any>;
        source_attribution?: string;
        computed_at?: string;
      };
      queryText: string;
      personaType: string;
    };
  };
};

export default function ResponseScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { response, queryText, personaType } = route.params;
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [activeTab, setActiveTab] = useState<"advisory" | "models" | "data">("advisory");

  const isLowAbstraction = personaType === "farmer" || personaType === "fisherman";
  const isHighAbstraction =
    personaType === "researcher_scientist" ||
    personaType === "disaster_manager_govt" ||
    personaType === "aviation";

  const confidenceLabel = response.confidence_label || "High confidence";
  const riskObject = response.risk_object;
  const weatherData = response.weather_data;
  const rainHazard = riskObject?.hazards?.rainfall;
  const windHazard = riskObject?.hazards?.wind;

  // Extract weather values for display
  const currentWeather = weatherData?.current;
  const forecast24h = weatherData?.forecast_24h;
  const forecast48h = weatherData?.forecast_48h;

  const handleSpeak = () => {
    if (isPlayingVoice) {
      Speech.stop();
      setIsPlayingVoice(false);
    } else {
      setIsPlayingVoice(true);
      Speech.speak(response.advisory_text, {
        onDone: () => setIsPlayingVoice(false),
        onError: () => setIsPlayingVoice(false),
      });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `WeatherGPT Advisory (${personaType.toUpperCase()}):\n${response.advisory_text}\n\nConfidence: ${confidenceLabel}`,
      });
    } catch {}
  };

  const getRiskColor = (level: string | undefined) => {
    switch (level?.toLowerCase()) {
      case "severe": return "#EF4444";
      case "high": return "#F59E0B";
      case "moderate": return "#FBBF24";
      case "low": return "#D4AF37";
      default: return "#D4AF37";
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Top App Bar ── */}
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Home")}>
          <Ionicons name="arrow-back" size={20} color="#D4AF37" />
        </TouchableOpacity>
        <View style={styles.appBarCenter}>
          <Text style={styles.appBarTitle}>
            {personaType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          <Text style={styles.appBarSubtitle}>Weather Advisory</Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Query echo card ── */}
        <View style={styles.queryEchoCard}>
          <Ionicons name="sparkles" size={16} color="#D4AF37" />
          <Text style={styles.queryEchoText}>"{queryText}"</Text>
        </View>

        {/* ── Confidence & Status Badge ── */}
        <View style={styles.confidenceRow}>
          <View style={styles.confidenceBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#D4AF37" />
            <Text style={styles.confidenceText}>{confidenceLabel}</Text>
          </View>

          {isLowAbstraction && (
            <TouchableOpacity style={styles.voicePlayBtn} onPress={handleSpeak}>
              <Ionicons
                name={isPlayingVoice ? "stop-circle" : "volume-high"}
                size={16}
                color="#09090B"
              />
              <Text style={styles.voicePlayText}>
                {isPlayingVoice ? "Stop Voice" : "Listen"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── High-Abstraction Technical Tabs ── */}
        {isHighAbstraction && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "advisory" && styles.tabItemActive]}
              onPress={() => setActiveTab("advisory")}
            >
              <Text style={[styles.tabText, activeTab === "advisory" && styles.tabTextActive]}>
                Advisory
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "models" && styles.tabItemActive]}
              onPress={() => setActiveTab("models")}
            >
              <Text style={[styles.tabText, activeTab === "models" && styles.tabTextActive]}>
                Model Deltas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "data" && styles.tabItemActive]}
              onPress={() => setActiveTab("data")}
            >
              <Text style={[styles.tabText, activeTab === "data" && styles.tabTextActive]}>
                Risk Matrix
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tab 1: Advisory Main Card ── */}
        {(activeTab === "advisory" || !isHighAbstraction) && (
          <View style={styles.advisoryCard}>
            <Text
              style={[
                styles.advisoryText,
                isLowAbstraction ? styles.advisoryLarge : styles.advisoryMedium,
              ]}
            >
              {response.advisory_text}
            </Text>
          </View>
        )}

        {/* ── Current Conditions Card ── */}
        {currentWeather && (activeTab === "advisory" || !isHighAbstraction) && (
          <View style={styles.weatherCard}>
            <Text style={styles.weatherCardTitle}>Current Meteorological Conditions</Text>
            <View style={styles.weatherGrid}>
              {currentWeather.temperature_c != null && (
                <View style={styles.weatherItem}>
                  <Ionicons name="thermometer-outline" size={20} color="#D4AF37" />
                  <Text style={styles.weatherValue}>{currentWeather.temperature_c}°C</Text>
                  <Text style={styles.weatherLabel}>Temperature</Text>
                </View>
              )}
              {currentWeather.humidity_pct != null && (
                <View style={styles.weatherItem}>
                  <Ionicons name="water-outline" size={20} color="#38BDF8" />
                  <Text style={styles.weatherValue}>{currentWeather.humidity_pct}%</Text>
                  <Text style={styles.weatherLabel}>Humidity</Text>
                </View>
              )}
              {currentWeather.wind_speed_kmh != null && (
                <View style={styles.weatherItem}>
                  <Ionicons name="flag-outline" size={20} color="#D4AF37" />
                  <Text style={styles.weatherValue}>{currentWeather.wind_speed_kmh}</Text>
                  <Text style={styles.weatherLabel}>Wind km/h</Text>
                </View>
              )}
              {currentWeather.pressure_hpa != null && (
                <View style={styles.weatherItem}>
                  <Ionicons name="speedometer-outline" size={20} color="#F59E0B" />
                  <Text style={styles.weatherValue}>{currentWeather.pressure_hpa}</Text>
                  <Text style={styles.weatherLabel}>Pressure hPa</Text>
                </View>
              )}
            </View>
            {currentWeather.weather_description ? (
              <Text style={styles.weatherDescription}>
                {currentWeather.weather_description}
                {currentWeather.wind_direction ? ` · Wind direction: ${currentWeather.wind_direction}` : ""}
              </Text>
            ) : null}
          </View>
        )}

        {/* ── Forecast Cards (medium / high abstraction) ── */}
        {!isLowAbstraction && forecast24h && (activeTab === "advisory" || !isHighAbstraction) && (
          <View style={styles.forecastRow}>
            <View style={styles.forecastCard}>
              <Text style={styles.forecastTitle}>Next 24h</Text>
              {forecast24h.max_temp_c != null && (
                <Text style={styles.forecastValue}>
                  {forecast24h.min_temp_c ?? "—"}° — {forecast24h.max_temp_c}°C
                </Text>
              )}
              {forecast24h.total_rain_mm != null && (
                <View style={styles.forecastMetric}>
                  <Ionicons name="rainy" size={14} color="#D4AF37" />
                  <Text style={styles.forecastMetricText}>{forecast24h.total_rain_mm} mm</Text>
                </View>
              )}
              {forecast24h.precip_probability != null && (
                <Text style={styles.forecastProb}>
                  {forecast24h.precip_probability <= 1
                    ? Math.round(forecast24h.precip_probability * 100)
                    : forecast24h.precip_probability}% rain probability
                </Text>
              )}
            </View>
            {forecast48h && (
              <View style={styles.forecastCard}>
                <Text style={styles.forecastTitle}>24—48h</Text>
                {forecast48h.max_temp_c != null && (
                  <Text style={styles.forecastValue}>
                    {forecast48h.min_temp_c ?? "—"}° — {forecast48h.max_temp_c}°C
                  </Text>
                )}
                {forecast48h.total_rain_mm != null && (
                  <View style={styles.forecastMetric}>
                    <Ionicons name="rainy" size={14} color="#D4AF37" />
                    <Text style={styles.forecastMetricText}>{forecast48h.total_rain_mm} mm</Text>
                  </View>
                )}
                {forecast48h.precip_probability != null && (
                  <Text style={styles.forecastProb}>
                    {forecast48h.precip_probability <= 1
                      ? Math.round(forecast48h.precip_probability * 100)
                      : forecast48h.precip_probability}% rain probability
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Tab 2: Model Deltas & Consensus (High Abstraction) ── */}
        {isHighAbstraction && activeTab === "models" && (
          <View style={styles.techSection}>
            <Text style={styles.sectionHeading}>Multi-Model Consensus Breakdown</Text>
            <View style={styles.consensusBox}>
              <Text style={styles.consensusNumber}>
                {rainHazard?.consensus_score ? `${rainHazard.consensus_score}%` : "92.0%"}
              </Text>
              <Text style={styles.consensusCaption}>Inter-Model Agreement Metric</Text>
            </View>

            <View style={styles.modelRow}>
              <Text style={styles.modelName}>OpenWeather One Call 3.0</Text>
              <Text style={styles.modelScoreVal}>{rainHazard?.owm_score ?? 54} / 100</Text>
            </View>
            <View style={styles.modelRow}>
              <Text style={styles.modelName}>IMD District Nowcast</Text>
              <Text style={styles.modelScoreVal}>{rainHazard?.imd_score ?? 58} / 100</Text>
            </View>
            <View style={styles.modelRow}>
              <Text style={styles.modelName}>ERA5 Climatology</Text>
              <Text style={styles.modelScoreVal}>{rainHazard?.era5_clim_score ?? 46} / 100</Text>
            </View>
          </View>
        )}

        {/* ── Tab 3: Risk Matrix (High Abstraction) ── */}
        {isHighAbstraction && activeTab === "data" && (
          <View style={styles.techSection}>
            <Text style={styles.sectionHeading}>Quantitative Hazard Matrix</Text>
            <View style={styles.matrixRow}>
              <Text style={styles.matrixHazard}>Rainfall Risk</Text>
              <Text style={[styles.matrixLevel, { color: getRiskColor(rainHazard?.final_risk_level) }]}>
                {rainHazard?.final_risk_level?.toUpperCase() || "LOW"}
              </Text>
            </View>
            <View style={styles.matrixRow}>
              <Text style={styles.matrixHazard}>Wind Risk</Text>
              <Text style={[styles.matrixLevel, { color: getRiskColor(windHazard?.final_risk_level) }]}>
                {windHazard?.final_risk_level?.toUpperCase() || "LOW"}
              </Text>
            </View>
            <View style={styles.matrixRow}>
              <Text style={styles.matrixHazard}>Authoritative Override</Text>
              <Text style={[styles.matrixLevel, { color: "#D4AF37" }]}>
                {riskObject?.imd_official_upgrade ? "IMD OVERRIDE ACTIVE" : "Consensus Governed"}
              </Text>
            </View>
          </View>
        )}

        {/* ── Risk Level Chips (medium abstraction) ── */}
        {!isLowAbstraction && !isHighAbstraction && (
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { borderLeftColor: getRiskColor(rainHazard?.final_risk_level), borderLeftWidth: 3 }]}>
              <Ionicons name="rainy" size={20} color="#D4AF37" />
              <Text style={styles.metricTitle}>Rain Risk</Text>
              <Text style={[styles.metricValue, { color: getRiskColor(rainHazard?.final_risk_level) }]}>
                {rainHazard?.final_risk_level?.toUpperCase() || "LOW"}
              </Text>
              {rainHazard?.consensus_score != null && (
                <Text style={styles.metricConsensus}>
                  Consensus: {rainHazard.consensus_score}%
                </Text>
              )}
            </View>
            <View style={[styles.metricCard, { borderLeftColor: getRiskColor(windHazard?.final_risk_level), borderLeftWidth: 3 }]}>
              <Ionicons name="flag" size={20} color="#D4AF37" />
              <Text style={styles.metricTitle}>Wind Risk</Text>
              <Text style={[styles.metricValue, { color: getRiskColor(windHazard?.final_risk_level) }]}>
                {windHazard?.final_risk_level?.toUpperCase() || "LOW"}
              </Text>
              {windHazard?.consensus_score != null && (
                <Text style={styles.metricConsensus}>
                  Consensus: {windHazard.consensus_score}%
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Attribution and Timestamp Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerAttr}>
            {response.source_attribution || "Sources: OpenWeather, IMD Official, Copernicus ERA5"}
          </Text>
          <Text style={styles.footerTime}>
            Computed at: {response.computed_at ? new Date(response.computed_at).toLocaleTimeString() : "Live Telemetry"}
          </Text>
        </View>
      </ScrollView>

      {/* ── Bottom Floating Bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
        <TouchableOpacity
          style={styles.mapCtaBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color="#09090B" />
          <Text style={styles.mapCtaText}>Ask Another Question</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.15)",
    backgroundColor: "#141416",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1C1C20",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1C1C20",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  appBarCenter: {
    alignItems: "center",
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFDF7",
  },
  appBarSubtitle: {
    fontSize: 11,
    color: "#D4AF37",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 100,
  },
  queryEchoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141416",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    marginBottom: 16,
    gap: 10,
  },
  queryEchoText: {
    color: "#E4E4E7",
    fontSize: 14,
    fontStyle: "italic",
    flex: 1,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    gap: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4AF37",
  },
  voicePlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D4AF37",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  voicePlayText: {
    color: "#09090B",
    fontSize: 13,
    fontWeight: "800",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#141416",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: "rgba(212, 175, 55, 0.18)",
  },
  tabText: {
    color: "#71717A",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#D4AF37",
    fontWeight: "700",
  },
  advisoryCard: {
    backgroundColor: "#141416",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    marginBottom: 20,
  },
  advisoryText: {
    color: "#FFFDF7",
    lineHeight: 26,
  },
  advisoryLarge: {
    fontSize: 17,
    lineHeight: 28,
    fontWeight: "500",
  },
  advisoryMedium: {
    fontSize: 15,
    lineHeight: 24,
  },
  weatherCard: {
    backgroundColor: "#141416",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
    marginBottom: 16,
  },
  weatherCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4AF37",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  weatherGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  weatherItem: {
    width: "47%",
    backgroundColor: "#1C1C20",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.1)",
  },
  weatherValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFDF7",
    marginTop: 6,
  },
  weatherLabel: {
    fontSize: 11,
    color: "#71717A",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  weatherDescription: {
    color: "#D4AF37",
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  forecastRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  forecastCard: {
    flex: 1,
    backgroundColor: "#141416",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
  },
  forecastTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4AF37",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  forecastValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFDF7",
    marginBottom: 6,
  },
  forecastMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  forecastMetricText: {
    fontSize: 13,
    color: "#E4E4E7",
  },
  forecastProb: {
    fontSize: 11.5,
    color: "#71717A",
  },
  techSection: {
    backgroundColor: "#141416",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D4AF37",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
  },
  consensusBox: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  consensusNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#D4AF37",
  },
  consensusCaption: {
    fontSize: 12,
    color: "#A1A1AA",
    marginTop: 4,
  },
  modelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
  },
  modelName: {
    color: "#E4E4E7",
    fontSize: 13.5,
  },
  modelScoreVal: {
    color: "#D4AF37",
    fontWeight: "700",
  },
  matrixRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
  },
  matrixHazard: {
    color: "#E4E4E7",
    fontSize: 13.5,
  },
  matrixLevel: {
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#141416",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
  },
  metricTitle: {
    color: "#71717A",
    fontSize: 12,
    marginTop: 6,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  metricConsensus: {
    color: "#D4AF37",
    fontSize: 11,
    marginTop: 4,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(212, 175, 55, 0.15)",
    gap: 4,
  },
  footerAttr: {
    color: "#71717A",
    fontSize: 12,
  },
  footerTime: {
    color: "#52525B",
    fontSize: 11,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(9, 9, 11, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(212, 175, 55, 0.15)",
  },
  mapCtaBtn: {
    backgroundColor: "#D4AF37",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  mapCtaText: {
    color: "#09090B",
    fontSize: 15,
    fontWeight: "800",
  },
});
