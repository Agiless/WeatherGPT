/**
 * Screen 4 — Voice Input Screen
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
      const uri = await stopRecording();
      // Navigate to loading query with voice simulated/transcribed text
      navigation.replace("Loading", {
        queryText: "Will it rain tomorrow in my village? Need harvest advisory.",
        personaType: "farmer",
      });
    } else {
      const ok = await startRecording();
      if (ok) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
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
          <Ionicons name="close" size={24} color="#94A3B8" />
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
              size={48}
              color={isRecording ? "#EF4444" : "#0F172A"}
            />
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.promptText}>
          {isRecording ? "Listening... Tap to finish" : "Tap to speak your weather question"}
        </Text>
        <Text style={styles.subtext}>
          Speak in Tamil, Hindi, English, or your local regional dialect
        </Text>
      </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  centerBox: {
    alignItems: "center",
    marginBottom: 100,
  },
  micOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(96, 165, 250, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#60A5FA",
    justifyContent: "center",
    alignItems: "center",
  },
  micBtnActive: {
    backgroundColor: "#FEE2E2",
  },
  promptText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F1F5F9",
    marginBottom: 8,
    textAlign: "center",
  },
  subtext: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 260,
  },
});
