/**
 * Screen 7 — Map & Warnings Screen (Mapbox GL JS WebView)
 * Displays:
 * 1. Mode Switcher: Temperature Heatmap vs Rain Radar
 * 2. Vector IMD Warning overlays & active warnings strip
 * 3. Point inspection card when station is tapped
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebViewMap from "../maps/WebViewMap";

type Props = {
  navigation: any;
  route?: {
    params?: {
      initialMode?: "temp" | "radar";
    };
  };
};

export default function MapScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"temp" | "radar">(
    route?.params?.initialMode || "temp"
  );
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  return (
    <View style={styles.container}>
      {/* ── Header with Mode Switcher ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === "temp" && styles.segmentBtnActive]}
            onPress={() => {
              setSelectedPoint(null);
              setMode("temp");
            }}
          >
            <Ionicons
              name="thermometer"
              size={14}
              color={mode === "temp" ? "#0F172A" : "#94A3B8"}
            />
            <Text
              style={[styles.segmentText, mode === "temp" && styles.segmentTextActive]}
            >
              Heatmap
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mode === "radar" && styles.segmentBtnActive]}
            onPress={() => {
              setSelectedPoint(null);
              setMode("radar");
            }}
          >
            <Ionicons
              name="rainy"
              size={14}
              color={mode === "radar" ? "#0F172A" : "#94A3B8"}
            />
            <Text
              style={[styles.segmentText, mode === "radar" && styles.segmentTextActive]}
            >
              Rain Radar
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            // refresh or center
          }}
        >
          <Ionicons name="locate" size={20} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* ── Fullscreen Mapbox WebView ── */}
      <View style={styles.mapContainer}>
        <WebViewMap
          mode={mode}
          onPointTap={(pt) => setSelectedPoint(pt)}
        />
      </View>

      {/* ── Tap Inspection Bottom Card ── */}
      {selectedPoint && (
        <View style={[styles.inspectCard, { bottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.inspectHeader}>
            <View>
              <Text style={styles.inspectTitle}>Station Observation</Text>
              <Text style={styles.inspectSource}>{selectedPoint.source || "IMD AWS"}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedPoint(null)}>
              <Ionicons name="close-circle" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inspectStats}>
            <View style={styles.inspectItem}>
              <Text style={styles.inspectLabel}>Temperature</Text>
              <Text style={styles.inspectVal}>{selectedPoint.temperature_c}°C</Text>
            </View>
            <View style={styles.inspectItem}>
              <Text style={styles.inspectLabel}>Anomaly vs Climatology</Text>
              <Text
                style={[
                  styles.inspectVal,
                  selectedPoint.anomaly_c > 0 ? { color: "#F87171" } : { color: "#60A5FA" },
                ]}
              >
                {selectedPoint.anomaly_c > 0 ? `+${selectedPoint.anomaly_c}` : selectedPoint.anomaly_c}°C
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.inspectCta}
            onPress={() => {
              const temp = selectedPoint.temperature_c;
              navigation.navigate("Loading", {
                queryText: `Detailed analysis for this station observing ${temp}°C`,
                personaType: "generic",
              });
            }}
          >
            <Text style={styles.inspectCtaText}>Ask WeatherGPT about this point</Text>
            <Ionicons name="arrow-forward" size={14} color="#0F172A" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    zIndex: 20,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
    borderColor: "#334155",
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: "#60A5FA",
  },
  segmentText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#0F172A",
  },
  mapContainer: {
    flex: 1,
  },
  inspectCard: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#1E293B",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  inspectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inspectTitle: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "700",
  },
  inspectSource: {
    color: "#94A3B8",
    fontSize: 11,
    textTransform: "uppercase",
  },
  inspectStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  inspectItem: {
    flex: 1,
  },
  inspectLabel: {
    color: "#64748B",
    fontSize: 11,
    marginBottom: 2,
  },
  inspectVal: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "700",
  },
  inspectCta: {
    flexDirection: "row",
    backgroundColor: "#60A5FA",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  inspectCtaText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
});
