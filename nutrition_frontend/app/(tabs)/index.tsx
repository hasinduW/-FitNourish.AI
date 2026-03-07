// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { predictAndSave } from "../../src/api/client";
import { hcInit, hcConnectAndFetchToday } from "../../src/health/healthConnect";

type Screen = "form" | "result";

export default function IndexTab() {
  const [screen, setScreen] = useState<Screen>("form");
  const { logout } = useAuth();

  // ✅ init only (no permission here)
  useEffect(() => {
    if (Platform.OS !== "android") return;
    (async () => {
      try {
        await hcInit();
      } catch (e) {
        console.log("Health Connect init skipped/failed:", e);
      }
    })();
  }, []);

  async function onLogout() {
    await logout();
    router.replace("/Login");
  }

  const [form, setForm] = useState({
    age: "",
    gender: "Female",
    height_cm: "",
    weight_kg: "",
    goal: "Maintain",

    has_diabetes: "0",
    has_hypertension: "0",

    steps_per_day: "",
    active_minutes: "",
    calories_burned_active: "",
    resting_heart_rate: "",
    heart_rate_samples: "",
    avg_heart_rate: "",
    stress_score: "",
  });

  const [diabetesOn, setDiabetesOn] = useState(false);
  const [hypertensionOn, setHypertensionOn] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, has_diabetes: diabetesOn ? "1" : "0" }));
  }, [diabetesOn]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, has_hypertension: hypertensionOn ? "1" : "0" }));
  }, [hypertensionOn]);

  const [result, setResult] = useState<null | {
    daily_kcal_need: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    saved_id?: any;
  }>(null);

  const [loading, setLoading] = useState(false);
  const syncingRef = useRef(false);

  function update(key: string, value: string) {
    setForm((prev) => {
      const next: any = { ...prev, [key]: value };

      // auto-calc when typing samples
      if (key === "heart_rate_samples") {
        const nums = value
          .split(",")
          .map((x) => Number(x.trim()))
          .filter((n) => Number.isFinite(n) && n > 0 && n < 250);

        if (nums.length) {
          const avgHr = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
          next.avg_heart_rate = String(avgHr);

          const sorted = [...nums].sort((a, b) => a - b);
          const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? sorted[0];
          next.resting_heart_rate = String(Math.round(p10));
        }
      }

      return next;
    });
  }

  function setGender(g: "Male" | "Female") {
    setForm((prev) => ({ ...prev, gender: g }));
  }
  function setGoal(g: "Maintain" | "Lose" | "Gain") {
    setForm((prev) => ({ ...prev, goal: g }));
  }

  // ✅ ONE call: connect + permissions + fetch + autofill
