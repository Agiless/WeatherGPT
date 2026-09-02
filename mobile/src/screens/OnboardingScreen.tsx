/**
 * Screen 2 — Onboarding & Persona Selection
 * Language picker, persona grid (8 types), home location pin.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { updateProfile } from "../api/client";

type Props = { navigation: any };

const PERSONAS = [
  { id: "farmer", icon: "leaf", label: "Farmer", color: "#22C55E" },
  { id: "fisherman", icon: "fish", label: "Fisherman", color: "#06B6D4" },
  { id: "logistics", icon: "cube", label: "Logistics", color: "#8B5CF6" },
  { id: "traveller", icon: "airplane", label: "Traveller", color: "#F59E0B" },
  { id: "generic", icon: "person", label: "General", color: "#60A5FA" },
  {
    id: "researcher_scientist",
    icon: "flask",
    label: "Researcher",
    color: "#EC4899",
  },
  {
    id: "disaster_manager_govt",
    icon: "shield-checkmark",
    label: "Disaster Mgr",
    color: "#EF4444",
  },
  { id: "aviation", icon: "navigate", label: "Aviation", color: "#14B8A6" },
] as const;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
];export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"language" | "persona" | "location">(
    "language"
  );
  const [selectedLang, setSelectedLang] = useState("en");
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Location helps us provide accurate local weather. You can set it manually later."
        );
        setLocation({ lat: 13.0827, lon: 80.2707 }); // Default: Chennai
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    } catch {
      setLocation({ lat: 13.0827, lon: 80.2707 });
    }
  };

  const handleComplete = async () => {
    // Save to AsyncStorage
    await AsyncStorage.setItem("onboarding_complete", "true");
    await AsyncStorage.setItem("persona_type", selectedPersona || "generic");
    await AsyncStorage.setItem("language", selectedLang);
    if (location) {
      await AsyncStorage.setItem("home_location", JSON.stringify(location));
    }

    // Try to update the backend profile
    try {
      await updateProfile({
        persona_type: selectedPersona || "generic",
        preferred_language: selectedLang,
        home_lat: location?.lat,
        home_lon: location?.lon,
      });
    } catch {
      // Backend might not be available; local state is enough
    }

    navigation.replace("Home");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 36,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* ── Step 1: Language ── */}
          {step === "language" && (
            <>
              <Text style={styles.stepLabel}>Step 1 of 3</Text>
              <Text style={styles.title}>Choose Your Language</Text>
              <Text style={styles.subtitle}>
                Select your preferred language for weather advisories
              </Text>
              <View style={styles.langGrid}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langChip,
                      selectedLang === lang.code && styles.langChipActive,
                    ]}
                    onPress={() => setSelectedLang(lang.code)}
                  >
                    <Text
                      style={[
                        styles.langLabel,
                        selectedLang === lang.code && styles.langLabelActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  fadeAnim.setValue(0);
                  setStep("persona");
                }}
              >
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#0F172A" />
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2: Persona ── */}
          {step === "persona" && (
            <>
              <Text style={styles.stepLabel}>Step 2 of 3</Text>
              <Text style={styles.title}>Who Are You?</Text>
              <Text style={styles.subtitle}>
                This shapes how weather information is presented to you
              </Text>
              <View style={styles.personaGrid}>
                {PERSONAS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.personaCard,
                      selectedPersona === p.id && {
                        borderColor: p.color,
                        backgroundColor: `${p.color}15`,
                      },
                    ]}
                    onPress={() => setSelectedPersona(p.id)}
                  >
                    <View
                      style={[styles.personaIcon, { backgroundColor: `${p.color}20` }]}
                    >
                      <Ionicons
                        name={p.icon as any}
                        size={28}
                        color={p.color}
                      />
                    </View>
                    <Text style={styles.personaLabel}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[
                  styles.nextBtn,
                  !selectedPersona && styles.nextBtnDisabled,
                ]}
                disabled={!selectedPersona}
                onPress={() => {
                  fadeAnim.setValue(0);
                  setStep("location");
                }}
              >
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#0F172A" />
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3: Location ── */}
          {step === "location" && (
            <>
              <Text style={styles.stepLabel}>Step 3 of 3</Text>
              <Text style={styles.title}>Your Location</Text>
              <Text style={styles.subtitle}>
                Pin your home location for accurate local forecasts
              </Text>

              <TouchableOpacity
                style={styles.locationBtn}
                onPress={handleGetLocation}
              >
                <Ionicons name="location" size={24} color="#60A5FA" />
                <Text style={styles.locationBtnText}>
                  {location
                    ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                    : "Use Current Location"}
                </Text>
              </TouchableOpacity>

              {location && (
                <View style={styles.locationConfirm}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#34D399"
                  />
                  <Text style={{ color: "#34D399", marginLeft: 6 }}>
                    Location set
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.nextBtn, styles.startBtn]}
                onPress={handleComplete}
              >
                <Text style={styles.nextBtnText}>Start Using WeatherGPT</Text>
                <Ionicons name="thunderstorm" size={18} color="#0F172A" />
              </TouchableOpacity>

              {!location && (
                <TouchableOpacity onPress={handleComplete}>
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  stepLabel: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F1F5F9",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#94A3B8",
    marginBottom: 32,
    lineHeight: 22,
  },
  // Language chips
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 40,
  },
  langChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
  },
  langChipActive: {
    borderColor: "#60A5FA",
    backgroundColor: "rgba(96, 165, 250, 0.15)",
  },
  langLabel: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
  },
  langLabelActive: {
    color: "#60A5FA",
  },
  // Persona grid
  personaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  personaCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    alignItems: "center",
  },
  personaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  personaLabel: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  // Buttons
  nextBtn: {
    backgroundColor: "#60A5FA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  startBtn: {
    backgroundColor: "#34D399",
    marginTop: 24,
  },
  // Location
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    gap: 12,
    marginBottom: 16,
  },
  locationBtnText: {
    color: "#E2E8F0",
    fontSize: 15,
  },
  locationConfirm: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  skipText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
});
