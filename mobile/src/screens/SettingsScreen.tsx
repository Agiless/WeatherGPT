/**
 * Screen 9 — Profile & Settings
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
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
  { id: "farmer", label: "Farmer", color: "#D4AF37" },
  { id: "fisherman", label: "Fisherman", color: "#38BDF8" },
  { id: "logistics", label: "Logistics", color: "#F59E0B" },
  { id: "traveller", label: "Traveller", color: "#E2E8F0" },
  { id: "generic", label: "General", color: "#A1A1AA" },
  { id: "researcher_scientist", label: "Researcher / Met", color: "#D4AF37" },
  { id: "disaster_manager_govt", label: "Disaster Mgr", color: "#EF4444" },
  { id: "aviation", label: "Aviation", color: "#34D399" },
];

const LANGUAGES = [
  { code: "ta", label: "தமிழ்", sub: "Tamil" },
  { code: "en", label: "English", sub: "Global" },
  { code: "hi", label: "हिंदी", sub: "Hindi" },
  { code: "te", label: "తెలుగు", sub: "Telugu" },
  { code: "bn", label: "বাংলা", sub: "Bengali" },
  { code: "mr", label: "मराठी", sub: "Marathi" },
];

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activePersona, setActivePersona] = useState("farmer");
  const [activeLang, setActiveLang] = useState("ta");
  const [voiceDefault, setVoiceDefault] = useState(false);
  const [metricUnits, setMetricUnits] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("persona_type").then((p) => {
      if (p) setActivePersona(p);
    });
    AsyncStorage.getItem("preferred_language").then((l) => {
      if (l) setActiveLang(l);
    });
  }, []);

  const handleSelectPersona = async (pId: string) => {
    setActivePersona(pId);
    await AsyncStorage.setItem("persona_type", pId);
    try {
      await updateProfile({ persona_type: pId });
    } catch {}
    Alert.alert("Persona Updated", `Switched to ${pId.replace(/_/g, " ")}. Weather queries will now adapt to this role.`);
  };

  const handleSelectLanguage = async (lCode: string) => {
    setActiveLang(lCode);
    await AsyncStorage.setItem("preferred_language", lCode);
    await AsyncStorage.setItem("language", lCode);
    try {
      await updateProfile({ preferred_language: lCode });
    } catch {}
    Alert.alert("Language Updated", `Switched to ${LANGUAGES.find(l => l.code === lCode)?.label || lCode}. Advisories and voice will speak in this language.`);
  };

  const handleClearCache = async () => {
    await AsyncStorage.removeItem("weathergpt_black_gold_sessions_v1");
    await AsyncStorage.removeItem("chat_history_v3");
    Alert.alert("Clear Cache", "Cached forecasts, logs, and sessions cleared successfully.");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#D4AF37" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Settings & Profile</Text>
          <Text style={styles.subtitle}>Preferences & Language</Text>
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
        {/* Language Selection Section */}
        <Text style={styles.sectionHeader}>Preferred Language</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map((l) => {
            const isSelected = activeLang === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.langBtn,
                  isSelected && styles.langBtnActive,
                ]}
                onPress={() => handleSelectLanguage(l.code)}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    isSelected && styles.langBtnTextActive,
                  ]}
                >
                  {l.label}
                </Text>
                <Text
                  style={[
                    styles.langBtnSub,
                    isSelected && styles.langBtnSubActive,
                  ]}
                >
                  {l.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Persona Selection Section */}
        <Text style={styles.sectionHeader}>Switch Persona</Text>
        <View style={styles.personaGrid}>
          {PERSONAS.map((p) => {
            const isSelected = activePersona === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.personaBtn,
                  isSelected && styles.personaBtnActive,
                ]}
                onPress={() => handleSelectPersona(p.id)}
              >
                <Text
                  style={[
                    styles.personaBtnText,
                    isSelected && styles.personaBtnTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionHeader}>System Preferences</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.settingLabel}>Voice-First Audio Output</Text>
              <Text style={styles.settingSub}>Auto-read forecasts aloud via neural TTS</Text>
            </View>
            <Switch
              value={voiceDefault}
              onValueChange={setVoiceDefault}
              trackColor={{ false: "#27272A", true: "#D4AF37" }}
              thumbColor={voiceDefault ? "#09090B" : "#71717A"}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.settingLabel}>Metric Units (°C, mm/h, km/h)</Text>
              <Text style={styles.settingSub}>Standard SI meteorological format</Text>
            </View>
            <Switch
              value={metricUnits}
              onValueChange={setMetricUnits}
              trackColor={{ false: "#27272A", true: "#D4AF37" }}
              thumbColor={metricUnits ? "#09090B" : "#71717A"}
            />
          </View>
        </View>

        <Text style={styles.sectionHeader}>Quick Access & Fallback</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate("OfflineFallback")}
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color="#D4AF37" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionRowText}>SMS / Low-Bandwidth Preview</Text>
            <Text style={styles.actionRowSub}>Offline GSM 7-bit weather alerts</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#71717A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate("History")}
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="time-outline" size={18} color="#D4AF37" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionRowText}>Query History</Text>
            <Text style={styles.actionRowSub}>Review previous weather advisories</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#71717A" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionRow, { marginTop: 12 }]} onPress={handleClearCache}>
          <View style={[styles.actionIconBox, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)" }]}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionRowText, { color: "#EF4444" }]}>Clear Cached Forecasts & History</Text>
            <Text style={styles.actionRowSub}>Free up local storage & reset chat sessions</Text>
          </View>
        </TouchableOpacity>
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
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#FFFDF7", letterSpacing: 0.3 },
  subtitle: { fontSize: 11, color: "#D4AF37", letterSpacing: 0.5, marginTop: 1 },
  scroll: { flex: 1 },
  scrollInner: { padding: 20 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4AF37",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 12,
  },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  langBtn: {
    width: "31%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "#27272A",
    alignItems: "center",
  },
  langBtnActive: {
    borderColor: "#D4AF37",
    backgroundColor: "rgba(212, 175, 55, 0.14)",
  },
  langBtnText: { color: "#FFFDF7", fontSize: 13, fontWeight: "700" },
  langBtnTextActive: { color: "#D4AF37" },
  langBtnSub: { color: "#71717A", fontSize: 10, marginTop: 2 },
  langBtnSubActive: { color: "rgba(212, 175, 55, 0.85)" },
  personaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  personaBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  personaBtnActive: {
    borderColor: "#D4AF37",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
  },
  personaBtnText: { color: "#A1A1AA", fontSize: 13, fontWeight: "500" },
  personaBtnTextActive: { color: "#D4AF37", fontWeight: "700" },
  settingCard: {
    backgroundColor: "#141416",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
    marginBottom: 16,
  },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingLabel: { color: "#FFFDF7", fontSize: 14, fontWeight: "600" },
  settingSub: { color: "#71717A", fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#27272A", marginVertical: 14 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141416",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
    gap: 12,
    marginBottom: 10,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionRowText: { color: "#FFFDF7", fontSize: 14, fontWeight: "600" },
  actionRowSub: { color: "#71717A", fontSize: 11, marginTop: 1 },
});