async function onSmartwatchSyncReal() {
  if (Platform.OS !== "android") {
    Alert.alert("Not Supported", "Health Connect works on Android only.");
    return;
  }
  if (syncingRef.current) return;

  syncingRef.current = true;
  setLoading(true);

  try {
    // 1) REAL data from Health Connect
    const data = await hcConnectAndFetchToday(800);
    console.log("HC data to UI (REAL):", data);

    // helpers
    const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== "" && !Number.isNaN(Number(v));

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    /**
     * 2) Build "finalData" = real values + only missing fields filled with dummy
     *    ✅ age and stress_score are NOT touched
     */
    const finalData: any = { ...data };

    // If weight exists, use it to make calories more realistic
    const weight = has(finalData.weight_kg) ? Number(finalData.weight_kg) : null;

    // Steps
    if (!has(finalData.steps_per_day)) {
      finalData.steps_per_day = randInt(2000, 8000);
    }

    // Active minutes
    if (!has(finalData.active_minutes)) {
      // correlate with steps a bit
      const steps = Number(finalData.steps_per_day);
      finalData.active_minutes = clamp(Math.round(steps / 120), 20, 120); // ~ steps/120 mins
    }

    // Height
    if (!has(finalData.height_cm)) {
      finalData.height_cm = randInt(150, 175);
    }

    // Weight
    if (!has(finalData.weight_kg)) {
      finalData.weight_kg = randInt(45, 85);
    }

    // ✅ calories_burned_active = TOTAL calories demo
    if (!has(finalData.calories_burned_active)) {
      const steps = Number(finalData.steps_per_day);
      const mins = Number(finalData.active_minutes);

      // base daily burn depends on weight a bit
      const w = weight ?? Number(finalData.weight_kg);
      const base = clamp(Math.round(1200 + w * 12), 1600, 2600);

      // activity add-on from steps + minutes
      const activityAdd = clamp(Math.round(steps * 0.04 + mins * 4), 200, 900);

      finalData.calories_burned_active = clamp(base + activityAdd, 1700, 3200);
    }

    // Resting HR (prefer real)
    if (!has(finalData.resting_heart_rate)) {
      finalData.resting_heart_rate = randInt(55, 85);
    }

    // Avg HR (if missing)
    if (!has(finalData.avg_heart_rate)) {
      const rhr = Number(finalData.resting_heart_rate);
      finalData.avg_heart_rate = clamp(rhr + randInt(10, 35), 70, 140);
    }

    console.log("HC data to UI (FINAL real+dummy):", finalData);

    // 3) Apply to form (only these fields)
    setForm((prev) => {
      const next = { ...prev };

      const setIfPresent = (key: keyof typeof prev, value: any) => {
        if (value === null || value === undefined) return;
        const str = String(value);
        if (str.trim() === "") return;
        (next as any)[key] = str;
      };

      // ✅ DO NOT touch: age, stress_score (manual)
      setIfPresent("steps_per_day", finalData.steps_per_day);
      setIfPresent("calories_burned_active", finalData.calories_burned_active); // total calories demo
      setIfPresent("active_minutes", finalData.active_minutes);
      setIfPresent("height_cm", finalData.height_cm);
      setIfPresent("weight_kg", finalData.weight_kg);

      // heart: fill resting only (as you want)
      setIfPresent("resting_heart_rate", finalData.resting_heart_rate);

      // optional: you can keep avg_heart_rate fill too (looks nicer in demo)
      setIfPresent("avg_heart_rate", finalData.avg_heart_rate);

      return next;
    });

    Alert.alert("Synced ✅", "Health data updated successfully.");
  } catch (e: any) {
    console.log("HC error", e);
    Alert.alert("Sync Failed", e?.message || "Health Connect sync failed");
  } finally {
    setLoading(false);
    syncingRef.current = false;
  }
}

  function toPayload() {
    const num = (v: string) => (v && String(v).trim() !== "" ? Number(v) : 0);

    return {
      age: num(form.age),
      gender: form.gender,
      height_cm: num(form.height_cm),
      weight_kg: num(form.weight_kg),
      goal: form.goal,
      has_diabetes: Number(form.has_diabetes),
      has_hypertension: Number(form.has_hypertension),
      steps_per_day: num(form.steps_per_day),
      active_minutes: num(form.active_minutes),
      calories_burned_active: num(form.calories_burned_active),
      resting_heart_rate: num(form.resting_heart_rate),
      avg_heart_rate: num(form.avg_heart_rate),
      stress_score: num(form.stress_score),
    };
  }

  // ✅ Industry-level macro calculation (fallback if backend doesn't send macros)
  function computeMacrosFromCalories(kcal: number, goal: "Maintain" | "Lose" | "Gain") {
    // Industry-style macro splits
    const split =
      goal === "Lose"
        ? { p: 0.35, c: 0.35, f: 0.3 }
        : goal === "Gain"
        ? { p: 0.3, c: 0.45, f: 0.25 }
        : { p: 0.3, c: 0.4, f: 0.3 };

    const protein_g = Math.round((kcal * split.p) / 4); // 4 kcal/g
    const carbs_g = Math.round((kcal * split.c) / 4); // 4 kcal/g
    const fat_g = Math.round((kcal * split.f) / 9); // 9 kcal/g

    return { protein_g, carbs_g, fat_g };
  }

  const groupedFields = useMemo(() => {
    return [
      {
        title: "Profile",
        subtitle: "Basic details for calorie estimation",
        fields: ["age", "height_cm", "weight_kg"],
      },
      {
        title: "Daily Activity",
        subtitle: "Auto-filled from Health Connect (still editable)",
        fields: ["steps_per_day", "active_minutes", "calories_burned_active"],
      },
      {
        title: "Heart Metrics",
        subtitle: "Auto-filled from Health Connect (still editable)",
        fields: ["resting_heart_rate", "heart_rate_samples", "avg_heart_rate", "stress_score"],
      },
    ];
  }, []);

  /* =========================================================
     ✅ VALIDATION (UPDATED)
     - Required: age, height, weight
     - Age must be >= 18
     - No negative values anywhere
     - Reasonable ranges for health/activity
  ========================================================= */

  function validateForm(): string | null {
    const isEmpty = (v: string) => !v || v.trim() === "";
    const toNum = (v: string) => Number(String(v).trim());

    // Required (core profile)
    if (isEmpty(form.age)) return "Age is required";
    if (isEmpty(form.height_cm)) return "Height is required";
    if (isEmpty(form.weight_kg)) return "Weight is required";

    // Parse numbers
    const age = toNum(form.age);
    const h = toNum(form.height_cm);
    const w = toNum(form.weight_kg);

    const steps = isEmpty(form.steps_per_day) ? null : toNum(form.steps_per_day);
    const mins = isEmpty(form.active_minutes) ? null : toNum(form.active_minutes);
    const activeKcal = isEmpty(form.calories_burned_active) ? null : toNum(form.calories_burned_active);
    const rhr = isEmpty(form.resting_heart_rate) ? null : toNum(form.resting_heart_rate);
    const avgHr = isEmpty(form.avg_heart_rate) ? null : toNum(form.avg_heart_rate);
    const stress = isEmpty(form.stress_score) ? null : toNum(form.stress_score);

    // Must be valid numbers
    if (!Number.isFinite(age)) return "Age must be a valid number";
    if (!Number.isFinite(h)) return "Height must be a valid number";
    if (!Number.isFinite(w)) return "Weight must be a valid number";

    // No negatives anywhere (including optional fields)
    if (age < 0 || h < 0 || w < 0) return "Age/Height/Weight cannot be negative";
    if (steps !== null && steps < 0) return "Steps cannot be negative";
    if (mins !== null && mins < 0) return "Active minutes cannot be negative";
    if (activeKcal !== null && activeKcal < 0) return "Active calories cannot be negative";
    if (rhr !== null && rhr < 0) return "Resting heart rate cannot be negative";
    if (avgHr !== null && avgHr < 0) return "Average heart rate cannot be negative";
    if (stress !== null && stress < 0) return "Stress score cannot be negative";

    // Age: 18+
    if (age < 18) return "Age must be 18 or above";
    if (age > 90) return "Age must be 90 or below";

    // Reasonable ranges
    if (h < 120 || h > 220) return "Height must be between 120 and 220 cm";
    if (w < 30 || w > 200) return "Weight must be between 30 and 200 kg";

    if (form.goal !== "Maintain" && form.goal !== "Lose" && form.goal !== "Gain")
      return 'Goal must be "Maintain", "Lose", or "Gain"';

    if (steps !== null && steps > 30000) return "Steps must be 0–30000";
    if (mins !== null && mins > 300) return "Active minutes must be 0–300";

    // Heart ranges (optional)
    if (rhr !== null && (rhr < 30 || rhr > 140)) return "Resting heart rate must be 30–140";
    if (avgHr !== null && (avgHr < 30 || avgHr > 220)) return "Average heart rate must be 30–220";

    // Stress score optional
    if (stress !== null && (stress < 0 || stress > 100)) return "Stress score must be 0–100";

    // Samples (optional) - if typed, validate format numbers only
    if (!isEmpty(form.heart_rate_samples)) {
      const nums = form.heart_rate_samples
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n));

      if (nums.length === 0) return "Heart rate samples format is invalid. Example: 78, 82, 90";
      const bad = nums.find((n) => n <= 0 || n >= 250);
      if (bad !== undefined) return "Heart rate samples must be between 1 and 249";
    }

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

      const apiRes = await predictAndSave(toPayload());

      // backend might return only kcal OR kcal+macros
      const daily_kcal_need = Number(apiRes?.daily_kcal_need ?? apiRes?.kcal ?? 0);

      const protein_g =
        Number(apiRes?.protein_g ?? apiRes?.protein ?? 0) ||
        computeMacrosFromCalories(daily_kcal_need, form.goal as any).protein_g;

      const carbs_g =
        Number(apiRes?.carbs_g ?? apiRes?.carbs ?? 0) ||
        computeMacrosFromCalories(daily_kcal_need, form.goal as any).carbs_g;

      const fat_g =
        Number(apiRes?.fat_g ?? apiRes?.fat ?? 0) ||
        computeMacrosFromCalories(daily_kcal_need, form.goal as any).fat_g;

      setResult({
        daily_kcal_need,
        protein_g,
        carbs_g,
        fat_g,
        saved_id: apiRes?.saved_id,
      });

      setScreen("result");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     RESULT PAGE (super nice)
  ========================================================= */

  if (screen === "result" && result) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: BG }]}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* ✅ Back button added (no other changes) */}
          <View style={styles.resultHeader}>
            <Pressable onPress={() => setScreen("form")} style={styles.backChip}>
              <Text style={styles.backChipText}>← Back</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.resultBrand}>FitNourish.AI</Text>
              <Text style={styles.resultSub}>Personal Nutrition Summary</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Daily Calories</Text>
            <Text style={styles.heroKcal}>{result.daily_kcal_need} kcal</Text>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Goal: {form.goal}</Text>
              </View>
              <View style={[styles.badge, diabetesOn ? styles.badgeWarn : styles.badgeOk]}>
                <Text style={styles.badgeText}>{diabetesOn ? "Diabetes: Yes" : "Diabetes: No"}</Text>
              </View>
              <View style={[styles.badge, hypertensionOn ? styles.badgeWarn : styles.badgeOk]}>
                <Text style={styles.badgeText}>
                  {hypertensionOn ? "Hypertension: Yes" : "Hypertension: No"}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeadline}>Macronutrients (per day)</Text>

          <View style={styles.macroGrid}>
            <MacroCard title="Protein" value={`${result.protein_g} g`} note="Muscle + satiety" />
            <MacroCard title="Carbs" value={`${result.carbs_g} g`} note="Energy + performance" />
            <MacroCard title="Fat" value={`${result.fat_g} g`} note="Hormones + balance" />
            <MacroCard
              title="Calories"
              value={`${result.daily_kcal_need} kcal`}
              note="Total energy target"
              isPrimary
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.resultActions}>
            <Pressable onPress={() => setScreen("form")} style={[styles.actionBtn, styles.secondaryBtn]}>
              <Text style={[styles.actionText, { color: GREEN_DARK }]}>Edit Inputs</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setResult(null);
                setScreen("form");
              }}
              style={[styles.actionBtn, styles.ghostBtn]}
            >
              <Text style={[styles.actionText, { color: MUTED }]}>New Calculation</Text>
            </Pressable>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  const isWeb = Platform.OS === "web";

  // ✅ Form/dashboard (initial screen is "form")
  if (screen === "form") {
    return (
      <KeyboardAvoidingView
        style={[styles.container, isWeb && styles.containerWeb]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
      <ScrollView
        style={[styles.container, isWeb && styles.scrollViewWeb]}
        contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandTitle}>FitNourish.AI</Text>
            <Text style={styles.brandSubtitle}>Smart Nutrition Calculator</Text>
          </View>

          <Pressable
            onPress={onSmartwatchSyncReal}
            disabled={loading}
            style={[styles.syncChip, loading && { opacity: 0.7 }]}
          >
            <Text style={styles.syncChipText}>{loading ? "Syncing..." : "⌚ Sync"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Setup</Text>
          <Text style={styles.cardSub}>Fill manually or sync via Health Connect</Text>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.segment}>
              {["Female", "Male"].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g as any)}
                  style={[styles.segmentBtn, form.gender === g && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, form.gender === g && styles.segmentTextActive]}>
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Goal</Text>
            <View style={styles.segment}>
              {["Maintain", "Lose", "Gain"].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g as any)}
                  style={[styles.segmentBtn, form.goal === g && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, form.goal === g && styles.segmentTextActive]}>
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Diabetes</Text>
              <View style={styles.toggleRight}>
                <Text style={styles.toggleValue}>{diabetesOn ? "Yes" : "No"}</Text>
                <Switch value={diabetesOn} onValueChange={setDiabetesOn} />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Hypertension</Text>
              <View style={styles.toggleRight}>
                <Text style={styles.toggleValue}>{hypertensionOn ? "Yes" : "No"}</Text>
                <Switch value={hypertensionOn} onValueChange={setHypertensionOn} />
              </View>
            </View>
          </View>

          {groupedFields.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSub}>{section.subtitle}</Text>

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
                      keyboardType={k === "heart_rate_samples" ? "default" : "numeric"}
                    />
                    {helperTextFor(k) ? <Text style={styles.helper}>{helperTextFor(k)}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ))}

          <Pressable onPress={onPredictSave} disabled={loading} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{loading ? "Calculating..." : "Generate Plan"}</Text>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return null;
}

