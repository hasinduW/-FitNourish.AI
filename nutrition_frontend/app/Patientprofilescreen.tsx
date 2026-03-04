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

import { API_URL } from "../types/constants";
import { useAuth } from "@/contexts/AuthContext";

// ── Reusable UI ───────────────────────────────────────────────────

const Label = ({ text }: { text: string }) => (
  <Text style={styles.label}>{text}</Text>
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

const WrapOptions = ({
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

// ── Main Screen ───────────────────────────────────────────────────

export default function PatientProfileScreen() {
  const { user } = useAuth();

  const USER_ID = user?.user_id;

  interface PatientProfile {
    userId: string | undefined;
    age: string;
    gender: string;
    married: string;
    profession: string;
    smoking: string;
    alcohol: string;
  }

  const INITIAL: PatientProfile = {
    userId: USER_ID,
    age: "",
    gender: "",
    married: "",
    profession: "",
    smoking: "",
    alcohol: "",
  };

  const PROFESSIONS = [
    "office_worker",
    "teacher",
    "artist",
    "farmer",
    "driver",
    "engineer",
    "student",
    "doctor",
    "other",
  ];
  const [profile, setProfile] = useState<PatientProfile>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Load existing profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/patient/profile/${USER_ID}`);
      const data = await res.json();
      if (data.success) {
        setProfile({
          userId: data.data.userId,
          age: String(data.data.age),
          gender: data.data.gender,
          married: data.data.married,
          profession: data.data.profession,
          smoking: data.data.smoking,
          alcohol: data.data.alcohol,
        });
      }
    } catch (e) {
      console.log("No existing profile found");
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (field: keyof PatientProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const required: (keyof PatientProfile)[] = [
      "age",
      "gender",
      "married",
      "profession",
      "smoking",
      "alcohol",
    ];
    const missing = required.filter((f) => !profile[f]);
    if (missing.length) {
      Alert.alert("Missing Fields", `Please fill: ${missing.join(", ")}`);
      return false;
    }
    if (isNaN(Number(profile.age)) || Number(profile.age) <= 0) {
      Alert.alert("Invalid Age", "Please enter a valid age.");
      return false;
    }
    return true;
  };

  const saveProfile = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...profile, age: parseInt(profile.age) };
      const res = await fetch(`${API_URL}/api/patient/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("✅ Saved!", "Your profile has been saved successfully.", [
          {
            text: "Go to Assessment",
            onPress: () => router.push("/AssessmentScreen" as any),
          },
        ]);
      } else {
        Alert.alert("Error", data.error || "Failed to save profile");
      }
    } catch (e) {
      Alert.alert("Connection Error", "Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
        {/* Header */}
        <Text style={styles.header}>Patient Profile</Text>
        <Text style={styles.subHeader}>
          Fill in your basic information once. We'll use this for every
          assessment.
        </Text>

        <View style={styles.card}>
          {/* Age */}
          <Label text="Age *" />
          <TextInput
            style={styles.input}
            value={profile.age}
            onChangeText={(v) => handleChange("age", v)}
            placeholder="Enter your age"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />

          {/* Gender */}
          <Label text="Gender *" />
          <OptionGroup
            options={["Male", "Female"]}
            selected={profile.gender}
            onSelect={(v) => handleChange("gender", v)}
          />

          {/* Married */}
          <Label text="Married *" />
          <OptionGroup
            options={["no", "yes"]}
            selected={profile.married}
            onSelect={(v) => handleChange("married", v)}
          />

          {/* Profession */}
          <Label text="Profession *" />
          <WrapOptions
            options={PROFESSIONS}
            selected={profile.profession}
            onSelect={(v) => handleChange("profession", v)}
          />

          {/* Smoking */}
          <Label text="Smoking *" />
          <OptionGroup
            options={["no", "yes"]}
            selected={profile.smoking}
            onSelect={(v) => handleChange("smoking", v)}
          />

          {/* Alcohol */}
          <Label text="Alcohol *" />
          <OptionGroup
            options={["no", "yes"]}
            selected={profile.alcohol}
            onSelect={(v) => handleChange("alcohol", v)}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.saveBtnText}> Saving...</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>💾 Save & Continue</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F7F5" },
  content: { padding: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: { marginTop: 12, color: "#059669", fontSize: 15 },

  header: {
    fontSize: 28,
    fontWeight: "900",
    color: "#065f46",
    marginBottom: 6,
    marginTop: 20,
  },
  subHeader: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },

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

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
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

  optionRow: { flexDirection: "row", gap: 8 },
  optionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#059669",
    alignItems: "center",
    backgroundColor: "#fff",
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

  saveBtn: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  loadingRow: { flexDirection: "row", alignItems: "center" },
});
