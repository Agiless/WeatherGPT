/**
 * WebViewMap — Mapbox GL JS inside React Native WebView
 * This allows full GPU Mapbox GL JS rendering inside Expo Go without native modules.
 */

import React, { useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";
import { API_BASE } from "../api/client";
import Constants from "expo-constants";

interface WebViewMapProps {
  mode: "temp" | "radar";
  onPointTap?: (pointData: any) => void;
}

export default function WebViewMap({ mode, onPointTap }: WebViewMapProps) {
  const webViewRef = useRef<WebView>(null);
  const mapboxToken = Constants.expoConfig?.extra?.mapboxToken || "";

  const mapUrl = `${API_BASE}/v1/maps/map.html?mode=${mode}&apiBase=${encodeURIComponent(
    API_BASE
  )}&token=${encodeURIComponent(mapboxToken)}`;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "POINT_TAP" && onPointTap) {
        onPointTap(msg.data);
      }
    } catch {}
  };

  const WebViewComponent = WebView as any;

  return (
    <View style={styles.container}>
      <WebViewComponent
        ref={webViewRef}
        source={{ uri: mapUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onMessage={handleMessage}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.loadingText}>Initializing Mapbox Engine...</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Map Offline</Text>
            <Text style={styles.errorSubtitle}>
              Connect to laptop LAN at {API_BASE} to stream map tiles
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
    backgroundColor: "#0F172A",
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
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  errorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "700",
  },
  errorSubtitle: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
  },
});
