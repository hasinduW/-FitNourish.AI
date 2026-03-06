import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGrocery } from "../state/GroceryContext";

/**
 * ✅ IMPORTANT
 * Android Emulator: http://10.0.2.2:5000
 * Real Phone: http://YOUR_PC_IP:5000
 */
const BACKEND_BASE_URL = "http://127.0.0.1:5000"; // <-- change when needed

/** Theme Colors (same as yours) */
const COLORS = {
  GREEN: "#2E8B6D",
  GREEN_DARK: "#1F6A53",
  BG: "#F2F7F5",
  CARD: "#FFFFFF",
  BORDER: "#E2ECE7",
  TEXT: "#0E1A17",
  MUTED: "#5D6E69",

  INPUT_BG: "#FBFDFC",
  SOFT: "#EEF7F3",
  SOFT_BORDER: "#D6EFE5",

  LIGHT_GREEN: "#E9F6F0",
  LIGHT_GREEN_2: "#DDF3EB",

  DANGER_BG: "#FFEFEF",
  DANGER_BORDER: "#FFD6D6",
  DANGER_TEXT: "#B42318",

  SUBTLE: "#7A8A86",
};

type ProductSearchRow = {
  clean_product_id: number;
  canonical_name: string;
  normalized_name?: string | null;
  brand?: string | null;
  store?: string | null;
  size_value?: number | null;
  size_unit?: string | null;
  category_l1?: string | null;
  category_l2?: string | null;
};

