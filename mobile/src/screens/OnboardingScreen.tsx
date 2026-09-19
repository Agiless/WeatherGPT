/**
 * Screen 2 — Onboarding & Persona Selection
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
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
  { id: "farmer", icon: "leaf", label: "Farmer", desc: "Agronomy & Monsoon" },
  { id: "fisherman", icon: "fish", label: "Fisherman", desc: "Wave Height & Gusts" },
  { id: "logistics", icon: "cube", label: "Logistics", desc: "Route Vis & Flooding" },
  { id: "traveller", icon: "airplane", label: "Traveller", desc: "Pack & Tour Prep" },
  { id: "generic", icon: "person", label: "General", desc: "Everyday Weather" },
  { id: "researcher_scientist", icon: "flask", label: "Researcher", desc: "Multi-Model & dBZ" },
  { id: "disaster_manager_govt", icon: "shield-checkmark", label: "Disaster Mgr", desc: "NDRF Alerts & SOPs" },
  { id: "aviation", icon: "navigate", label: "Aviation", desc: "METAR & TAF Winds" },
] as const;

const LANGUAGES = [
  { code: "en", label: "English", sub: "Global" },
  { code: "hi", label: "हिंदी", sub: "Hindi" },
  { code: "ta", label: "தமிழ்", sub: "Tamil" },
  { code: "te", label: "తెలుగు", sub: "Telugu" },
  { code: "bn", label: "বাংলা", sub: "Bengali" },
  { code: "mr", label: "मराठी", sub: "Marathi" },
];

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"language" | "persona" | "location">("language");
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
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Location helps us provide hyper-local weather. Defaulting to Chennai coordinates."
        );
        setLocation({ lat: 13.0827, lon: 80.2707 });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    } catch {
      setLocation({ lat: 13.0827, lon: 80.2707 });
    }
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem("onboarding_complete", "true");
    await AsyncStorage.setItem("persona_type", selectedPersona || "generic");
    await AsyncStorage.setItem("language", selectedLang);
    if (location) {
      await AsyncStorage.setItem("home_location", JSON.stringify(location));
    }

    try {
      await updateProfile({
        persona_type: selectedPersona || "generic",
        preferred_language: selectedLang,
        home_lat: location?.lat,
        home_lon: location?.lon,
      });
    } catch {}

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
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP 1 OF 3</Text>
              </View>
              <Text style={styles.title}>Select Your Language</Text>
              <Text style={styles.subtitle}>
                WeatherGPT delivers localized advisories and high-fidelity neural voice synthesis in your preferred language.
              </Text>
              <View style={styles.langGrid}>
                {LANGUAGES.map((lang) => {
                  const isActive = selectedLang === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langChip,
                        isActive && styles.langChipActive,
                      ]}
                      onPress={() => setSelectedLang(lang.code)}
                    >
                      <Text
                        style={[
                          styles.langLabel,
                          isActive && styles.langLabelActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                      <Text style={[styles.langSub, isActive && styles.langSubActive]}>
                        {lang.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  fadeAnim.setValue(0);
                  setStep("persona");
                }}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#09090B" />
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2: Persona ── */}
          {step === "persona" && (
            <>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP 2 OF 3</Text>
              </View>
              <Text style={styles.title}>Tailor Your AI Persona</Text>
              <Text style={styles.subtitle}>
                Adapts risk sensitivity, terminology, and action recommendations to your exact domain.
              </Text>
              <View style={styles.personaGrid}>
                {PERSONAS.map((p) => {
                  const isSelected = selectedPersona === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.personaCard,
                        isSelected && styles.personaCardActive,
                      ]}
                      onPress={() => setSelectedPersona(p.id)}
                    >
                      <View
                        style={[
                          styles.personaIconBox,
                          isSelected && styles.personaIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name={p.icon as any}
                          size={24}
                          color={isSelected ? "#D4AF37" : "#A1A1AA"}
                        />
                      </View>
                      <Text style={[styles.personaLabel, isSelected && styles.personaLabelActive]}>
                        {p.label}
                      </Text>
                      <Text style={styles.personaDesc} numberOfLines={1}>
                        {p.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#09090B" />
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3: Location ── */}
          {step === "location" && (
            <>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP 3 OF 3</Text>
              </View>
              <Text style={styles.title}>Pin Your Coordinates</Text>
              <Text style={styles.subtitle}>
                Enables immediate hyper-local nowcasting and Doppler radar telemetry for your surroundings.
              </Text>

              <TouchableOpacity
                style={styles.locationBtn}
                onPress={handleGetLocation}
              >
                <View style={styles.locationIconBox}>
                  <Ionicons name="location-sharp" size={20} color="#D4AF37" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationBtnTitle}>
                    {location ? "GPS Locked" : "Detect Current Location"}
                  </Text>
                  <Text style={styles.locationBtnSub}>
                    {location
                      ? `${location.lat.toFixed(4)}° N, ${location.lon.toFixed(4)}° E`
                      : "Tap to grant high-accuracy GPS permission"}
                  </Text>
                </View>
                {location && (
                  <Ionicons name="checkmark-circle" size={22} color="#D4AF37" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextBtn, styles.startBtn]}
                onPress={handleComplete}
              >
                <Text style={styles.nextBtnText}>Enter WeatherGPT</Text>
                <Ionicons name="sparkles" size={18} color="#09090B" />
              </TouchableOpacity>

              {!location && (
                <TouchableOpacity onPress={handleComplete} style={{ marginTop: 16 }}>
                  <Text style={styles.skipText}>Skip for now (Use Default Region)</Text>
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
    backgroundColor: "#09090B",
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 22,
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  stepBadgeText: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFDF7",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#A1A1AA",
    marginBottom: 28,
    lineHeight: 22,
  },
  // Language chips
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 36,
  },
  langChip: {
    width: "47%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272A",
    backgroundColor: "#141416",
    justifyContent: "center",
  },
  langChipActive: {
    borderColor: "#D4AF37",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
  },
  langLabel: {
    color: "#FFFDF7",
    fontSize: 16,
    fontWeight: "700",
  },
  langLabelActive: {
    color: "#D4AF37",
  },
  langSub: {
    color: "#71717A",
    fontSize: 11,
    marginTop: 2,
  },
  langSubActive: {
    color: "rgba(212, 175, 55, 0.8)",
  },
  // Persona grid
  personaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
  },
  personaCard: {
    width: "48%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272A",
    backgroundColor: "#141416",
    alignItems: "center",
  },
  personaCardActive: {
    borderColor: "#D4AF37",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
  },
  personaIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1C1C20",
    borderWidth: 1,
    borderColor: "#27272A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  personaIconBoxActive: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    borderColor: "#D4AF37",
  },
  personaLabel: {
    color: "#FFFDF7",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  personaLabelActive: {
    color: "#D4AF37",
  },
  personaDesc: {
    color: "#71717A",
    fontSize: 10.5,
    marginTop: 2,
    textAlign: "center",
  },
  // Buttons
  nextBtn: {
    backgroundColor: "#D4AF37",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  nextBtnDisabled: {
    opacity: 0.35,
  },
  nextBtnText: {
    color: "#09090B",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  startBtn: {
    backgroundColor: "#D4AF37",
    marginTop: 24,
  },
  // Location
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    backgroundColor: "#141416",
    gap: 14,
    marginBottom: 16,
  },
  locationIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  locationBtnTitle: {
    color: "#FFFDF7",
    fontSize: 14,
    fontWeight: "700",
  },
  locationBtnSub: {
    color: "#A1A1AA",
    fontSize: 12,
    marginTop: 2,
  },
  skipText: {
    color: "#71717A",
    textAlign: "center",
    fontSize: 13,
  },
});
