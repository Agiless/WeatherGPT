/**
 * Screen 8 — History / Past Queries
 * Displays previous weather queries, consensus scores, and timestamps.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { navigation: any };

const MOCK_HISTORY = [
  {
    id: "1",
    query: "Rain forecast for Madurai harvest",
    persona: "farmer",
    time: "Today, 10:15 AM",
    consensus: "88%",
    risk: "Moderate",
    color: "#F59E0B",
  },
  {
    id: "2",
    query: "Wind speed and swell near Rameswaram coast",
    persona: "fisherman",
    time: "Yesterday, 4:30 PM",
    consensus: "94%",
    risk: "Low",
    color: "#10B981",
  },
  {
    id: "3",
    query: "Chennai corridor precipitation deltas",
    persona: "logistics",
    time: "Sep 1, 2:00 PM",
    consensus: "91%",
    risk: "Moderate",
    color: "#F59E0B",
  },
];

export default function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [history] = useState(MOCK_HISTORY);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={styles.title}>Query History</Text>
        <View style={{ width: 38 }} />
      </View>

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
            onPress={() => {
              navigation.navigate("Loading", {
                queryText: item.query,
                personaType: item.persona,
              });
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.personaBadge}>
                <Text style={styles.personaText}>{item.persona.toUpperCase()}</Text>
              </View>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>

            <Text style={styles.queryText}>"{item.query}"</Text>

            <View style={styles.cardFooter}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Consensus:</Text>
                <Text style={styles.metricVal}>{item.consensus}</Text>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: `${item.color}20` }]}>
                <Text style={[styles.riskText, { color: item.color }]}>{item.risk} Risk</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#F1F5F9" },
  list: { padding: 20, gap: 14 },
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
  queryText: { color: "#F1F5F9", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricLabel: { color: "#94A3B8", fontSize: 12 },
  metricVal: { color: "#60A5FA", fontSize: 13, fontWeight: "700" },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 11, fontWeight: "700" },
});
