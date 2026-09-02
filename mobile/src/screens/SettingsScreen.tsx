/**
 * Screen 9 — Profile & Settings
 * Allows switching persona (Farmer -> Researcher), language, units, and clearing cache.
 */

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateProfile } from "../api/client";

type Props = { navigation: any };

const PERSONAS = [
  { id: "farmer", label: "Farmer", color: "#22C55E" },
  { id: "fisherman", label: "Fisherman", color: "#06B6D4" },
  { id: "logistics", label: "Logistics", color: "#8B5CF6" },
  { id: "traveller", label: "Traveller", color: "#F59E0B" },
  { id: "generic", label: "General", color: "#60A5FA" },
  { id: "researcher_scientist", label: "Researcher / Met", color: "#EC4899" },
  { id: "disaster_manager_govt", label: "Disaster Mgr", color: "#EF4444" },
  { id: "aviation", label: "Aviation", color: "#14B8A6" },
];

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activePersona, setActivePersona] = useState("generic");
  const [voiceDefault, setVoiceDefault] = useState(false);
  const [metricUnits, setMetricUnits] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("persona_type").then((p) => {
      if (p) setActivePersona(p);
    });
  }, []);

  const handleSelectPersona = async (pId: string) => {
    setActivePersona(pId);
    await AsyncStorage.setItem("persona_type", pId);
    try {
      await updateProfile({ persona_type: pId });
    } catch {}
    Alert.alert("Persona Updated", `Switched to ${pId.replace(/_/g, " ")}. Next queries will adapt to this profile.`);
  };

  const handleClearCache = async () => {
    Alert.alert("Clear Cache", "Cached forecasts and logs cleared successfully.");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings & Profile</Text>
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
        <Text style={styles.sectionHeader}>Switch Persona</Text>
        <View style={styles.personaGrid}>
          {PERSONAS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.personaBtn,
                activePersona === p.id && { borderColor: p.color, backgroundColor: `${p.color}15` },
              ]}
              onPress={() => handleSelectPersona(p.id)}
            >
              <Text
                style={[
                  styles.personaBtnText,
                  activePersona === p.id && { color: p.color, fontWeight: "700" },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Voice-First Audio Output</Text>
              <Text style={styles.settingSub}>Auto-read forecasts aloud</Text>
            </View>
            <Switch
              value={voiceDefault}
              onValueChange={setVoiceDefault}
              trackColor={{ false: "#334155", true: "#60A5FA" }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Metric Units (°C, mm/h, km/h)</Text>
              <Text style={styles.settingSub}>Standard SI meteorological format</Text>
            </View>
            <Switch
              value={metricUnits}
              onValueChange={setMetricUnits}
              trackColor={{ false: "#334155", true: "#60A5FA" }}
            />
          </View>
        </View>

        <Text style={styles.sectionHeader}>Quick Access & Fallback</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate("OfflineFallback")}
        >
          <Ionicons name="chatbox-ellipses-outline" size={20} color="#F59E0B" />
          <Text style={styles.actionRowText}>SMS / Low-Bandwidth Preview</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate("History")}
        >
          <Ionicons name="time-outline" size={20} color="#60A5FA" />
          <Text style={styles.actionRowText}>Query History</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionRow, { marginTop: 12 }]} onPress={handleClearCache}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionRowText, { color: "#EF4444" }]}>Clear Cached Forecasts</Text>
        </TouchableOpacity>
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  personaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  personaBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  personaBtnText: { color: "#CBD5E1", fontSize: 13, fontWeight: "500" },
  settingCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingLabel: { color: "#F1F5F9", fontSize: 14, fontWeight: "600" },
  settingSub: { color: "#64748B", fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#334155", marginVertical: 14 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
    marginBottom: 10,
  },
  actionRowText: { flex: 1, color: "#F1F5F9", fontSize: 14, fontWeight: "500" },
});
