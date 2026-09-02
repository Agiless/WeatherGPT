/**
 * Screen 3 — Home / Query Screen
 * Persona-aware layout with query input and quick-action chips.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE } from "../api/client";

type Props = { navigation: any };

const QUICK_CHIPS = [
  { label: "Today", icon: "today", hazard: "general" },
  { label: "Next 48h", icon: "time", hazard: "general" },
  { label: "Rain", icon: "rainy", hazard: "rainfall" },
  { label: "Wind", icon: "flag", hazard: "wind" },
  { label: "Flood", icon: "water", hazard: "flood" },
  { label: "Cyclone", icon: "warning", hazard: "cyclone" },
] as const;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [queryText, setQueryText] = useState("");
  const [persona, setPersona] = useState("generic");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const p = await AsyncStorage.getItem("persona_type");
      if (p) setPersona(p);

      // Quick health check
      try {
        const res = await fetch(`${API_BASE}/v1/health`);
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    loadProfile();
  }, []);

  const isVoiceFirst = persona === "farmer" || persona === "fisherman";

  const handleChipPress = (chip: (typeof QUICK_CHIPS)[number]) => {
    setQueryText(
      chip.label === "Today"
        ? "What's the weather today?"
        : chip.label === "Next 48h"
        ? "Weather forecast for the next 48 hours"
        : `${chip.label} forecast for my area`
    );
  };

  const handleSendQuery = () => {
    if (!queryText.trim()) return;
    const textToSend = queryText.trim();
    setQueryText("");
    navigation.navigate("Loading", {
      queryText: textToSend,
      personaType: persona,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <View>
          <Text style={styles.greeting}>WeatherGPT</Text>
          <Text style={styles.personaLabel}>
            {persona.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Connectivity indicator */}
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? "#34D399" : "#F59E0B" },
            ]}
          />
          <TouchableOpacity onPress={() => navigation.navigate("Map", { initialMode: "radar" })}>
            <Ionicons name="map-outline" size={22} color="#60A5FA" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Settings");
            }}
          >
            <Ionicons name="settings-outline" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Voice-first layout for low-abstraction personas ── */}
        {isVoiceFirst && (
          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={() => navigation.navigate("VoiceInput")}
          >
            <View style={styles.voiceCircle}>
              <Ionicons name="mic" size={48} color="#F1F5F9" />
            </View>
            <Text style={styles.voiceBtnText}>Tap to Ask</Text>
            <Text style={styles.voiceBtnSubtext}>
              Ask about weather in your language
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Quick-action chips ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={styles.chip}
              onPress={() => handleChipPress(chip)}
            >
              <Ionicons
                name={chip.icon as any}
                size={18}
                color="#60A5FA"
              />
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Placeholder for recent/last response ── */}
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color="#334155" />
          <Text style={styles.emptyText}>
            Ask a weather question to get started
          </Text>
        </View>
      </ScrollView>

      {/* ── Query input bar ── */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask about weather..."
          placeholderTextColor="#64748B"
          value={queryText}
          onChangeText={setQueryText}
          onSubmitEditing={handleSendQuery}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            !queryText.trim() && styles.sendBtnDisabled,
          ]}
          disabled={!queryText.trim()}
          onPress={handleSendQuery}
        >
          <Ionicons name="send" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F1F5F9",
  },
  personaLabel: {
    fontSize: 13,
    color: "#60A5FA",
    fontWeight: "600",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
  },
  // Voice button (farmer/fisherman)
  voiceBtn: {
    alignItems: "center",
    padding: 32,
    marginBottom: 24,
  },
  voiceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#60A5FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  voiceBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  voiceBtnSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  // Chips
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  chipScroll: {
    marginBottom: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    marginRight: 10,
    gap: 6,
  },
  chipText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: "#475569",
    fontSize: 15,
    marginTop: 12,
  },
  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    backgroundColor: "#0F172A",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#F1F5F9",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#60A5FA",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
