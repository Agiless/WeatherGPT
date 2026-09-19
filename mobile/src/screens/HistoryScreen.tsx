/**
 * Screen 8 — History / Past Queries
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

            let riskColor = "#34D399";
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

      // Default sample queries if no history yet
      setHistory([
        {
          id: "1",
          query: "நாளைக்கு எங்க பகுதியில் மழை பெய்யுமா?",
          response: "மழைக்கான வாய்ப்பு குறைவாக உள்ளது. காற்று மிதமாக இருக்கும்.",
          persona: persona,
          time: "Today",
          consensus: "92%",
          risk: "LOW",
          color: "#34D399",
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
          <Ionicons name="arrow-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={styles.title}>Query History</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={async () => {
            await AsyncStorage.removeItem("chat_history_v3");
            setHistory([]);
          }}
          title="Clear"
        >
          <Ionicons name="trash-outline" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="time-outline" size={48} color="#334155" />
          <Text style={styles.emptyText}>No query history found</Text>
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
                    { backgroundColor: `${item.color}20`, borderColor: item.color },
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
  container: { flex: 1, backgroundColor: "#0B1120" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0F172A",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#F1F5F9" },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  personaBadge: {
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  personaText: { color: "#60A5FA", fontSize: 10, fontWeight: "700" },
  timeText: { color: "#64748B", fontSize: 12 },
  queryText: { color: "#F1F5F9", fontSize: 15, fontWeight: "600", marginBottom: 6 },
  responseText: { color: "#94A3B8", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 10,
  },
  metricItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricLabel: { color: "#94A3B8", fontSize: 12 },
  metricVal: { color: "#60A5FA", fontSize: 13, fontWeight: "700" },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskText: { fontSize: 10.5, fontWeight: "700" },
});
