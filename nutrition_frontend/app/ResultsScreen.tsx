import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { AssessmentResults } from "../types";
import { API_URL } from "../types/constants";
import {
  requestNotificationPermission,
  scheduleDietNotifications,
  scheduleTestNotifications,
  cancelAllDietNotifications,
} from "../services/notificationService";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  results: AssessmentResults;
  onBack: () => void;
}

export default function ResultsScreen({ results, onBack }: Props) {
  const { user } = useAuth();

  const USER_ID = user?.user_id;

  const risk = results.health_risk.risk_info;
  const diet = results.diet_recommendation;
  const overall = results.overall_assessment;
  const alerts = overall?.critical_alerts || [];

  const hasSaved = useRef(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // ── Auto-save principles on mount ────────────────────────────
  useEffect(() => {
    if (!hasSaved.current) {
      hasSaved.current = true;
      saveDietPrinciples();
    }
  }, []);

  const saveDietPrinciples = async () => {
    try {
      const principles = diet.diet_info?.principles || [];
      if (principles.length === 0) return;
      const res = await fetch(`${API_URL}/api/diet-principles/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: USER_ID,
          dietName: diet.recommended_diet,
          principles,
        }),
      });
      const data = await res.json();
      if (data.success) console.log("✓ Diet principles saved");
    } catch (e) {
      console.error("Error saving diet principles:", e);
    }
  };

  // ── Enable daily notifications ────────────────────────────────
  const handleScheduleNotifications = async () => {
    setNotifLoading(true);
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings.",
        );
        return;
      }
      await scheduleDietNotifications(
        diet.recommended_diet,
        diet.diet_info?.principles || [],
      );
      setNotifEnabled(true);
      Alert.alert(
        "Notifications Scheduled!",
        "You'll receive diet reminders:\n\n🌅 7:30 AM — Before Breakfast\n☀️ 11:30 AM — Before Lunch\n🌙 6:30 PM — Before Dinner",
      );
    } catch (e) {
      Alert.alert("Error", "Failed to schedule notifications.");
    } finally {
      setNotifLoading(false);
    }
  };

  // ── Test notifications (3 min apart) ─────────────────────────
  const handleTestNotifications = async () => {
    setTestLoading(true);
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings.",
        );
        return;
      }
      await scheduleTestNotifications(
        diet.recommended_diet,
        diet.diet_info?.principles || [],
      );
      Alert.alert(
        "🧪 Test Notifications Scheduled!",
        "3 notifications will arrive:\n\n⏱ In 3 min — Principle 1\n⏱ In 6 min — Principle 2\n⏱ In 9 min — Principle 3\n\nKeep app in background.",
      );
    } catch (e) {
      Alert.alert("Error", "Failed to schedule test notifications.");
    } finally {
      setTestLoading(false);
    }
  };

  const handleCancelNotifications = async () => {
    await cancelAllDietNotifications();
    setNotifEnabled(false);
    Alert.alert("🔕 Cancelled", "All diet notifications cancelled.");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>YOUR RESULTS</Text>
      <View style={styles.headerDivider} />

      {/* Overall */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 HEALTH ASSESSMENT</Text>
        <Text style={styles.summaryText}>{overall.summary}</Text>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>{overall.priority}</Text>
        </View>
        <Text style={styles.timelineText}>⏳ {overall.timeline}</Text>
      </View>

      {/* Risk */}
      <View style={[styles.card, styles.riskCard]}>
        <Text style={styles.cardTitle}>{risk.icon} Health Risk Status</Text>
        <Text style={styles.riskText}>You have : {risk.level}</Text>
        <Text style={styles.riskMessage}>{risk.message}</Text>
        <View style={styles.alertBox}>
          {alerts.length === 0 ? (
            <Text style={styles.noAlert}>✅ No critical health alerts</Text>
          ) : (
            alerts.map((alert, i) => (
              <View key={i} style={styles.alertItem}>
                <Text style={styles.alertType}>
                  {alert.icon} {alert.type}
                </Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertAction}>{alert.action}</Text>
              </View>
            ))
          )}
        </View>
        <Text style={styles.urgency}>⏰ {risk.urgency}</Text>
        <View style={styles.actionsBox}>
          <Text style={styles.actionsTitle}>🎯 Immediate Actions</Text>
          {risk.actions.slice(0, 3).map((action, i) => (
            <View key={i} style={styles.actionRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Diet */}
      <View style={[styles.card, styles.dietCard]}>
        <Text style={styles.cardTitle}>🥗 AI Recommended Diet Plan</Text>
        <Text style={styles.dietTitle}>{diet.recommended_diet} Diet</Text>
        <Text style={styles.dietDesc}>{diet.diet_info?.description}</Text>

        {/* Principles with numbered index */}
        <View style={styles.infoBox}>
          <View style={styles.infoTitleRow}>
            <Text style={styles.infoTitle}>💪 Key Principles</Text>
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>✓ Saved</Text>
            </View>
          </View>
          {diet.diet_info?.principles?.map((p, i) => (
            <View key={i} style={styles.principleRow}>
              <View style={styles.principleIndex}>
                <Text style={styles.principleIndexText}>{i + 1}</Text>
              </View>
              <Text style={styles.infoText}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.infoBox, { marginTop: 10 }]}>
          <Text style={styles.infoTitle}>⚡ Benefits</Text>
          {diet.diet_info?.benefits?.map((b, i) => (
            <View key={i} style={styles.actionRow}>
              <Text style={styles.greenBullet}>•</Text>
              <Text style={styles.infoText}>{b}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Notification Card ── */}
      <View style={styles.notifCard}>
        <Text style={styles.notifTitle}>🔔 Diet Reminders</Text>
        <Text style={styles.notifSubtitle}>
          Get notified before each meal with your diet principles
        </Text>

        {/* Daily reminders button */}
        <TouchableOpacity
          style={[styles.notifBtn, notifEnabled && styles.notifBtnActive]}
          onPress={handleScheduleNotifications}
          disabled={notifLoading}
        >
          {notifLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.notifBtnText}>
              {notifEnabled
                ? "✓ Daily Reminders Active"
                : "🔔 Enable Daily Reminders"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Test button */}
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestNotifications}
          disabled={testLoading}
        >
          {testLoading ? (
            <ActivityIndicator color="#059669" size="small" />
          ) : (
            <Text style={styles.testBtnText}>
              🧪 Test (3 notifications × 3 min apart)
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel button */}
        {notifEnabled && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelNotifications}
          >
            <Text style={styles.cancelBtnText}>🔕 Cancel All Reminders</Text>
          </TouchableOpacity>
        )}

        {/* Schedule preview */}
        <View style={styles.schedulePreview}>
          <Text style={styles.scheduleTitle}>Daily Schedule:</Text>
          {[
            {
              time: "7:30 AM",
              label: "Before Breakfast 🌅",
              principle: diet.diet_info?.principles?.[0],
            },
            {
              time: "11:30 AM",
              label: "Before Lunch ☀️",
              principle: diet.diet_info?.principles?.[1],
            },
            {
              time: "6:30 PM",
              label: "Before Dinner 🌙",
              principle: diet.diet_info?.principles?.[2],
            },
          ].map((item, i) => (
            <View key={i} style={styles.scheduleRow}>
              <Text style={styles.scheduleTime}>{item.time}</Text>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleLabel}>{item.label}</Text>
                <Text style={styles.schedulePrinciple} numberOfLines={2}>
                  {item.principle || "—"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Key Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Key Actions</Text>
        {overall.key_actions?.map((action, i) => (
          <View key={i} style={styles.actionRow}>
            <Text style={styles.bullet}>{i + 1}.</Text>
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>← New Assessment</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F7F5",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: "900",
    color: "#065f46",
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 20,
  },
  headerDivider: {
    height: 4,
    width: 80,
    backgroundColor: "#059669",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  riskCard: { borderLeftWidth: 6, borderLeftColor: "#f97316" },
  dietCard: { borderWidth: 1, borderColor: "#bbf7d0" },

  riskText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#06a87a",
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 14,
  },
  priorityBadge: {
    backgroundColor: "#059669",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  priorityText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
  },
  timelineText: { color: "#6b7280", fontSize: 13, marginTop: 10 },
  riskMessage: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 14,
    lineHeight: 20,
  },

  alertBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  noAlert: { color: "#374151", fontSize: 14 },
  alertItem: { marginBottom: 10 },
  alertType: { fontWeight: "700", color: "#f97316", fontSize: 14 },
  alertMessage: { color: "#4b5563", fontSize: 13, marginTop: 2 },
  alertAction: {
    color: "#6b7280",
    fontStyle: "italic",
    fontSize: 12,
    marginTop: 2,
  },
  urgency: {
    color: "#f97316",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 14,
  },

  actionsBox: { backgroundColor: "#f3f4f6", borderRadius: 12, padding: 14 },
  actionsTitle: {
    fontWeight: "700",
    color: "#f97316",
    fontSize: 15,
    marginBottom: 10,
  },
  actionRow: { flexDirection: "row", marginBottom: 6 },
  bullet: {
    color: "#f97316",
    fontWeight: "800",
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  actionText: { flex: 1, color: "#374151", fontSize: 14, lineHeight: 20 },

  dietTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#059669",
    marginBottom: 8,
  },
  dietDesc: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 14,
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  confidenceLabel: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  confidenceValue: { fontSize: 13, color: "#059669", fontWeight: "700" },
  confidenceBar: {
    height: 8,
    backgroundColor: "#d1fae5",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  confidenceFill: { height: 8, backgroundColor: "#059669", borderRadius: 4 },

  infoBox: { backgroundColor: "#f3f4f6", borderRadius: 12, padding: 14 },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoTitle: { fontWeight: "700", color: "#059669", fontSize: 15 },
  savedBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savedBadgeText: { fontSize: 10, color: "#166534", fontWeight: "700" },
  principleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  principleIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  principleIndexText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  greenBullet: {
    color: "#059669",
    fontWeight: "800",
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  infoText: { flex: 1, color: "#374151", fontSize: 14, lineHeight: 20 },

  notifCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#6ee7b7",
    shadowColor: "#059669",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  notifTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 4,
  },
  notifSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 18,
  },
  notifBtn: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  notifBtnActive: { backgroundColor: "#047857" },
  notifBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  testBtn: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#6ee7b7",
  },
  testBtnText: { color: "#059669", fontWeight: "700", fontSize: 14 },
  cancelBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  cancelBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },

  schedulePreview: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  scheduleTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065f46",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
    width: 72,
    marginTop: 2,
  },
  scheduleInfo: { flex: 1 },
  scheduleLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  schedulePrinciple: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    lineHeight: 16,
  },

  backBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#059669",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  backBtnText: { color: "#059669", fontWeight: "800", fontSize: 17 },
});
