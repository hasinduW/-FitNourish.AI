import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { UserData, AssessmentResults, Meals } from "../types";
import { API_URL, DISEASE_TYPES, SEVERITIES } from "../types/constants";
import FoodLogger from "../components/FoodLogger";
import ResultsScreen from "./ResultsScreen";

const USER_ID = 1;

const initialUserData: UserData = {
  userId: USER_ID,
  age: "",
  gender: "",
  weight: "",
  height: "",
  exercise: "low",
  sleep: "",
  sugar_intake: "medium",
  smoking: "",
  alcohol: "",
  married: "",
  profession: "",
  disease_type: "None",
  severity: "Mild",
  cholesterol: "",
  blood_pressure: "",
  glucose: "",
  dietary_restrictions: "None",
  allergies: "None",
  exercise_hours: "2",
  adherence: "60",
  daily_caloric_intake: "2200",
  meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
};

// ── Reusable UI ───────────────────────────────────────────────────

const Label = ({ text }: { text: string }) => (
  <Text style={styles.label}>{text}</Text>
);

const StyledInput = ({
  value,
  onChange,
  placeholder,
  keyboardType = "default",
  editable = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  editable?: boolean;
}) => (
  <TextInput
    style={[styles.input, !editable && styles.inputDisabled]}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    placeholderTextColor="#9ca3af"
    keyboardType={keyboardType}
    editable={editable}
  />
);

