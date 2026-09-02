/**
 * Screen 1 — Splash / App Launch
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
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

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
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Health check + routing
    const init = async () => {
      const healthy = await checkHealth();
      setStatus(healthy ? "ok" : "offline");

      // Short delay so user sees the splash
      await new Promise((r) => setTimeout(r, 1200));

      // Check if onboarding was completed
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
          <Ionicons name="thunderstorm" size={48} color="#60A5FA" />
        </View>
        <Text style={styles.title}>WeatherGPT</Text>
        <Text style={styles.subtitle}>AI Weather Intelligence</Text>
      </Animated.View>

      <View style={styles.statusContainer}>
        {status === "checking" && (
          <>
            <ActivityIndicator size="small" color="#60A5FA" />
            <Text style={styles.statusText}>Connecting to server...</Text>
          </>
        )}
        {status === "ok" && (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#34D399" />
            <Text style={[styles.statusText, { color: "#34D399" }]}>
              API Connected
            </Text>
          </>
        )}
        {status === "offline" && (
          <>
            <Ionicons name="cloud-offline" size={20} color="#F59E0B" />
            <Text style={[styles.statusText, { color: "#F59E0B" }]}>
              Offline Mode
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
    backgroundColor: "#0F172A",
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
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#F1F5F9",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 6,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 80,
    gap: 8,
  },
  statusText: {
    color: "#94A3B8",
    fontSize: 14,
  },
});
