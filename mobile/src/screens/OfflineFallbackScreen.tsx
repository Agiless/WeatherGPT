/**
 * Screen 10 — SMS / Low-Bandwidth Preview Screen
 * In-app preview of condensed SMS advisory (<=160 chars).
 * Demonstrates graceful degradation without external SMS gateway.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { navigation: any };

export default function OfflineFallbackScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const sampleSms = "WXGPT: Madurai Rain Alert. 25-40mm expected next 24h. Winds 18km/h. Avoid pesticide spraying. IMD/OWM Consensus: 88% High. Details: call 1800-WX.";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={styles.title}>SMS Fallback Preview</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.infoText}>
            For remote rural areas with intermittent connectivity, WeatherGPT automatically condenses advisories to ≤160 characters.
          </Text>
        </View>

        <Text style={styles.previewTitle}>Simulated SMS Dispatch (GSM 7-bit)</Text>
        <View style={styles.smsBubble}>
          <Text style={styles.smsText}>{sampleSms}</Text>
          <View style={styles.smsMeta}>
            <Text style={styles.smsCount}>{sampleSms.length} / 160 chars</Text>
            <Text style={styles.smsTime}>10:15 AM</Text>
          </View>
        </View>

        <View style={styles.featureList}>
          <Text style={styles.featureHeader}>Degradation Hierarchy</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.featureText}>Online: GPU Mapbox GL JS + full AI analysis</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#F59E0B" />
            <Text style={styles.featureText}>Low-Bandwidth: Compressed JSON without raster tiles</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#60A5FA" />
            <Text style={styles.featureText}>SMS Fallback: ≤160 char actionable prompt</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#F1F5F9" },
  scroll: { flex: 1 },
  scrollInner: { padding: 20 },
  content: { padding: 20 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    gap: 10,
    marginBottom: 24,
  },
  infoText: { flex: 1, color: "#FDE68A", fontSize: 13, lineHeight: 18 },
  previewTitle: { color: "#94A3B8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  smsBubble: {
    backgroundColor: "#1E293B",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 28,
  },
  smsText: { color: "#F1F5F9", fontSize: 15, lineHeight: 22 },
  smsMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 8 },
  smsCount: { color: "#60A5FA", fontSize: 12, fontWeight: "600" },
  smsTime: { color: "#64748B", fontSize: 12 },
  featureList: { gap: 10 },
  featureHeader: { color: "#94A3B8", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { color: "#CBD5E1", fontSize: 13 },
});
