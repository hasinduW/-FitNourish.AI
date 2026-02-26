import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";

import { API_URL } from "../types/constants";

const SCREEN_WIDTH = Dimensions.get("window").width - 40;

// ── Types ─────────────────────────────────────────────────────────

interface WeightPoint {
  date: string;
  value: number;
  bmi: number;
}
interface ValuePoint {
  date: string;
  value: number;
}
interface RiskPoint {
  date: string;
  level: string;
  score: number;
}

interface Graphs {
  weight: WeightPoint[];
  glucose: ValuePoint[];
  cholesterol: ValuePoint[];
  calories: ValuePoint[];
  bloodPressure: ValuePoint[];
  riskLevel: RiskPoint[];
}

interface Statistics {
  total_records: number;
  weight_change: number;
  avg_glucose: number;
  avg_cholesterol: number;
  current_risk: string;
}

interface AnalyticsData {
  success: boolean;
  period: string;
  graphs: Graphs;
  statistics: Statistics;
}

interface SummaryWeight {
  current: number;
  bmi: number;
  trend: number;
}
interface SummaryMetric {
  current: number;
  trend: number;
  status: string;
}
interface SummaryRisk {
  current: string;
  recommended_diet: string;
}
interface SummaryLifestyle {
  exercise_hours: number;
  sleep_hours: number;
  daily_calories: number;
}

interface Summary {
  latest_date: string;
  weight: SummaryWeight;
  glucose: SummaryMetric;
  cholesterol: SummaryMetric;
  blood_pressure: { current: number; status: string };
  risk_level: SummaryRisk;
  lifestyle: SummaryLifestyle;
}

const PERIODS = [
  { label: "Week", value: "week" },
  { label: "30 Days", value: "month" },
  { label: "3 Months", value: "3months" },
  { label: "6 Months", value: "6months" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
];

const CHART_CONFIG = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: "4", strokeWidth: "2", stroke: "#059669" },
};

// ── Sub-components ────────────────────────────────────────────────

const StatCard = ({
  title,
  value,
  unit,
  trend,
  icon,
  status,
}: {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon: string;
  status?: string;
}) => {
  const getRiskStyle = (level?: string) => {
    if (!level) return styles.badgeGray;
    if (level === "Low" || level === "Normal" || level === "Optimal")
      return styles.badgeGreen;
    if (level === "Medium" || level === "Borderline") return styles.badgeYellow;
    return styles.badgeRed;
  };

  return (
    <View style={styles.statCard}>
      <View style={styles.statIconBox}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>
          {value ?? "—"}
          {unit ? ` ${unit}` : ""}
        </Text>
        {status && (
          <View style={[styles.badge, getRiskStyle(status)]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        )}
      </View>
      {trend !== undefined && trend !== 0 && (
        <Text
          style={[styles.trend, trend > 0 ? styles.trendUp : styles.trendDown]}
        >
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}
        </Text>
      )}
    </View>
  );
};

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>{title}</Text>
    {children}
  </View>
);

const buildLineData = (points: ValuePoint[], label: string, color: string) => ({
  labels: points.map((p) => p.date.slice(5)), // show MM-DD
  datasets: [
    { data: points.map((p) => p.value), color: () => color, strokeWidth: 2 },
  ],
  legend: [label],
});

const buildBarData = (points: ValuePoint[], label: string) => ({
  labels: points.map((p) => p.date.slice(5)),
  datasets: [{ data: points.map((p) => p.value) }],
  legend: [label],
});

// ── Main Component ────────────────────────────────────────────────

