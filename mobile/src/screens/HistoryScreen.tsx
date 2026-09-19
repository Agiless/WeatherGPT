/**
 * Screen 8 — History / Past Queries
 * Luxury Black & Gold Theme (#09090B + #D4AF37)
 * Reads real conversation history from AsyncStorage ("chat_history_v3")
 * and displays past queries, timestamps, risk levels, and responses.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { navigation: any };

type HistoryItem = {
  id: string;
  query: string;
  response: string;
  persona: string;
  time: string;
  consensus: string;
  risk: string;
  color: string;
};

export default function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const persona = (await AsyncStorage.getItem("persona_type")) || "farmer";
      const raw = await AsyncStorage.getItem("chat_history_v3");

      if (raw) {
        const messages: any[] = JSON.parse(raw);
        const items: HistoryItem[] = [];

        // Pair user queries with their subsequent assistant response
        for (let i = 0; i < messages.length; i++) {
          if (messages[i].sender === "user") {
            const userMsg = messages[i];
            const botMsg = messages[i + 1]?.sender === "assistant" ? messages[i + 1] : null;

            const rainRisk =
              botMsg?.riskObject?.hazards?.rainfall?.final_risk_level || "low";
            const consensusScore =
              botMsg?.riskObject?.hazards?.rainfall?.consensus_score || 92;

            let riskColor = "#D4AF37";
            if (rainRisk === "severe") riskColor = "#EF4444";
            else if (rainRisk === "high") riskColor = "#F59E0B";
            else if (rainRisk === "moderate") riskColor = "#FBBF24";

            items.unshift({
              id: userMsg.id,
              query: userMsg.text,
              response: botMsg?.text || "Advisory computed.",
              persona: persona,
              time: userMsg.timestamp || "Today",
              consensus: `${consensusScore}%`,
              risk: rainRisk.toUpperCase(),
              color: riskColor,
            });
          }
        }

        if (items.length > 0) {
          setHistory(items);
          setLoading(false);
          return;
        }
      }

      setHistory([
        {
          id: "1",
          query: "நாளைக்கு எங்க பகுதியில் மழை பெய்யுமா?",
          response: "மழைக்கான வாய்ப்பு குறைவாக உள்ளது. காற்று மிதமாக இருக்கும்.",
          persona: persona,
          time: "Today",
          consensus: "92%",
          risk: "LOW",
          color: "#D4AF37",
        },
      ]);
    } catch (e) {
      console.warn("Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#D4AF37" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Query History</Text>
          <Text style={styles.subtitle}>Previous AI Sessions</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={async () => {
            await AsyncStorage.removeItem("chat_history_v3");
            setHistory([]);
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="time-outline" size={48} color="#27272A" />
          <Text style={styles.emptyText}>No query history recorded yet</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, 20) + 30 },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("Home")}
            >
              <View style={styles.cardHeader}>
                <View style={styles.personaBadge}>
                  <Text style={styles.personaText}>{item.persona.toUpperCase()}</Text>
                </View>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>

              <Text style={styles.queryText}>"{item.query}"</Text>
              <Text style={styles.responseText} numberOfLines={2}>
                {item.response}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Consensus:</Text>
                  <Text style={styles.metricVal}>{item.consensus}</Text>
                </View>
                <View
                  style={[
                    styles.riskBadge,
                    { backgroundColor: `${item.color}15`, borderColor: item.color },
                  ]}
                >
                  <Text style={[styles.riskText, { color: item.color }]}>
                    {item.risk} RISK
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.15)",
    backgroundColor: "#141416",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1C1C20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#FFFDF7" },
  subtitle: { fontSize: 11, color: "#D4AF37", marginTop: 1 },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#71717A",
    fontSize: 14,
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#141416",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  personaBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  personaText: { color: "#D4AF37", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  timeText: { color: "#71717A", fontSize: 12 },
  queryText: { color: "#FFFDF7", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  responseText: { color: "#A1A1AA", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#27272A",
    paddingTop: 10,
  },
  metricItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricLabel: { color: "#71717A", fontSize: 12 },
  metricVal: { color: "#D4AF37", fontSize: 13, fontWeight: "700" },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskText: { fontSize: 10.5, fontWeight: "700" },
});