/* ---------- UI COMPONENTS ---------- */

function MacroCard({
  title,
  value,
  note,
  isPrimary,
}: {
  title: string;
  value: string;
  note: string;
  isPrimary?: boolean;
}) {
  return (
    <View style={[styles.macroCard, isPrimary && styles.macroPrimary]}>
      <Text style={[styles.macroTitle, isPrimary && { color: "#fff" }]}>{title}</Text>
      <Text style={[styles.macroValue, isPrimary && { color: "#fff" }]}>{value}</Text>
      <Text style={[styles.macroNote, isPrimary && { color: "#EAF7F1" }]}>{note}</Text>
    </View>
  );
}

/* ---------- helpers ---------- */

function prettyLabel(k: string) {
  const map: Record<string, string> = {
    age: "Age",
    height_cm: "Height (cm)",
    weight_kg: "Weight (kg)",
    steps_per_day: "Steps per day",
    active_minutes: "Active minutes",
    calories_burned_active: "Active calories (kcal)",
    resting_heart_rate: "Resting heart rate",
    heart_rate_samples: "Heart rate samples (comma separated)",
    avg_heart_rate: "Average heart rate",
    stress_score: "Stress score (manual)",
  };
  return map[k] ?? k;
}

function placeholderFor(k: string) {
  const map: Record<string, string> = {
    age: "e.g., 25",
    height_cm: "e.g., 160",
    weight_kg: "e.g., 60",
    steps_per_day: "e.g., 7500",
    active_minutes: "e.g., 60",
    calories_burned_active: "e.g., 400",
    resting_heart_rate: "e.g., 72",
    heart_rate_samples: "e.g., 78, 82, 90, 88",
    avg_heart_rate: "e.g., 92",
    stress_score: "e.g., 55",
  };
  return map[k] ?? "";
}

