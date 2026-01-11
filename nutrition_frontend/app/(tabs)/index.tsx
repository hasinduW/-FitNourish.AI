import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { predictAndSave } from "../../src/api/client";

type Screen = "splash" | "login" | "home" | "form";

export default function PredictTab() {
  const [screen, setScreen] = useState<Screen>("splash");

  // ---- Fake login state (hardcoded) ----
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("1234");
  const [loginError, setLoginError] = useState("");

  // Auto move splash -> login
  useEffect(() => {
    const t = setTimeout(() => setScreen("login"), 1400);
    return () => clearTimeout(t);
  }, []);

  function onLogin() {
    setLoginError("");
    if (username.trim() === "demo" && password === "1234") {
      setScreen("home"); // ✅ go to HOME first
      return;
    }
    setLoginError("Invalid username or password (Try demo / 1234)");
  }

  function onLogout() {
    setScreen("login");
    setLoginError("");
    setUsername("demo");
    setPassword("1234");
  }

  // ---- Form state ----
  const [form, setForm] = useState({
    age: "25",
    gender: "Female",
    height_cm: "160",
    weight_kg: "60",
    goal: "Maintain",
    has_diabetes: "1",
    has_hypertension: "1",
    steps_per_day: "7500",
    active_minutes: "60",
    calories_burned_active: "400",
    resting_heart_rate: "72",
    avg_heart_rate: "92",
    stress_score: "55",
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toPayload() {
    return {
      age: Number(form.age),
      gender: form.gender,
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      goal: form.goal,
      has_diabetes: Number(form.has_diabetes),
      has_hypertension: Number(form.has_hypertension),
      steps_per_day: Number(form.steps_per_day),
      active_minutes: Number(form.active_minutes),
      calories_burned_active: Number(form.calories_burned_active),
      resting_heart_rate: Number(form.resting_heart_rate),
      avg_heart_rate: Number(form.avg_heart_rate),
      stress_score: Number(form.stress_score),
    };
  }

  const groupedFields = useMemo(() => {
    return [
      {
        title: "Profile",
        subtitle: "Basic details for calorie estimation",
        fields: ["age", "gender", "height_cm", "weight_kg", "goal"],
      },
      {
        title: "Health Conditions",
        subtitle: "Multi-disease aware planning",
        fields: ["has_diabetes", "has_hypertension"],
      },
      {
        title: "Daily Activity",
        subtitle: "Phone-based activity signals",
        fields: ["steps_per_day", "active_minutes", "calories_burned_active"],
      },
      {
        title: "Smartwatch Snapshot",
        subtitle: "Heart rate + stress indicators",
        fields: ["resting_heart_rate", "avg_heart_rate", "stress_score"],
      },
    ];
  }, []);

  function validateForm(): string | null {
    const age = Number(form.age);
    const h = Number(form.height_cm);
    const w = Number(form.weight_kg);
    const steps = Number(form.steps_per_day);
    const mins = Number(form.active_minutes);

    if (!age || age < 10 || age > 90) return "Age must be between 10 and 90";
    if (!h || h < 120 || h > 220) return "Height must be between 120 and 220 cm";
    if (!w || w < 30 || w > 200) return "Weight must be between 30 and 200 kg";
    if (form.goal !== "Maintain" && form.goal !== "Lose" && form.goal !== "Gain")
      return 'Goal must be "Maintain", "Lose", or "Gain"';
    if (steps < 0 || steps > 30000) return "Steps must be 0–30000";
    if (mins < 0 || mins > 300) return "Active minutes must be 0–300";
    return null;
  }

  async function onPredictSave() {
    const err = validateForm();
    if (err) {
      Alert.alert("Validation", err);
      return;
    }

    try {
      setLoading(true);
      const data = await predictAndSave(toPayload());
      setResult(data);
      Alert.alert("Saved ✅", `Record ID: ${data.saved_id}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- SCREENS ----------------

  // ✅ SPLASH (no PP1)
  if (screen === "splash") {
    return (
      <View style={[styles.full, styles.splashBg]}>
        <View style={styles.splashCard}>
          <View style={styles.brandIconBig}>
            <Text style={styles.brandIconText}>F</Text>
          </View>
          <Text style={styles.splashTitle}>FitNourish.AI</Text>
          <Text style={styles.splashSub}>Intelligent Nutrition & Wellness Assistant</Text>

          <View style={{ height: 18 }} />
          <ActivityIndicator />
          <Text style={styles.splashHint}>Loading FitNourish.AI...</Text>
        </View>
      </View>
    );
  }

  // ✅ LOGIN (no PP1)
  if (screen === "login") {
    return (
      <View style={[styles.full, styles.loginBg]}>
        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>F</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>FitNourish.AI</Text>
              <Text style={styles.brandSubtitle}>Secure Sign In</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI</Text>
            </View>
          </View>

          <Text style={styles.pageTitle}>Sign In</Text>
          <Text style={styles.pageDesc}>Access personalized nutrition predictions.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              autoCapitalize="none"
              placeholder="demo"
              placeholderTextColor="#7A8A86"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              autoCapitalize="none"
              secureTextEntry
              placeholder="1234"
              placeholderTextColor="#7A8A86"
            />
          </View>

          {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

          <Pressable
            onPress={onLogin}
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text style={styles.buttonText}>Login</Text>
            <Text style={styles.buttonSub}>Use demo / 1234</Text>
          </Pressable>

          <View style={styles.loginFooter}>
            <Text style={styles.footerNoteText}>
              Backend: FastAPI • DB: PostgreSQL • ML: RandomForest
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ✅ HOME (fake fitness dashboard)
  if (screen === "home") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>F</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>FitNourish.AI</Text>
            <Text style={styles.brandSubtitle}>Your Health Dashboard</Text>
          </View>

          <Pressable onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>Welcome back, Demo User 👋</Text>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>Today</Text>
            </View>
          </View>
          <Text style={styles.heroDesc}>
            Track nutrition targets, activity signals, and multi-disease aware recommendations.
          </Text>

          <View style={styles.statsRow}>
            <StatCard title="Steps" value="7,500" sub="Goal: 10,000" />
            <StatCard title="Active" value="60 min" sub="Good" />
            <StatCard title="Stress" value="55" sub="Moderate" />
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSub}>Tap an action to continue</Text>

          <View style={{ height: 10 }} />

          <Pressable
            onPress={() => {
              setResult(null);
              setScreen("form"); // ✅ go to your form
            }}
            style={({ pressed }) => [styles.bigAction, pressed && { opacity: 0.95 }]}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bigActionTitle}>Calculate Daily Calories & Macros</Text>
              <Text style={styles.bigActionSub}>
                Personalized kcal, protein, carbs and fat per day
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Demo", "This card is a UI demo for the presentation.")}
            style={({ pressed }) => [styles.smallAction, pressed && { opacity: 0.95 }]}
          >
            <Text style={styles.smallActionTitle}>View History</Text>
            <Text style={styles.smallActionSub}>Saved predictions (PostgreSQL)</Text>
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Demo", "Wearable sync is shown as future integration.")}
            style={({ pressed }) => [styles.smallAction, pressed && { opacity: 0.95 }]}
          >
            <Text style={styles.smallActionTitle}>Sync Smartwatch</Text>
            <Text style={styles.smallActionSub}>Heart rate + stress snapshot</Text>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  // ✅ FORM SCREEN (same as your nice UI, no PP1)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>F</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.brandTitle}>FitNourish.AI</Text>
          <Text style={styles.brandSubtitle}>Nutrition Prediction</Text>
        </View>

        <Pressable onPress={() => setScreen("home")} style={styles.backBtn}>
          <Text style={styles.backText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.pageTitle}>Nutrition Target Calculator</Text>
        <Text style={styles.pageDesc}>
          Enter your health & activity information. Then generate daily calories and macros.
        </Text>

        {groupedFields.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSub}>{section.subtitle}</Text>
            </View>

            <View style={styles.grid}>
              {section.fields.map((k) => (
                <View key={k} style={styles.field}>
                  <Text style={styles.label}>{prettyLabel(k)}</Text>
                  <TextInput
                    value={(form as any)[k]}
                    onChangeText={(v) => update(k, v)}
                    style={styles.input}
                    autoCapitalize="none"
                    placeholder={placeholderFor(k)}
                    placeholderTextColor="#7A8A86"
                  />
                  {helperTextFor(k) ? <Text style={styles.helper}>{helperTextFor(k)}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={onPredictSave}
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.9 },
            loading && { opacity: 0.65 },
          ]}
        >
          <Text style={styles.buttonText}>{loading ? "Predicting..." : "Predict & Save"}</Text>
          <Text style={styles.buttonSub}>Saves to PostgreSQL history</Text>
        </Pressable>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultTop}>
            <Text style={styles.resultTitle}>Result</Text>
            <View style={styles.resultChip}>
              <Text style={styles.resultChipText}>Personalized Targets</Text>
            </View>
          </View>

          <View style={styles.kcalBox}>
            <Text style={styles.kcalNumber}>{result.daily_kcal_need}</Text>
            <Text style={styles.kcalUnit}>kcal / day</Text>
          </View>

          <View style={styles.macroRow}>
            <MacroPill label="Protein" value={`${result.protein_g_per_day} g/day`} />
            <MacroPill label="Carbs" value={`${result.carbs_g_per_day} g/day`} />
            <MacroPill label="Fat" value={`${result.fat_g_per_day} g/day`} />
          </View>

          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              Backend: FastAPI • Model: ML regression • Stored: PostgreSQL
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

/* ---------- Small UI helpers ---------- */

function prettyLabel(k: string) {
  const map: Record<string, string> = {
    age: "Age",
    gender: "Gender",
    height_cm: "Height (cm)",
    weight_kg: "Weight (kg)",
    goal: "Goal (Maintain/Lose/Gain)",
    has_diabetes: "Diabetes (0/1)",
    has_hypertension: "Hypertension (0/1)",
    steps_per_day: "Steps per day",
    active_minutes: "Active minutes",
    calories_burned_active: "Active calories",
    resting_heart_rate: "Resting heart rate",
    avg_heart_rate: "Average heart rate",
    stress_score: "Stress score",
  };
  return map[k] ?? k;
}

function placeholderFor(k: string) {
  const map: Record<string, string> = {
    age: "e.g., 25",
    gender: "Female / Male",
    height_cm: "e.g., 160",
    weight_kg: "e.g., 60",
    goal: "Maintain / Lose / Gain",
    has_diabetes: "0 or 1",
    has_hypertension: "0 or 1",
    steps_per_day: "e.g., 7500",
    active_minutes: "e.g., 60",
    calories_burned_active: "e.g., 400",
    resting_heart_rate: "e.g., 72",
    avg_heart_rate: "e.g., 92",
    stress_score: "e.g., 55",
  };
  return map[k] ?? "";
}

function helperTextFor(k: string) {
  const map: Record<string, string> = {
    goal: "Use: Maintain / Lose / Gain",
    has_diabetes: "0 = No, 1 = Yes",
    has_hypertension: "0 = No, 1 = Yes",
    stress_score: "0–100 (higher = more stress)",
    steps_per_day: "Steps must be 0–30000",
  };
  return map[k] ?? "";
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
    </View>
  );
}

function StatCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */

const GREEN = "#2E8B6D";
const GREEN_DARK = "#1F6A53";
const BG = "#F2F7F5";
const CARD = "#FFFFFF";
const BORDER = "#E2ECE7";
const TEXT = "#0E1A17";
const MUTED = "#5D6E69";

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  splashBg: { backgroundColor: BG },
  splashCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 22,
    alignItems: "center",
  },
  brandIconBig: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  splashTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "900",
    color: TEXT,
  },
  splashSub: {
    marginTop: 4,
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
  },
  splashHint: {
    marginTop: 10,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  loginBg: { backgroundColor: BG },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
  },
  loginHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    marginBottom: 12,
  },
  errorText: {
    marginTop: 8,
    color: "#B42318",
    fontWeight: "700",
    fontSize: 12,
  },
  loginFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF3F1",
  },

  container: { backgroundColor: BG, minHeight: "100%" },
  content: { padding: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
    lineHeight: 22,
  },
  brandSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: MUTED,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#E9F6F0",
    borderWidth: 1,
    borderColor: "#D5EFE5",
  },
  badgeText: {
    color: GREEN_DARK,
    fontSize: 12,
    fontWeight: "800",
  },

  logoutBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFEFEF",
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  logoutText: {
    color: "#B42318",
    fontWeight: "900",
    fontSize: 12,
  },
  backBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#EEF7F3",
    borderWidth: 1,
    borderColor: "#D6EFE5",
  },
  backText: {
    color: GREEN_DARK,
    fontWeight: "900",
    fontSize: 12,
  },

  // HOME
  heroCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT,
  },
  heroChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#E9F6F0",
    borderWidth: 1,
    borderColor: "#D5EFE5",
  },
  heroChipText: {
    color: GREEN_DARK,
    fontWeight: "900",
    fontSize: 12,
  },
  heroDesc: {
    marginTop: 8,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: MUTED,
  },
  statValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: GREEN_DARK,
  },
  statSub: {
    marginTop: 4,
    fontSize: 11,
    color: MUTED,
    fontWeight: "700",
  },

  quickActions: {
    marginTop: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  bigAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1D6B52",
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  bigActionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  bigActionSub: {
    marginTop: 2,
    color: "#DDF3EB",
    fontSize: 12,
    fontWeight: "700",
  },
  actionArrow: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginLeft: 6,
  },
  smallAction: {
    marginTop: 10,
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  smallActionTitle: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 13,
  },
  smallActionSub: {
    marginTop: 4,
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },

  // FORM
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
  },
  pageDesc: {
    marginTop: 6,
    marginBottom: 10,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },

  section: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF3F1",
  },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT,
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    color: MUTED,
  },

  grid: { gap: 10 },
  field: {
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    padding: 10,
    borderRadius: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9E7E1",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    color: TEXT,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },
  helper: {
    marginTop: 6,
    fontSize: 11,
    color: "#7B8C87",
  },

  button: {
    marginTop: 16,
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1D6B52",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  buttonSub: {
    marginTop: 4,
    color: "#DDF3EB",
    fontSize: 12,
    fontWeight: "700",
  },

  resultCard: {
    marginTop: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  resultTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT,
  },
  resultChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#E9F6F0",
    borderWidth: 1,
    borderColor: "#D5EFE5",
  },
  resultChipText: {
    color: GREEN_DARK,
    fontWeight: "900",
    fontSize: 12,
  },

  kcalBox: {
    backgroundColor: "#F0FBF6",
    borderWidth: 1,
    borderColor: "#D9F1E6",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  kcalNumber: {
    fontSize: 40,
    fontWeight: "900",
    color: GREEN_DARK,
    lineHeight: 44,
  },
  kcalUnit: {
    marginTop: 4,
    color: MUTED,
    fontWeight: "800",
  },

  macroRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  macroPill: {
    flex: 1,
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: TEXT,
  },
  macroValue: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "900",
    color: GREEN_DARK,
  },

  footerNote: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF3F1",
  },
  footerNoteText: {
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    fontWeight: "700",
  },
});