export default function HealthAnalytics() {
  const userId = "1";
  const [period, setPeriod] = useState("month");
  const [analyticsData, setAnalytics] = useState<AnalyticsData | null>(null);
  const [summaryData, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    fetchSummary();
  }, [userId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/analytics/${userId}?period=${period}`,
      );
      const data = await res.json();
      if (data.success) setAnalytics(data);
      else setError(data.error);
    } catch (e) {
      setError("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/${userId}/summary`);
      const data = await res.json();
      if (data.success) setSummary(data.summary);
    } catch (e) {
      console.error("Failed to fetch summary:", e);
    }
  };

  if (loading && !analyticsData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading your health data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.header}>Health Analytics</Text>
      <Text style={styles.subHeader}>Track your health metrics over time</Text>

      {/* Period Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodRow}
      >
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            onPress={() => setPeriod(p.value)}
            style={[
              styles.periodBtn,
              period === p.value && styles.periodBtnActive,
            ]}
          >
            <Text
              style={[
                styles.periodText,
                period === p.value && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Summary Cards */}
      {summaryData && (
        <View style={styles.statsGrid}>
          <StatCard
            title="Weight"
            value={summaryData.weight.current}
            unit="kg"
            trend={summaryData.weight.trend}
            icon="⚖️"
            status={`BMI: ${summaryData.weight.bmi}`}
          />
          <StatCard
            title="Blood Glucose"
            value={summaryData.glucose.current}
            unit="mg/dL"
            trend={summaryData.glucose.trend}
            icon="💧"
            status={summaryData.glucose.status}
          />
          <StatCard
            title="Cholesterol"
            value={summaryData.cholesterol.current}
            unit="mg/dL"
            trend={summaryData.cholesterol.trend}
            icon="❤️"
            status={summaryData.cholesterol.status}
          />
          <StatCard
            title="Risk Level"
            value={summaryData.risk_level.current ?? "—"}
            icon="📊"
            status={summaryData.risk_level.current}
          />
        </View>
      )}

      {/* Charts */}
      {analyticsData?.graphs && (
        <View>
          {/* Weight */}
          {analyticsData.graphs.weight.length > 0 && (
            <ChartCard title="Weight Trend">
              <LineChart
                data={buildLineData(
                  analyticsData.graphs.weight,
                  "Weight (kg)",
                  "#3b82f6",
                )}
                width={SCREEN_WIDTH}
                height={220}
                chartConfig={{
                  ...CHART_CONFIG,
                  color: (o = 1) => `rgba(59,130,246,${o})`,
                }}
                bezier
                style={styles.chart}
              />
            </ChartCard>
          )}

          {/* Glucose */}
          {analyticsData.graphs.glucose.length > 0 && (
            <ChartCard title="Blood Glucose Levels">
              <LineChart
                data={buildLineData(
                  analyticsData.graphs.glucose,
                  "Glucose (mg/dL)",
                  "#ef4444",
                )}
                width={SCREEN_WIDTH}
                height={220}
                chartConfig={{
                  ...CHART_CONFIG,
                  color: (o = 1) => `rgba(239,68,68,${o})`,
                }}
                bezier
                style={styles.chart}
              />
            </ChartCard>
          )}

          {/* Cholesterol */}
          {analyticsData.graphs.cholesterol.length > 0 && (
            <ChartCard title="Cholesterol Levels">
              <LineChart
                data={buildLineData(
                  analyticsData.graphs.cholesterol,
                  "Cholesterol (mg/dL)",
                  "#f59e0b",
                )}
                width={SCREEN_WIDTH}
                height={220}
                chartConfig={{
                  ...CHART_CONFIG,
                  color: (o = 1) => `rgba(245,158,11,${o})`,
                }}
                bezier
                style={styles.chart}
              />
            </ChartCard>
          )}

          {/* Calories */}
          {analyticsData.graphs.calories.length > 0 && (
            <ChartCard title="Daily Calorie Intake">
              <BarChart
                data={buildBarData(analyticsData.graphs.calories, "Calories")}
                width={SCREEN_WIDTH}
                height={220}
                chartConfig={{
                  ...CHART_CONFIG,
                  color: (o = 1) => `rgba(139,92,246,${o})`,
                }}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </ChartCard>
          )}

          {/* Blood Pressure */}
          {analyticsData.graphs.bloodPressure.length > 0 && (
            <ChartCard title="Blood Pressure">
              <BarChart
                data={buildBarData(analyticsData.graphs.bloodPressure, "BP")}
                width={SCREEN_WIDTH}
                height={220}
                chartConfig={{
                  ...CHART_CONFIG,
                  color: (o = 1) => `rgba(6,182,212,${o})`,
                }}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </ChartCard>
          )}

          {/* Risk Level */}
          {analyticsData.graphs.riskLevel.length > 0 && (
            <ChartCard title="Risk Level Over Time">
              {analyticsData.graphs.riskLevel.map((item, idx) => {
                const bg =
                  item.level === "Low"
                    ? "#dcfce7"
                    : item.level === "Medium"
                      ? "#fef9c3"
                      : "#fee2e2";
                const fg =
                  item.level === "Low"
                    ? "#166534"
                    : item.level === "Medium"
                      ? "#854d0e"
                      : "#991b1b";
                return (
                  <View key={idx} style={styles.riskRow}>
                    <Text style={styles.riskDate}>{item.date}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: bg }]}>
                      <Text style={[styles.riskBadgeText, { color: fg }]}>
                        {item.level}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ChartCard>
          )}
        </View>
      )}

      {/* Statistics Summary */}
      {analyticsData?.statistics && (
        <View style={styles.statsCard}>
          <Text style={styles.statsCardTitle}>Statistics Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statBigNum, { color: "#3b82f6" }]}>
                {analyticsData.statistics.total_records}
              </Text>
              <Text style={styles.statItemLabel}>Total Records</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statBigNum, { color: "#059669" }]}>
                {analyticsData.statistics.weight_change}
              </Text>
              <Text style={styles.statItemLabel}>Weight Change (kg)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statBigNum, { color: "#ef4444" }]}>
                {analyticsData.statistics.avg_glucose}
              </Text>
              <Text style={styles.statItemLabel}>Avg Glucose</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statBigNum, { color: "#f97316" }]}>
                {analyticsData.statistics.avg_cholesterol}
              </Text>
              <Text style={styles.statItemLabel}>Avg Cholesterol</Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  content: { padding: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
  },
  loadingText: { marginTop: 12, color: "#059669", fontSize: 15 },

  header: {
    fontSize: 28,
    fontWeight: "900",
    color: "#065f46",
    marginBottom: 4,
  },
  subHeader: { fontSize: 14, color: "#6b7280", marginBottom: 16 },

  periodRow: { flexDirection: "row", marginBottom: 16 },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#d1fae5",
  },
  periodBtnActive: { backgroundColor: "#059669", borderColor: "#059669" },
  periodText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  periodTextActive: { color: "#fff" },

  errorBox: {
    backgroundColor: "#fee2e2",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: "#991b1b", fontSize: 14 },

  statsGrid: { gap: 12, marginBottom: 16 },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    padding: 10,
    marginRight: 12,
  },
  statIcon: { fontSize: 22 },
  statContent: { flex: 1 },
  statTitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  trend: { fontSize: 14, fontWeight: "700", marginLeft: 8 },
  trendUp: { color: "#ef4444" },
  trendDown: { color: "#059669" },

  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeYellow: { backgroundColor: "#fef9c3" },
  badgeRed: { backgroundColor: "#fee2e2" },
  badgeGray: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#374151" },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 12,
  },
  chart: { borderRadius: 12 },

  riskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  riskDate: { fontSize: 13, color: "#6b7280" },
  riskBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  riskBadgeText: { fontSize: 12, fontWeight: "700" },

  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 16,
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statItem: {
    flex: 1,
    minWidth: "40%",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  statBigNum: { fontSize: 28, fontWeight: "900" },
  statItemLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
});
