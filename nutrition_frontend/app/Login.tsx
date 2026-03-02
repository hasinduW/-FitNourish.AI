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

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      await login(u, p);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid username or password";
      Alert.alert("Login failed", message);
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to FitNourish.AI</Text>

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
          placeholder="Password"
          placeholderTextColor={GRAY_TEXT}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push("/Signup" as any)}
          disabled={loading}
        >
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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
