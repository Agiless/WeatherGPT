/**
 * Screen 1 — Splash / App Launch
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
 * Logo + connectivity check → pings GET /v1/health
 * Routes to Onboarding (first launch) or Home
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { checkHealth } from "../api/client";

type Props = {
  navigation: any;
};

export default function SplashScreen({ navigation }: Props) {
  const [status, setStatus] = useState<"checking" | "ok" | "offline">(
    "checking"
  );
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Health check + routing
    const init = async () => {
      const healthy = await checkHealth();
      setStatus(healthy ? "ok" : "offline");

      await new Promise((r) => setTimeout(r, 1200));

      const onboarded = await AsyncStorage.getItem("onboarding_complete");
      if (onboarded === "true") {
        navigation.replace("Home");
      } else {
        navigation.replace("Onboarding");
      }
    };

    init();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={44} color="#D4AF37" />
        </View>
        <Text style={styles.title}>WeatherGPT</Text>
        <Text style={styles.subtitle}>Conversational Weather Intelligence</Text>
      </Animated.View>

      <View style={styles.statusContainer}>
        {status === "checking" && (
          <>
            <ActivityIndicator size="small" color="#D4AF37" />
            <Text style={styles.statusText}>Connecting to weather intelligence...</Text>
          </>
        )}
        {status === "ok" && (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#D4AF37" />
            <Text style={[styles.statusText, { color: "#D4AF37" }]}>
              API Connected · Ready
            </Text>
          </>
        )}
        {status === "offline" && (
          <>
            <Ionicons name="cloud-offline" size={18} color="#F59E0B" />
            <Text style={[styles.statusText, { color: "#F59E0B" }]}>
              Offline Baseline Mode
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.35)",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFDF7",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: "#D4AF37",
    marginTop: 6,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 70,
    gap: 8,
  },
  statusText: {
    color: "#71717A",
    fontSize: 13,
    fontWeight: "500",
  },
});
