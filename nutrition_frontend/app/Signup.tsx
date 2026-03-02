import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const PRIMARY_GREEN = "#2EA37A";
const PRIMARY_GREEN_DARK = "#258C62";
const PRIMARY_GREEN_MEDIUM = "#279A6A";
const GRAY_LIGHT = "#E8E8E8";
const GRAY_TEXT = "#6B6B6B";

export default function Signup() {
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const u = username.trim();
    const p = password.trim();
    const cp = confirmPassword.trim();
    if (!fn || !ln) {
      Alert.alert("Error", "Please enter first name and last name");
      return;
    }
    if (!u || !p) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }
    if (u.length < 2) {
      Alert.alert("Error", "Username must be at least 2 characters");
      return;
    }
    if (p.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (p !== cp) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signup(fn, ln, u, p);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not create account";
      Alert.alert("Signup failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join FitNourish.AI</Text>

        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor={GRAY_TEXT}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor={GRAY_TEXT}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={GRAY_TEXT}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={GRAY_TEXT}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={GRAY_TEXT}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_GREEN_DARK,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: PRIMARY_GREEN_DARK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: GRAY_TEXT,
    marginBottom: 28,
  },
  input: {
    borderWidth: 2,
    borderColor: GRAY_LIGHT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#F5FBF8",
  },
  button: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  link: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: PRIMARY_GREEN_MEDIUM,
    fontSize: 15,
    fontWeight: "600",
  },
});