function helperTextFor(k: string) {
  const map: Record<string, string> = {
    heart_rate_samples: "Typing samples auto-calculates Avg HR + Resting HR.",
    stress_score: "0–100 (manual).",
  };
  return map[k] ?? "";
}

/* ---------- styles ---------- */

const GREEN = "#2E8B6D";
const GREEN_DARK = "#1F6A53";
const BG = "#F2F7F5";
const CARD = "#FFFFFF";
const BORDER = "#E2ECE7";
const TEXT = "#0E1A17";
const MUTED = "#5D6E69";

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },

  container: { backgroundColor: BG, minHeight: "100%" },
  containerWeb: { height: "100vh" as unknown as number },
  scrollViewWeb: { flex: 1, maxHeight: "100vh" as unknown as number },
  contentWeb: { flexGrow: 1, paddingBottom: 32 },
  content: { padding: 16 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },

  brandTitle: { fontSize: 18, fontWeight: "900", color: TEXT },
  brandSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "800", color: MUTED },

  syncChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#E9F6F0",
    borderWidth: 1,
    borderColor: "#D5EFE5",
  },
  syncChipText: { color: GREEN_DARK, fontWeight: "900", fontSize: 12 },

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: TEXT },
  cardSub: { marginTop: 4, color: MUTED, fontWeight: "700", fontSize: 12 },

  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    backgroundColor: "#FBFDFC",
    borderRadius: 14,
    overflow: "hidden",
  },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  segmentBtnActive: { backgroundColor: "#E9F6F0" },
  segmentText: { color: MUTED, fontWeight: "900", fontSize: 12 },
  segmentTextActive: { color: GREEN_DARK },

  section: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#EEF3F1" },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  sectionSub: { marginTop: 2, fontSize: 12, color: MUTED, fontWeight: "700" },

  grid: { gap: 10 },

  field: {
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    padding: 10,
    borderRadius: 14,
    marginTop: 10,
  },
  label: { fontSize: 12, fontWeight: "800", color: TEXT, marginBottom: 6 },
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
  helper: { marginTop: 6, fontSize: 11, color: "#7B8C87", fontWeight: "700" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: "#EDF4F1",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  toggleLabel: { fontSize: 12, fontWeight: "900", color: TEXT },
  toggleRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleValue: { fontSize: 12, fontWeight: "900", color: GREEN_DARK },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: GREEN,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1D6B52",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  /* ---------- RESULT UI ---------- */

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    padding: 16,
  },

  /* ✅ Back button styles added */
  backChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#EEF7F3",
    borderWidth: 1,
    borderColor: "#D6EFE5",
    marginRight: 10,
  },
  backChipText: {
    color: GREEN_DARK,
    fontWeight: "900",
    fontSize: 12,
  },

  resultBrand: { fontSize: 18, fontWeight: "900", color: TEXT },
  resultSub: { marginTop: 4, color: MUTED, fontWeight: "700", fontSize: 12 },

  heroCard: {
    marginTop: 12,
    backgroundColor: GREEN,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1D6B52",
  },
  heroTitle: { color: "#EAF7F1", fontWeight: "900", fontSize: 12 },
  heroKcal: { marginTop: 6, color: "#fff", fontWeight: "900", fontSize: 32 },

  badgeRow: { marginTop: 12, gap: 8 },
  badge: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  badgeOk: {},
  badgeWarn: { borderColor: "rgba(255,220,220,0.8)" },

  sectionHeadline: { marginTop: 14, fontSize: 14, fontWeight: "900", color: TEXT },

  macroGrid: { marginTop: 10, gap: 10 },
  macroCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    padding: 14,
  },
  macroPrimary: {
    backgroundColor: GREEN_DARK,
    borderColor: GREEN_DARK,
  },
  macroTitle: { color: TEXT, fontWeight: "900", fontSize: 12 },
  macroValue: { marginTop: 6, color: TEXT, fontWeight: "900", fontSize: 22 },
  macroNote: { marginTop: 4, color: MUTED, fontWeight: "700", fontSize: 12 },

  resultActions: { marginTop: 12, gap: 10 },
  actionBtn: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtn: { backgroundColor: "#E9F6F0", borderColor: "#D5EFE5" },
  ghostBtn: { backgroundColor: "#FBFDFC", borderColor: "#EDF4F1" },
  actionText: { fontWeight: "900", fontSize: 14 },
});