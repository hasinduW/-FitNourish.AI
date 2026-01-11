import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { getHistory } from "../../src/api/client";

export default function HistoryTab() {
  const userId = "user_001";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getHistory(userId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History ({userId})</Text>

      <Pressable
        onPress={load}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: 0.7 },
          loading && { opacity: 0.6 },
        ]}
      >
        <Text style={styles.buttonText}>{loading ? "Loading..." : "Refresh"}</Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? <ActivityIndicator /> : null}

      <FlatList
        style={{ marginTop: 12 }}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Record #{item.id}</Text>
            <Text style={styles.cardText}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
            <Text style={styles.cardText}>kcal: {item.daily_kcal_need}</Text>
            <Text style={styles.cardText}>P: {item.protein_g_per_day} g</Text>
            <Text style={styles.cardText}>C: {item.carbs_g_per_day} g</Text>
            <Text style={styles.cardText}>F: {item.fat_g_per_day} g</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.cardText}>No records yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    minHeight: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000",
  },
  button: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#000",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
  },
  buttonText: {
    color: "#000",
    fontWeight: "600",
  },
  errorText: {
    marginTop: 10,
    marginBottom: 10,
    color: "#000",
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontWeight: "700",
    marginBottom: 4,
    color: "#000",
  },
  cardText: {
    color: "#000",
  },
});
