/**
 * Screen 4 — Voice Input Screen
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
 * Records audio query using expo-audio, shows pulse waveform animation,
 * and passes the question to the query engine.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecorder } from "../voice/useRecorder";

type Props = { navigation: any };

export default function VoiceInputScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isRecording, startRecording, stopRecording } = useRecorder();
  const [pulseAnim] = useState(new Animated.Value(1));

  const handleToggleRecord = async () => {
    if (isRecording) {
      await stopRecording();
      navigation.replace("Loading", {
        queryText: "Will it rain tomorrow in my area? Need advisory.",
        personaType: "farmer",
      });
    } else {
      const ok = await startRecording();
      if (ok) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          {
            paddingTop: Math.max(insets.top, 20) + 12,
            paddingBottom: Math.max(insets.bottom, 20) + 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#D4AF37" />
        </TouchableOpacity>

        <View style={styles.centerBox}>
          <Animated.View
            style={[
              styles.micOuter,
              isRecording && { transform: [{ scale: pulseAnim }], borderColor: "#EF4444" },
            ]}
          >
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={handleToggleRecord}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={44}
                color={isRecording ? "#FFFFFF" : "#09090B"}
              />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.promptText}>
            {isRecording ? "Listening... Tap to finish" : "Tap microphone to speak"}
          </Text>
          <Text style={styles.subtext}>
            WeatherGPT understands Tamil, Hindi, Telugu, and English weather queries
          </Text>
        </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  centerBox: {
    alignItems: "center",
    marginBottom: 80,
  },
  micOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(212, 175, 55, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  micBtnActive: {
    backgroundColor: "#EF4444",
  },
  promptText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFDF7",
    marginBottom: 8,
    textAlign: "center",
  },
  subtext: {
    fontSize: 13,
    color: "#A1A1AA",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
});
