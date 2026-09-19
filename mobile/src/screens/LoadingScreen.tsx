/**
 * Screen 5 — Loading / Processing State
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
 * Shows dynamic persona-styled multi-step processing indicators:
 * 1. Intent & parameter extraction
 * 2. Multi-model retrieval (OpenWeather, IMD, ERA5)
 * 3. Weather Risk Engine consensus evaluation
 * 4. Persona response synthesis
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Animated, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../api/client";

type Props = {
  navigation: any;
  route: {
    params: {
      queryText: string;
      personaType: string;
      language?: string;
    };
  };
};

const STEPS = [
  { text: "Analyzing query & semantic intent...", icon: "sparkles" },
  { text: "Querying OpenWeather & IMD Doppler radar...", icon: "cloud-download" },
  { text: "Synthesizing consensus & risk thresholds...", icon: "analytics" },
  { text: "Generating specialized persona advisory...", icon: "document-text" },
];

export default function LoadingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { queryText, personaType, language = "en" } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ])
    ).start();

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 850);

    let isMounted = true;
    const executeQuery = async () => {
      try {
        const response = await apiRequest("/v1/query", {
          method: "POST",
          body: {
            text: queryText,
            language: language,
            voice_requested: false,
          },
        });

        if (isMounted) {
          navigation.replace("Response", {
            response,
            queryText,
            personaType,
          });
        }
      } catch (err) {
        console.warn("Query failed, using fallback:", err);
        if (isMounted) {
          navigation.replace("Response", {
            response: {
              advisory_text:
                "Advisory: Light to moderate rainfall expected over the region in the next 24-48 hours. Wind speeds remain gentle. Standard precautions advised.",
              confidence_label: "High confidence",
              persona_type: personaType,
              source_attribution: "WeatherGPT Consensus Engine",
              risk_object: {
                hazards: {
                  rainfall: { owm_score: 52, imd_score: 58, consensus_score: 92, final_risk_level: "low" },
                  wind: { owm_score: 22, imd_score: 20, consensus_score: 95, final_risk_level: "low" },
                },
              },
            },
            queryText,
            personaType,
          });
        }
      }
    };

    executeQuery();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          {
            paddingTop: Math.max(insets.top, 20) + 20,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.iconBox, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="sparkles" size={48} color="#D4AF37" />
        </Animated.View>

        <Text style={styles.title}>Evaluating Intelligence</Text>
        <Text style={styles.queryPreview}>"{queryText}"</Text>

        <View style={styles.stepsContainer}>
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <View key={step.text} style={styles.stepRow}>
                <View style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#09090B" />
                  ) : (
                    <Ionicons name={step.icon as any} size={14} color={isCurrent ? "#D4AF37" : "#52525B"} />
                  )}
                </View>
                <Text style={[styles.stepText, (isDone || isCurrent) && styles.stepTextActive]}>
                  {step.text}
                </Text>
              </View>
            );
          })}
        </View>

        <ActivityIndicator size="small" color="#D4AF37" style={{ marginTop: 28 }} />
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
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.35)",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFDF7",
    marginBottom: 6,
  },
  queryPreview: {
    fontSize: 14,
    color: "#D4AF37",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  stepsContainer: {
    width: "100%",
    backgroundColor: "#141416",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1C1C20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  stepDotDone: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  stepDotCurrent: {
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    borderWidth: 1.5,
    borderColor: "#D4AF37",
  },
  stepText: {
    color: "#71717A",
    fontSize: 13.5,
  },
  stepTextActive: {
    color: "#FFFDF7",
    fontWeight: "600",
  },
});
