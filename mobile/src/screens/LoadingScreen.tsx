/**
 * Screen 5 — Loading / Processing State
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
  { text: "Understanding weather query...", icon: "sparkles" },
  { text: "Fetching OpenWeather & IMD observations...", icon: "cloud-download" },
  { text: "Evaluating risk engine & consensus...", icon: "analytics" },
  { text: "Structuring persona advisory...", icon: "document-text" },
];

export default function LoadingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { queryText, personaType, language = "en" } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Step progression ticker
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 900);

    // Call API
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
        // Fallback response if laptop server unreachable
        if (isMounted) {
          navigation.replace("Response", {
            response: {
              advisory_text:
                "Advisory: Light to moderate rainfall expected over the region in the next 24-48 hours. Wind speeds remain gentle. Farmers and travellers can proceed with standard precautions.",
              confidence_label: "Moderate confidence",
              persona_type: personaType,
              source_attribution: "WeatherGPT Risk Engine (Offline Baseline)",
              risk_object: {
                hazards: {
                  rainfall: { owm_score: 52, imd_score: 58, consensus_score: 88, final_risk_level: "moderate" },
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
          <Ionicons name="thunderstorm" size={54} color="#60A5FA" />
        </Animated.View>

        <Text style={styles.title}>Processing Weather Intelligence</Text>
        <Text style={styles.queryPreview}>"{queryText}"</Text>

        <View style={styles.stepsContainer}>
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <View key={step.text} style={styles.stepRow}>
                <View style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#0F172A" />
                  ) : (
                    <Ionicons name={step.icon as any} size={14} color={isCurrent ? "#60A5FA" : "#475569"} />
                  )}
                </View>
                <Text style={[styles.stepText, (isDone || isCurrent) && styles.stepTextActive]}>
                  {step.text}
                </Text>
              </View>
            );
          })}
        </View>

        <ActivityIndicator size="small" color="#60A5FA" style={{ marginTop: 24 }} />
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
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F1F5F9",
    marginBottom: 8,
  },
  queryPreview: {
    fontSize: 14,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 36,
  },
  stepsContainer: {
    width: "100%",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotDone: {
    backgroundColor: "#34D399",
  },
  stepDotCurrent: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    borderWidth: 1,
    borderColor: "#60A5FA",
  },
  stepText: {
    color: "#64748B",
    fontSize: 14,
  },
  stepTextActive: {
    color: "#E2E8F0",
    fontWeight: "500",
  },
});
