/**
 * WebViewMap — Mapbox GL JS inside React Native WebView
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
 * This allows full GPU Mapbox GL JS rendering inside Expo Go without native modules.
 */

import React, { useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Platform } from "react-native";
import { getApiBase } from "../api/client";
import Constants from "expo-constants";

interface WebViewMapProps {
  mode: "temp" | "radar";
  onPointTap?: (pointData: any) => void;
}

export default function WebViewMap({ mode, onPointTap }: WebViewMapProps) {
  const apiBase = getApiBase();
  const mapboxToken = Constants.expoConfig?.extra?.mapboxToken || "";

  const mapUrl = `${apiBase}/v1/maps/map.html?mode=${mode}&apiBase=${encodeURIComponent(
    apiBase
  )}&token=${encodeURIComponent(mapboxToken)}`;

  // Web Browser Platform Rendering (uses native iframe)
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <iframe
          src={mapUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#09090B",
          }}
          title="WeatherGPT GIS Radar Map"
        />
      </View>
    );
  }

  // Native iOS / Android Platform Rendering
  const { WebView } = require("react-native-webview");
  const webViewRef = useRef<any>(null);

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "POINT_TAP" && onPointTap) {
        onPointTap(msg.data);
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: mapUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onMessage={handleMessage}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>Initializing GIS Doppler Map...</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Map Offline</Text>
            <Text style={styles.errorSubtitle}>
              Connect to server at {apiBase} to stream map tiles
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#09090B",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#D4AF37",
    fontSize: 13,
    fontWeight: "600",
  },
  errorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#09090B",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    color: "#FFFDF7",
    fontSize: 16,
    fontWeight: "700",
  },
  errorSubtitle: {
    color: "#71717A",
    fontSize: 13,
    textAlign: "center",
  },
});
