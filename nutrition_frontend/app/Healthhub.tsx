import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";

import { API_URL } from "../types/constants";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────

interface Statistics {
  total_records: number;
  weight_change: number;
  avg_glucose: number;
  avg_cholesterol: number;
  current_risk: string;
}

interface Summary {
  latest_date: string;
  weight: { current: number; bmi: number; trend: number };
  glucose: { current: number; trend: number; status: string };
  cholesterol: { current: number; trend: number; status: string };
  risk_level: { current: string; recommended_diet: string };
}

interface HealthOption {
  emoji: string;
  title: string;
  desc: string;
  route: string;
  color: string;
  bgColor: string;
  border: string;
}

const OPTIONS: HealthOption[] = [
  {
    emoji: "👤",
    title: "Health Profile",
    desc: "Set up your basic info — age, gender, profession, lifestyle habits",
    route: "/Patientprofilescreen",
    color: "#065f46",
    bgColor: "#ecfdf5",
    border: "#6ee7b7",
  },
  {
    emoji: "⚡",
    title: "Health Assessment",
    desc: "Get AI-powered risk analysis and personalized diet recommendations",
    route: "/AssessmentScreen",
    color: "#92400e",
    bgColor: "#fffbeb",
    border: "#fcd34d",
  },
  {
    emoji: "📊",
    title: "Health Analytics",
    desc: "Track your health metrics, trends and progress over time",
    route: "/HealthAnalytics",
    color: "#1e40af",
    bgColor: "#eff6ff",
    border: "#93c5fd",
  },
];

// ── Stat Item ─────────────────────────────────────────────────────

const StatItem = ({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) => (
  <View style={styles.statItem}>
    <Text style={[styles.statBigNum, { color }]}>{value ?? "—"}</Text>
    <Text style={styles.statItemLabel}>{label}</Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────

export default function HealthHub() {
  const { user } = useAuth();

  const USER_ID = user?.user_id;

  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setStatsLoading(true);
    try {
      // Fetch both analytics and summary in parallel
      const [analyticsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/${USER_ID}?period=month`),
        fetch(`${API_URL}/api/analytics/${USER_ID}/summary`),
      ]);

      const analyticsData = await analyticsRes.json();
      const summaryData = await summaryRes.json();

      if (analyticsData.success) setStatistics(analyticsData.statistics);
      if (summaryData.success) setSummary(summaryData.summary);
    } catch (e) {
      console.log("Failed to fetch health data:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const getRiskColor = (level?: string) => {
    if (!level) return "#6b7280";
    if (level === "Low") return "#059669";
    if (level === "Medium") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Health</Text>
        <Text style={styles.headerSub}>Manage your health journey</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Stats Summary ── */}
        <Text style={styles.sectionLabel}>YOUR HEALTH SNAPSHOT</Text>

        {statsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#059669" />
            <Text style={styles.loadingText}>Loading health data...</Text>
          </View>
        ) : statistics ? (
          <>
            {/* Current Status Row */}
            {summary && (
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusChip,
                    { borderColor: getRiskColor(summary.risk_level.current) },
                  ]}
                >
                  <Text style={styles.statusChipLabel}>Risk Level</Text>
                  <Text
                    style={[
                      styles.statusChipValue,
                      { color: getRiskColor(summary.risk_level.current) },
                    ]}
                  >
                    {summary.risk_level.current || "—"}
                  </Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipLabel}>BMI</Text>
                  <Text style={styles.statusChipValue}>
                    {summary.weight.bmi ?? "—"}
                  </Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipLabel}>Diet</Text>
                  <Text
                    style={[styles.statusChipValue, { fontSize: 11 }]}
                    numberOfLines={1}
                  >
                    {summary.risk_level.recommended_diet || "—"}
                  </Text>
                </View>
              </View>
            )}

            {/* Statistics Card */}
            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>
                📈 Statistics Summary for this month
              </Text>
              <View style={styles.statsGrid}>
                <StatItem
                  value={statistics.total_records}
                  label="Total Records"
                  color="#3b82f6"
                />
                <StatItem
                  value={statistics.weight_change}
                  label="Weight Change (kg)"
                  color="#059669"
                />
                <StatItem
                  value={statistics.avg_glucose}
                  label="Avg Glucose"
                  color="#ef4444"
                />
                <StatItem
                  value={statistics.avg_cholesterol}
                  label="Avg Cholesterol"
                  color="#f97316"
                />
              </View>
            </View>
          </>
        ) : (
          /* No data yet */
          <View style={styles.noDataBox}>
            <Text style={styles.noDataEmoji}>📋</Text>
            <Text style={styles.noDataTitle}>No health data yet</Text>
            <Text style={styles.noDataDesc}>
              Complete your first assessment to see your health statistics here.
            </Text>
          </View>
        )}

        {/* ── Health Features ── */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
          HEALTH FEATURES
        </Text>

        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.route}
            style={[styles.card, { borderColor: opt.border }]}
            onPress={() => router.push(opt.route as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.iconBox, { backgroundColor: opt.bgColor }]}>
              <Text style={styles.iconEmoji}>{opt.emoji}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: opt.color }]}>
                {opt.title}
              </Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>
            </View>
            <Text style={[styles.arrow, { color: opt.color }]}>→</Text>
          </TouchableOpacity>
        ))}

        {/* Tip box */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 Recommended flow</Text>
          <View style={styles.tipSteps}>
            {[
              "1. Complete your Health Profile first",
              "2. Run a Health Assessment",
              "3. Track progress in Analytics",
            ].map((step, i) => (
              <Text key={i} style={styles.tipStep}>
                {step}
              </Text>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F7F5" },

  header: {
    backgroundColor: "#065f46",
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: "#a7f3d0", fontSize: 15, fontWeight: "600" },
  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSub: { fontSize: 14, color: "#6ee7b7", marginTop: 4 },

  scroll: { flex: 1 },
  content: { padding: 20 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Loading / no data
  loadingBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  loadingText: { color: "#6b7280", fontSize: 13 },
  noDataBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  noDataEmoji: { fontSize: 40, marginBottom: 8 },
  noDataTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 4,
  },
  noDataDesc: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
  },

  // Status chips
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statusChip: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#d1fae5",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusChipLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusChipValue: { fontSize: 14, fontWeight: "800", color: "#374151" },

  // Statistics card
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1fae5",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 16,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statItem: {
    width: "46%",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
  },
  statBigNum: { fontSize: 28, fontWeight: "900", marginBottom: 4 },
  statItemLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "600",
  },

  // Feature cards
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconEmoji: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  arrow: { fontSize: 20, fontWeight: "700", marginLeft: 8 },

  // Tip box
  tipBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#6ee7b7",
    marginTop: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 10,
  },
  tipSteps: { gap: 6 },
  tipStep: { fontSize: 13, color: "#374151", lineHeight: 20 },
});