const OptionGroup = ({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) => (
  <View style={styles.optionRow}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt}
        onPress={() => onSelect(opt)}
        style={[styles.optionBtn, selected === opt && styles.optionBtnActive]}
      >
        <Text
          style={[
            styles.optionText,
            selected === opt && styles.optionTextActive,
          ]}
        >
          {opt}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const WrapOptionGroup = ({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) => (
  <View style={styles.wrapRow}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt}
        onPress={() => onSelect(opt)}
        style={[styles.wrapBtn, selected === opt && styles.optionBtnActive]}
      >
        <Text
          style={[styles.wrapText, selected === opt && styles.optionTextActive]}
        >
          {opt}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const SectionHeader = ({ emoji, title }: { emoji: string; title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionEmoji}>{emoji}</Text>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────

export default function AssessmentScreen() {
  const [userData, setUserData] = useState<UserData>(initialUserData);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Blood values
  const [hasStoredBlood, setHasStoredBlood] = useState(false);
  const [lastBloodDate, setLastBloodDate] = useState<string | null>(null);
  const [isEditingBlood, setIsEditingBlood] = useState(false);

  useEffect(() => {
    loadPatientProfile();
    loadLatestBloodValues();
  }, []);

  // ── Load patient profile ──────────────────────────────────────
  const loadPatientProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/patient/profile/${USER_ID}`);
      const data = await res.json();
      if (data.success) {
        setHasProfile(true);
        setUserData((prev) => ({
          ...prev,
          age: String(data.data.age),
          gender: data.data.gender,
          married: data.data.married,
          profession: data.data.profession,
          smoking: data.data.smoking,
          alcohol: data.data.alcohol,
        }));
      } else {
        setHasProfile(false);
      }
    } catch (e) {
      setHasProfile(false);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Load latest blood values from analytics summary ───────────
  const loadLatestBloodValues = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/${USER_ID}/summary`);
      const data = await res.json();
      if (data.success && data.summary) {
        const glucose = data.summary.glucose?.current;
        const cholesterol = data.summary.cholesterol?.current;
        const latestDate = data.summary.latest_date;

        if (glucose || cholesterol) {
          setHasStoredBlood(true);
          setUserData((prev) => ({
            ...prev,
            glucose: glucose ? String(glucose) : prev.glucose,
            cholesterol: cholesterol ? String(cholesterol) : prev.cholesterol,
          }));
          if (latestDate) {
            const d = new Date(latestDate);
            setLastBloodDate(
              d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            );
          }
        } else {
          // No stored values — open edit mode automatically
          setHasStoredBlood(false);
          setIsEditingBlood(true);
        }
      }
    } catch (e) {
      setHasStoredBlood(false);
      setIsEditingBlood(true);
    }
  };

  const handleChange = (field: keyof UserData, value: string) => {
    const newData = { ...userData, [field]: value };
    if (field === "exercise_hours") {
      const hours = parseFloat(value) || 0;
      newData.exercise = hours < 3 ? "low" : hours < 7 ? "medium" : "high";
    }
    setUserData(newData);
  };

  const handleMealsChange = (newMeals: Meals) => {
    setUserData((prev) => ({ ...prev, meals: newMeals }));
  };

  const getAssessment = async () => {
    // Block if no profile
    if (!hasProfile) {
      Alert.alert(
        "Profile Required",
        "Please complete your Health Profile before running an assessment.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Profile",
            onPress: () => router.push("/Patientprofilescreen" as any),
          },
        ],
      );
      return;
    }

    const required = [
      "age",
      "gender",
      "weight",
      "height",
      "exercise",
      "sleep",
      "sugar_intake",
      "smoking",
      "alcohol",
      "married",
      "profession",
    ];
    const missing = required.filter((f) => !userData[f as keyof UserData]);
    if (missing.length) {
      Alert.alert("Missing Fields", `Please fill: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const requestData: any = { ...userData };
      [
        "age",
        "weight",
        "height",
        "sleep",
        "cholesterol",
        "blood_pressure",
        "glucose",
        "exercise_hours",
        "adherence",
      ].forEach((f) => {
        if (requestData[f]) requestData[f] = parseFloat(requestData[f]);
      });

      const response = await fetch(`${API_URL}/api/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const data: AssessmentResults = await response.json();

      if (data.success) {
        setResults(data);
        setShowResults(true);
        setIsEditingBlood(false); // lock after successful assessment
      } else {
        Alert.alert("Error", (data as any).error || "Something went wrong");
      }
    } catch (err) {
      Alert.alert(
        "Connection Error",
        "Cannot connect to server. Check backend & network.",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (showResults && results) {
    return (
      <ResultsScreen results={results} onBack={() => setShowResults(false)} />
    );
  }

  if (profileLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading your data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── No Profile Warning ── */}
        {!hasProfile && (
          <View style={styles.noProfileBanner}>
            <Text style={styles.noProfileEmoji}>⚠️</Text>
            <View style={styles.noProfileContent}>
              <Text style={styles.noProfileTitle}>Profile Required</Text>
              <Text style={styles.noProfileDesc}>
                Please complete your Health Profile before running an
                assessment.
              </Text>
              <TouchableOpacity
                style={styles.noProfileBtn}
                onPress={() => router.push("/Patientprofilescreen" as any)}
              >
                <Text style={styles.noProfileBtnText}>Complete Profile →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Profile Banner (auto-filled) ── */}
        {hasProfile && (
          <View style={styles.profileBanner}>
            <Text style={styles.profileBannerTitle}>👤 Your Profile</Text>
            <View style={styles.profileChipsRow}>
              {[
                `🎂 ${userData.age} yrs`,
                `⚧ ${userData.gender}`,
                `💍 ${userData.married}`,
                `💼 ${userData.profession}`,
                `🚬 ${userData.smoking}`,
                `🍺 ${userData.alcohol}`,
              ].map((chip) => (
                <View key={chip} style={styles.profileChip}>
                  <Text style={styles.profileChipText}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── BODY METRICS ── */}
        <View style={styles.card}>
          <SectionHeader emoji="📏" title="Body Metrics" />
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Label text="Weight (kg) *" />
              <StyledInput
                value={userData.weight}
                onChange={(v) => handleChange("weight", v)}
                keyboardType="decimal-pad"
                placeholder="e.g. 70"
              />
            </View>
            <View style={styles.halfCol}>
              <Label text="Height (cm) *" />
              <StyledInput
                value={userData.height}
                onChange={(v) => handleChange("height", v)}
                keyboardType="decimal-pad"
                placeholder="e.g. 170"
              />
            </View>
          </View>
        </View>

        {/* ── LIFESTYLE ── */}
        <View style={styles.card}>
          <SectionHeader emoji="💪" title="Lifestyle Factors" />

          <Label text="Exercise Hours *" />
          <StyledInput
            value={userData.exercise_hours}
            onChange={(v) => handleChange("exercise_hours", v)}
            placeholder="e.g., 5"
            keyboardType="decimal-pad"
          />

          <Label text="Your Exercise Level" />
          <OptionGroup
            options={["low", "medium", "high"]}
            selected={userData.exercise}
            onSelect={() => {}}
          />

          <View style={styles.divider} />
          <FoodLogger
            meals={userData.meals}
            onMealsChange={handleMealsChange}
          />
          <View style={styles.divider} />

          <Label text="BP (mmHg)" />
          <StyledInput
            value={userData.blood_pressure}
            onChange={(v) => handleChange("blood_pressure", v)}
            keyboardType="numeric"
            placeholder="e.g. 120"
          />

          <Label text="Sleep (hours/day) *" />
          <StyledInput
            value={userData.sleep}
            onChange={(v) => handleChange("sleep", v)}
            placeholder="e.g., 7.5"
            keyboardType="decimal-pad"
          />

          {/* <Label text="Sugar Intake *" />
          <OptionGroup
            options={["low", "medium", "high"]}
            selected={userData.sugar_intake}
            onSelect={(v) => handleChange("sugar_intake", v)}
          /> */}
        </View>

        {/* ── HEALTH INFORMATION ── */}
        <View style={styles.card}>
          <SectionHeader emoji="🏥" title="Health Information" />
          <Label text="Disease Type" />
          <WrapOptionGroup
            options={DISEASE_TYPES}
            selected={userData.disease_type}
            onSelect={(v) => handleChange("disease_type", v)}
          />
          <Label text="Severity" />
          <OptionGroup
            options={SEVERITIES}
            selected={userData.severity}
            onSelect={(v) => handleChange("severity", v)}
          />
        </View>

        {/* ── BLOOD VALUES (smart card) ── */}
        <View style={styles.bloodCard}>
          {/* Header row */}
          <View style={styles.bloodCardHeader}>
            <SectionHeader emoji="🩸" title="Blood Values" />
            <TouchableOpacity
              style={[
                styles.editToggleBtn,
                isEditingBlood && styles.editToggleBtnActive,
              ]}
              onPress={() => setIsEditingBlood((prev) => !prev)}
            >
              <Text
                style={[
                  styles.editToggleText,
                  isEditingBlood && styles.editToggleTextActive,
                ]}
              >
                {isEditingBlood ? "✓ Lock" : "✏️ Update"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Last updated date */}
          {lastBloodDate && (
            <Text style={styles.lastUpdatedText}>
              📅 Last recorded: {lastBloodDate}
            </Text>
          )}

          {/* Status info box */}
          {hasStoredBlood && !isEditingBlood && (
            <View style={styles.storedValueBox}>
              <Text style={styles.storedValueText}>
                ✅ Using your latest recorded values. Tap{" "}
                <Text style={{ fontWeight: "800" }}>Update</Text> to change.
              </Text>
            </View>
          )}
          {!hasStoredBlood && !isEditingBlood && (
            <View style={styles.noValueBox}>
              <Text style={styles.noValueText}>
                ℹ️ No blood values recorded yet. Tap{" "}
                <Text style={{ fontWeight: "800" }}>Update</Text> to add.
              </Text>
            </View>
          )}
          {isEditingBlood && (
            <View style={styles.editingBox}>
              <Text style={styles.editingText}>
                ✏️ New values will be used in this assessment.
              </Text>
            </View>
          )}

          {/* Inputs */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Label text="Glucose (mg/dL)" />
              <StyledInput
                value={userData.glucose}
                onChange={(v) => handleChange("glucose", v)}
                keyboardType="numeric"
                placeholder="e.g. 100"
                editable={isEditingBlood}
              />
            </View>
            <View style={styles.halfCol}>
              <Label text="Cholesterol (mg/dL)" />
              <StyledInput
                value={userData.cholesterol}
                onChange={(v) => handleChange("cholesterol", v)}
                keyboardType="numeric"
                placeholder="e.g. 180"
                editable={isEditingBlood}
              />
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (loading || !hasProfile) && styles.submitBtnDisabled,
          ]}
          onPress={getAssessment}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitText}> Analyzing...</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>⚡ Get Health Assessment</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  content: { padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
  },
  loadingText: { marginTop: 12, color: "#059669", fontSize: 15 },

  // No Profile Banner
  noProfileBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#fed7aa",
  },
  noProfileEmoji: { fontSize: 28, marginRight: 12, marginTop: 2 },
  noProfileContent: { flex: 1 },
  noProfileTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400e",
    marginBottom: 4,
  },
  noProfileDesc: {
    fontSize: 13,
    color: "#78350f",
    lineHeight: 18,
    marginBottom: 12,
  },
  noProfileBtn: {
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  noProfileBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // Profile Banner
  profileBanner: {
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#6ee7b7",
  },
  profileBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  profileChip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  profileChipText: { fontSize: 12, color: "#065f46", fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },

  // Blood Values Card
  bloodCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#fecaca",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  bloodCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
    marginTop: -8,
  },
  editToggleBtn: {
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: "#6ee7b7",
  },
  editToggleBtnActive: { backgroundColor: "#059669", borderColor: "#059669" },
  editToggleText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  editToggleTextActive: { color: "#fff" },
  storedValueBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  storedValueText: { fontSize: 12, color: "#065f46", lineHeight: 17 },
  noValueBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  noValueText: { fontSize: 12, color: "#92400e", lineHeight: 17 },
  editingBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  editingText: { fontSize: 12, color: "#1e40af", lineHeight: 17 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  sectionEmoji: { fontSize: 26, marginRight: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
  },

  input: {
    borderWidth: 2,
    borderColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#f9fafb",
    borderColor: "#d1d5db",
    color: "#6b7280",
  },

  row: { flexDirection: "row", gap: 10 },
  halfCol: { flex: 1 },

  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#059669",
    alignItems: "center",
    backgroundColor: "#fff",
    minWidth: 60,
  },
  optionBtnActive: { backgroundColor: "#059669", borderColor: "#059669" },
  optionText: {
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    fontSize: 12,
  },
  optionTextActive: { color: "#fff" },

  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wrapBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#059669",
    backgroundColor: "#fff",
  },
  wrapText: {
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    fontSize: 11,
  },

  divider: { height: 1, backgroundColor: "#d1fae5", marginVertical: 16 },

  submitBtn: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 1,
  },
  loadingRow: { flexDirection: "row", alignItems: "center" },
});
