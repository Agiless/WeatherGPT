/**
 * Screen 10 — SMS / Low-Bandwidth Preview Screen
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
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
          <Ionicons name="arrow-back" size={20} color="#D4AF37" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>SMS Fallback Preview</Text>
          <Text style={styles.subtitle}>Low-Bandwidth GSM 7-Bit</Text>
        </View>
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
          <Ionicons name="information-circle" size={20} color="#D4AF37" />
          <Text style={styles.infoText}>
            For remote rural areas with intermittent connectivity, WeatherGPT automatically condenses advisories to ≤160 characters.
          </Text>
        </View>

        <Text style={styles.previewTitle}>Simulated SMS Dispatch (GSM 7-bit)</Text>
        <View style={styles.smsBubble}>
          <Text style={styles.smsText}>{sampleSms}</Text>
          <View style={styles.smsMeta}>
            <Text style={styles.smsCount}>{sampleSms.length} / 160 chars</Text>
            <Text style={styles.smsTime}>10:15 AM · Dispatched</Text>
          </View>
        </View>

        <View style={styles.featureList}>
          <Text style={styles.featureHeader}>Degradation Hierarchy</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
            <Text style={styles.featureText}>Online: GPU Mapbox GL JS + full AI analysis</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
            <Text style={styles.featureText}>Low-Bandwidth: Compressed JSON without raster tiles</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
            <Text style={styles.featureText}>SMS Fallback: ≤160 char actionable prompt</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.15)",
    backgroundColor: "#141416",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1C1C20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#FFFDF7" },
  subtitle: { fontSize: 11, color: "#D4AF37", marginTop: 1 },
  scroll: { flex: 1 },
  scrollInner: { padding: 20 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    gap: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  infoText: { flex: 1, color: "#FDFBF7", fontSize: 13, lineHeight: 19 },
  previewTitle: { color: "#D4AF37", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "700", marginBottom: 12 },
  smsBubble: {
    backgroundColor: "#141416",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    marginBottom: 28,
  },
  smsText: { color: "#FFFDF7", fontSize: 14.5, lineHeight: 22 },
  smsMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, borderTopWidth: 1, borderTopColor: "#27272A", paddingTop: 10 },
  smsCount: { color: "#D4AF37", fontSize: 12, fontWeight: "700" },
  smsTime: { color: "#71717A", fontSize: 12 },
  featureList: {
    backgroundColor: "#141416",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
    gap: 12,
  },
  featureHeader: { color: "#D4AF37", fontSize: 13, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { color: "#E4E4E7", fontSize: 13 },
});
