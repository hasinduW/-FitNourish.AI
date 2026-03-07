import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#065f46" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good day! 👋</Text>
            <Text style={styles.headerTitle}>FitNourish.AI</Text>
            <Text style={styles.headerSub}>
              {user ? (user.first_name ? `${user.first_name}` : user.username) : "Your personal health companion"}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} hitSlop={12}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Cards */}
        <Text style={styles.sectionLabel}>WHAT WOULD YOU LIKE TO DO?</Text>

        {/* Meal Generation Card */}
        <TouchableOpacity
          style={[styles.bigCard, styles.mealCard]}
          onPress={() => router.push("/(tabs)/meal-plan-generator")}
          activeOpacity={0.85}
        >
          <View style={styles.bigCardIcon}>
            <Text style={styles.bigCardEmoji}>🍽️</Text>
          </View>
          <View style={styles.bigCardContent}>
            <Text style={styles.bigCardTitle}>Meal Generation</Text>
            <Text style={styles.bigCardDesc}>
              Get personalized meal plans based on your nutrition goals
            </Text>
          </View>
          <Text style={styles.bigCardArrow}>→</Text>
        </TouchableOpacity>

        {/* Your Health Card */}
        <TouchableOpacity
          style={[styles.bigCard, styles.healthCard]}
          onPress={() => router.push("/Healthhub" as any)}
          activeOpacity={0.85}
        >
          <View style={[styles.bigCardIcon, styles.healthIcon]}>
            <Text style={styles.bigCardEmoji}>❤️</Text>
          </View>
          <View style={styles.bigCardContent}>
            <Text style={[styles.bigCardTitle, styles.healthCardTitle]}>
              Your Health
            </Text>
            <Text style={[styles.bigCardDesc, styles.healthCardDesc]}>
              Assessments, analytics and health profile management
            </Text>
          </View>
          <Text style={[styles.bigCardArrow, { color: "#059669" }]}>→</Text>
        </TouchableOpacity>

        {/* Food Analyzer Card */}
        <TouchableOpacity
          style={[styles.bigCard, styles.healthCard]}
          onPress={() => router.push("/(tabs)/food-analyzer")}
          activeOpacity={0.85}
        >
          <View style={[styles.bigCardIcon, styles.healthIcon]}>
            <Text style={styles.bigCardEmoji}>📷</Text>
          </View>
          <View style={styles.bigCardContent}>
            <Text style={[styles.bigCardTitle, styles.healthCardTitle]}>
              Food Analyzer
            </Text>
            <Text style={[styles.bigCardDesc, styles.healthCardDesc]}>
              Scan or upload food images for instant nutrition analysis
            </Text>
          </View>
          <Text style={[styles.bigCardArrow, { color: "#059669" }]}>→</Text>
        </TouchableOpacity>

        {/* Health Connect Card */}
        <TouchableOpacity
          style={[styles.bigCard, styles.healthCard]}
          onPress={() => router.push("/(tabs)/index")}
          activeOpacity={0.85}
        >
          <View style={[styles.bigCardIcon, styles.healthIcon]}>
            <Text style={styles.bigCardEmoji}>⌚</Text>
          </View>
          <View style={styles.bigCardContent}>
            <Text style={[styles.bigCardTitle, styles.healthCardTitle]}>
              Health Connect
            </Text>
            <Text style={[styles.bigCardDesc, styles.healthCardDesc]}>
              Sync steps, heart rate & calories from your watch or Health Connect
            </Text>
          </View>
          <Text style={[styles.bigCardArrow, { color: "#059669" }]}>→</Text>
        </TouchableOpacity>

        {/* Quick Stats Row */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
          QUICK ACCESS
        </Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/AssessmentScreen" as any)}
          >
            <Text style={styles.quickEmoji}>⚡</Text>
            <Text style={styles.quickLabel}>Quick{"\n"}Assessment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/HealthAnalytics" as any)}
          >
            <Text style={styles.quickEmoji}>📊</Text>
            <Text style={styles.quickLabel}>Analytics{"\n"}Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/Patientprofilescreen" as any)}
          >
            <Text style={styles.quickEmoji}>👤</Text>
            <Text style={styles.quickLabel}>My{"\n"}Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },

  header: {
    backgroundColor: "#065f46",
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoutText: {
    color: "#a7f3d0",
    fontSize: 14,
    fontWeight: "600",
  },
  greeting: {
    fontSize: 14,
    color: "#a7f3d0",
    fontWeight: "600",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
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
    marginTop: 4,
  },

  // Big Cards
  bigCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  mealCard: { backgroundColor: "#065f46" },
  healthCard: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#d1fae5",
  },

  bigCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  healthIcon: { backgroundColor: "#ecfdf5" },

  bigCardEmoji: { fontSize: 26 },
  bigCardContent: { flex: 1 },
  bigCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  bigCardDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 18,
  },
  bigCardArrow: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
  },

  healthCardTitle: { color: "#065f46" },
  healthCardDesc: { color: "#6b7280" },

  // Quick Cards
  quickRow: { flexDirection: "row", gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#d1fae5",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickEmoji: { fontSize: 28, marginBottom: 8 },
  quickLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
    lineHeight: 17,
  },
});
