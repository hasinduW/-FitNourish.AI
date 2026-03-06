// screens/ReviewItemListScreen.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useGrocery } from "../state/GroceryContext";

const COLORS = {
GREEN: "#2EA37A",
GREEN_DARK: "#1F6A53",
BG: "#F2F7F5",
CARD: "#FFFFFF",
BORDER: "#E2ECE7",
TEXT: "#0E1A17",
MUTED: "#5D6E69",
SUBTLE: "#7A8A86",
LIGHT_GREEN: "#E9F6F0",
LIGHT_GREEN_2: "#DDF3EB",
};

type UiConcept = {
group_key: string;
name: string;
qty: number;
primaryId: number;
};

export default function ReviewItemListScreen() {
const router = useRouter();
const { items, removeGroup, setGroupQty } = useGrocery();

// concepts (grouped)
const concepts: UiConcept[] = useMemo(() => {
const map = new Map<string, UiConcept>();
for (const it of items) {
if (!it.group_key) continue;
if (!map.has(it.group_key)) {
map.set(it.group_key, {
group_key: it.group_key,
name: it.name,
qty: Number(it.qty) || 1,
primaryId: Number(it.clean_product_id) || 0,
});
}
}
return Array.from(map.values()).reverse();
}, [items]);

const clearAll = () => {
for (const c of concepts) removeGroup(c.group_key);
};

const updateQty = (c: UiConcept, nextQty: number) => {
const q = Math.max(0, Math.floor(nextQty));

// Use existing context method; variants can be empty.
setGroupQty(
{
group_key: c.group_key,
canonical_name: c.name,
primary_clean_product_id: c.primaryId,
variants: [],
},
q
);

if (q <= 0) removeGroup(c.group_key);
};

return (
<View style={styles.screen}>
{/* Header */}
<View style={styles.header}>
<Pressable
onPress={() => router.push("/")}
style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
>
<Ionicons name="arrow-back" size={22} color={COLORS.TEXT} />
</Pressable>

<Text style={styles.headerTitle}>Review Item List</Text>

<Pressable
onPress={clearAll}
disabled={concepts.length === 0}
style={({ pressed }) => [
styles.clearBtn,
concepts.length === 0 && { opacity: 0.4 },
pressed && concepts.length > 0 && { opacity: 0.75 },
]}
>
<Text style={styles.clearText}>Clear</Text>
</Pressable>
</View>

{/* “Your list is ready” card (Qty pill removed) */}
<View style={styles.readyCard}>
<View style={styles.readyLeft}>
<View style={styles.readyIconWrap}>
<Ionicons name="bag-handle-outline" size={18} color={COLORS.GREEN_DARK} />
</View>

<View style={{ flex: 1 }}>
<Text style={styles.readyTitle}>Your list is ready</Text>
<Text style={styles.readySub}>
You have {concepts.length} items in your list
</Text>
</View>
</View>
</View>

{/* Item list (image space removed) */}
<FlatList
data={concepts}
keyExtractor={(c) => c.group_key}
contentContainerStyle={{ paddingBottom: 18 }}
renderItem={({ item }) => (
<View style={styles.itemCard}>
<View style={styles.itemMid}>
<Text numberOfLines={2} style={styles.itemName}>
{item.name}
</Text>
<Text style={styles.itemHint}>Update quantity</Text>
</View>

{/* Stepper */}
<View style={styles.stepper}>
<Pressable
onPress={() => updateQty(item, item.qty - 1)}
style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.8 }]}
>
<Ionicons name="remove" size={20} color="#fff" />
</Pressable>

<Text style={styles.qtyText}>{item.qty}</Text>

<Pressable
onPress={() => updateQty(item, item.qty + 1)}
style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.8 }]}
>
<Ionicons name="add" size={20} color="#fff" />
</Pressable>
</View>
</View>
)}
ListEmptyComponent={
<View style={styles.emptyWrap}>
<Text style={styles.emptyTitle}>No items yet</Text>
<Text style={styles.emptySub}>Go back and add items from Search.</Text>
</View>
}
/>
</View>
);
}

const styles = StyleSheet.create({
screen: { flex: 1, backgroundColor: COLORS.BG, padding: 16 },

header: {
height: 54,
backgroundColor: COLORS.CARD,
borderRadius: 18,
borderWidth: 1,
borderColor: COLORS.BORDER,
paddingHorizontal: 10,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
marginBottom: 12,
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.06,
shadowRadius: 10,
shadowOffset: { width: 0, height: 4 },
},
android: { elevation: 2 },
}),
},
headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
headerTitle: { fontSize: 16, fontWeight: "900", color: COLORS.TEXT },
clearBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
clearText: { color: COLORS.GREEN_DARK, fontWeight: "900" },

readyCard: {
backgroundColor: COLORS.LIGHT_GREEN,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
borderRadius: 18,
padding: 14,
marginBottom: 12,
},
readyLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
readyIconWrap: {
width: 38,
height: 38,
borderRadius: 12,
backgroundColor: "rgba(46,163,122,0.12)",
alignItems: "center",
justifyContent: "center",
},
readyTitle: { fontWeight: "900", color: COLORS.TEXT, fontSize: 14 },
readySub: { marginTop: 2, color: COLORS.MUTED, fontWeight: "700" },

itemCard: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 18,
padding: 14,
marginBottom: 12,
flexDirection: "row",
alignItems: "center",
gap: 12,
...Platform.select({
ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
android: { elevation: 2 },
}),
},
itemMid: { flex: 1 },
itemName: { fontWeight: "900", color: COLORS.TEXT, fontSize: 14 },
itemHint: { marginTop: 6, color: COLORS.SUBTLE, fontWeight: "700" },

stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
stepBtn: {
width: 44,
height: 44,
borderRadius: 16,
backgroundColor: COLORS.GREEN_DARK,
alignItems: "center",
justifyContent: "center",
},
qtyText: { width: 18, textAlign: "center", fontWeight: "900", color: COLORS.TEXT, fontSize: 14 },

emptyWrap: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 18,
padding: 16,
},
emptyTitle: { fontWeight: "900", color: COLORS.TEXT, marginBottom: 6 },
emptySub: { color: COLORS.MUTED, fontWeight: "700" },
});