export default function AlternativeScreen() {
  const router = useRouter();
  const { replaceItem } = useGrocery();

  const params = useLocalSearchParams<{
    itemId?: string;
    itemName?: string;
    itemQty?: string;
  }>();

  const targetId = String(params.itemId ?? "");
  const targetName = String(params.itemName ?? "");
  const targetQty = String(params.itemQty ?? "");

  // ✅ Search input (user can adjust keyword)
  const [query, setQuery] = useState(targetName || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductSearchRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = useMemo(
    () => results.find((r) => r.clean_product_id === selectedId),
    [results, selectedId]
  );

  // ----------- Backend fetch: search alternatives -----------
  const fetchAlternatives = async (q: string) => {
    const keyword = q.trim();
    if (!keyword) {
      setResults([]);
      return;
    }

    setLoading(true);
    setSelectedId(null);

    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/products/search?q=${encodeURIComponent(keyword)}&limit=20`
      );

      if (!res.ok) {
        const text = await res.text();
        console.log("search failed:", res.status, text);
        setResults([]);
        return;
      }

      const data = await res.json();
      setResults(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.log("search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // initial load using itemName
  useEffect(() => {
    if (targetName) fetchAlternatives(targetName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetName]);

  // ----------- Replace action -----------
  const onReplace = () => {
    if (!targetId) {
      Alert.alert("Missing item id", "Cannot replace because item id is missing.");
      return;
    }

    if (!selected) {
      Alert.alert("Select an alternative", "Please select one alternative first.");
      return;
    }

    Alert.alert(
      "Confirm Replace",
      `Replace "${targetName}" with "${selected.canonical_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Replace",
          onPress: () => {
            // ✅ Correct new replaceItem signature:
            replaceItem(targetId, {
              name: selected.canonical_name,
              qty: targetQty, // keep same qty (or you can change)
              clean_product_id: selected.clean_product_id,
            });

            // ✅ Go back to prices screen
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.TEXT} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Find Alternative (DB)</Text>
            <Text style={styles.subtitle}>
              Search products from your clean_products table
            </Text>
          </View>
        </View>
      </View>

      {/* Search box */}
      <View style={styles.searchCard}>
        <Text style={styles.sectionTitle}>Search keyword</Text>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={COLORS.MUTED} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="e.g., milk powder"
            placeholderTextColor={COLORS.SUBTLE}
            style={styles.searchInput}
          />
          <Pressable
            onPress={() => fetchAlternatives(query)}
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>

        <Text style={styles.smallHint}>
          Selected Item:{" "}
          <Text style={{ fontWeight: "900", color: COLORS.TEXT }}>
            {targetName} {targetQty ? `(${targetQty})` : ""}
          </Text>
        </Text>
      </View>

      {/* Results */}
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={[styles.sectionCard, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Results</Text>
          <Text style={styles.sectionSub}>
            Tap one result → then press Replace Item.
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator />
              <Text style={[styles.sectionSub, { marginTop: 10 }]}>
                Loading...
              </Text>
            </View>
          ) : results.length === 0 ? (
            <Text style={[styles.sectionSub, { marginTop: 12 }]}>
              No results. Try another keyword.
            </Text>
          ) : (
            <View style={{ marginTop: 10, gap: 10 }}>
              {results.map((p) => {
                const isSelected = p.clean_product_id === selectedId;

                return (
                  <Pressable
                    key={p.clean_product_id}
                    onPress={() => setSelectedId(p.clean_product_id)}
                    style={({ pressed }) => [
                      styles.resultCard,
                      isSelected && styles.resultCardSelected,
                      pressed && { opacity: 0.95 },
                    ]}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{p.canonical_name}</Text>

                        <Text style={styles.resultMeta}>
                          ID: {p.clean_product_id}
                          {p.brand ? ` • Brand: ${p.brand}` : ""}
                          {p.store ? ` • Store: ${p.store}` : ""}
                        </Text>

                        <Text style={styles.resultMeta}>
                          {p.size_value ? `${p.size_value}` : ""}
                          {p.size_unit ? `${p.size_unit}` : ""}
                          {p.category_l1 ? ` • ${p.category_l1}` : ""}
                          {p.category_l2 ? ` • ${p.category_l2}` : ""}
                        </Text>
                      </View>

                      {isSelected && (
                        <View style={styles.selectedTick}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.GREEN_DARK} />
                          <Text style={styles.selectedTickText}>Selected</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
        >
          <Ionicons name="arrow-back-outline" size={18} color={COLORS.GREEN_DARK} />
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>

        <Pressable
          onPress={onReplace}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
        >
          <Ionicons name="swap-horizontal-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Replace Item</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.BG, padding: 16 },

  headerCard: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.SOFT,
    borderWidth: 1,
    borderColor: COLORS.SOFT_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 18, fontWeight: "900", color: COLORS.TEXT },
  subtitle: { marginTop: 3, fontSize: 12, fontWeight: "700", color: COLORS.MUTED },

  searchCard: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 18,
    padding: 14,
  },

  sectionCard: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 18,
    padding: 14,
  },

  sectionTitle: { fontSize: 14, fontWeight: "900", color: COLORS.TEXT },
  sectionSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: COLORS.SUBTLE },

  searchRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.INPUT_BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  searchInput: { flex: 1, fontSize: 14, fontWeight: "800", color: COLORS.TEXT },

  searchBtn: {
    backgroundColor: COLORS.GREEN_DARK,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  searchBtnText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  smallHint: { marginTop: 10, fontSize: 12, fontWeight: "700", color: COLORS.MUTED },

  resultCard: {
    backgroundColor: COLORS.INPUT_BG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 18,
    padding: 12,
  },
  resultCardSelected: { borderColor: COLORS.GREEN, backgroundColor: "#F0FBF6" },

  resultName: { fontSize: 14, fontWeight: "900", color: COLORS.TEXT },
  resultMeta: { marginTop: 4, fontSize: 12, fontWeight: "700", color: COLORS.MUTED },

  selectedTick: { alignItems: "flex-end", gap: 4 },
  selectedTickText: { fontSize: 12, fontWeight: "900", color: COLORS.GREEN_DARK },

  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    gap: 10,
  },

  secondaryBtn: {
    flex: 1,
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtnText: { color: COLORS.GREEN_DARK, fontWeight: "900", fontSize: 13 },

  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.GREEN_DARK,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
});