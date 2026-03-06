import React, { useEffect, useMemo, useState } from "react";
import {
View,
Text,
TextInput,
Pressable,
FlatList,
StyleSheet,
Platform,
ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProductGroupSearchRow, useGrocery } from "../state/GroceryContext";

/** Theme Colors */
const COLORS = {
GREEN: "#2E8B6D",
GREEN_DARK: "#1F6A53",
BG: "#F2F7F5",
CARD: "#FFFFFF",
BORDER: "#E2ECE7",
TEXT: "#0E1A17",
MUTED: "#5D6E69",
INPUT_BG: "#FBFDFC",
SOFT_CARD: "#EEF7F2", // ✅ not pure white
SOFT_BORDER: "#CFE7DA",
SUBTLE: "#7A8A86",
};

type Row =
| { type: "header" }
| { type: "searchBox" }
| { type: "startTyping" }
| { type: "resultsTitle"; count: number }
| { type: "result"; product: ProductGroupSearchRow };

export default function SearchItemsScreen() {
const router = useRouter();
const {
searchProducts,
cartCount,
getQtyByGroupKey,
setGroupQty,
incGroup,
decGroup,
} = useGrocery();

const [query, setQuery] = useState("");
const [loading, setLoading] = useState(false);
const [results, setResults] = useState<ProductGroupSearchRow[]>([]);

// ✅ Debounce search
useEffect(() => {
const q = query.trim();
if (!q) {
setResults([]);
setLoading(false);
return;
}

const t = setTimeout(async () => {
setLoading(true);
const rows = await searchProducts(q, 25);
setResults(rows);
setLoading(false);
}, 300);

return () => clearTimeout(t);
}, [query, searchProducts]);

const rows: Row[] = useMemo(() => {
const r: Row[] = [];
r.push({ type: "header" });
r.push({ type: "searchBox" });

if (!query.trim()) {
r.push({ type: "startTyping" });
return r;
}

r.push({ type: "resultsTitle", count: results.length });
results.forEach((p) => r.push({ type: "result", product: p }));
return r;
}, [query, results]);

const onClear = () => {
setQuery("");
setResults([]);
};

const goToMyList = () => {
router.push("/item_list");
};

return (
<View style={styles.screen}>
<FlatList
data={rows}
keyExtractor={(row, idx) => {
if (row.type === "result") return `r-${row.product.primary_clean_product_id}`;
return `${row.type}-${idx}`;
}}
keyboardShouldPersistTaps="handled"
contentContainerStyle={{ paddingBottom: cartCount > 0 ? 130 : 24 }}
renderItem={({ item }) => {
if (item.type === "header") {
return (
<View style={styles.headerRow}>
<Pressable
onPress={() => router.back()}
style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
hitSlop={10}
>
<Ionicons name="arrow-back" size={20} color={COLORS.TEXT} />
</Pressable>

<Text style={styles.headerTitle}>Search Items</Text>
<View style={{ width: 36 }} />
</View>
);
}

if (item.type === "searchBox") {
return (
<View style={styles.searchCard}>
<Text style={styles.label}>Search items</Text>

<View style={styles.searchInputRow}>
<Ionicons name="search" size={18} color={COLORS.SUBTLE} />
<TextInput
placeholder="Type: milk / chicken..."
placeholderTextColor={COLORS.SUBTLE}
value={query}
onChangeText={setQuery}
style={styles.input}
autoCorrect={false}
autoCapitalize="none"
/>

{query.trim() ? (
<Pressable
onPress={onClear}
style={({ pressed }) => [
styles.clearBtn,
pressed && { opacity: 0.8 },
]}
hitSlop={10}
>
<Text style={styles.clearText}>Clear</Text>
</Pressable>
) : null}
</View>

{!!query.trim() ? (
<Text style={styles.countText}>
{loading ? "Searching..." : `${results.length} Items`}
</Text>
) : null}

{loading ? (
<View style={{ paddingTop: 10 }}>
<ActivityIndicator />
</View>
) : null}
</View>
);
}

if (item.type === "startTyping") {
return (
<View style={styles.startTypingCard}>
<Text style={styles.startTitle}>Start typing</Text>
<Text style={styles.startSub}>Search your products here.</Text>
</View>
);
}

if (item.type === "resultsTitle") {
return (
<Text style={styles.sectionTitle}>
Search Results ({item.count})
</Text>
);
}

if (item.type === "result") {
const p = item.product;
const qty = getQtyByGroupKey(p.group_key);

const stores = Array.from(
new Set(
(p.variants ?? [])
.map((v) => String(v.store ?? "").toLowerCase())
.filter(Boolean)
)
);

const storeLabel = stores.length
? `Available: ${stores.join(" / ")}`
: "";

const first = p.variants?.[0];
const hintBits: string[] = [];
if (first?.brand) hintBits.push(String(first.brand));
if (first?.size_value != null) {
hintBits.push(`${first.size_value}${first.size_unit ?? ""}`);
}
const hint = hintBits.length ? hintBits.join(" • ") : "";

return (
<View style={styles.resultCard}>
<View style={{ flex: 1 }}>
<Text style={styles.resultName}>{p.canonical_name}</Text>
{storeLabel ? <Text style={styles.meta}>{storeLabel}</Text> : null}
{hint ? <Text style={styles.meta}>{hint}</Text> : null}
</View>

{qty <= 0 ? (
<Pressable
onPress={() => setGroupQty(p, 1)}
style={({ pressed }) => [
styles.addBtn,
pressed && { opacity: 0.9 },
]}
>
<Text style={styles.addText}>ADD</Text>
</Pressable>
) : (
<View style={styles.stepper}>
<Pressable
onPress={() => decGroup(p)}
style={({ pressed }) => [
styles.stepBtn,
pressed && { opacity: 0.7 },
]}
hitSlop={10}
>
<Text style={styles.stepSymbol}>−</Text>
</Pressable>

<Text style={styles.qtyText}>{qty}</Text>

<Pressable
onPress={() => incGroup(p)}
style={({ pressed }) => [
styles.stepBtn,
pressed && { opacity: 0.7 },
]}
hitSlop={10}
>
<Text style={styles.stepSymbol}>+</Text>
</Pressable>
</View>
)}
</View>
);
}

return null;
}}
/>

{/* Bottom review card */}
{cartCount > 0 ? (
<Pressable
onPress={goToMyList}
style={({ pressed }) => [
styles.bottomCard,
pressed && { opacity: 0.95 },
]}
>
<View style={styles.bottomLeft}>
<View style={styles.cartCircle}>
<Ionicons name="cart" size={18} color="#fff" />
</View>
<View>
<Text style={styles.bottomCount}>{cartCount} Items</Text>
<Text style={styles.bottomSub}>Tap to review</Text>
</View>
</View>

<View style={styles.bottomRight}>
<Text style={styles.bottomAction}>View My Item List</Text>
<Ionicons name="chevron-forward" size={18} color="#fff" />
</View>
</Pressable>
) : null}
</View>
);
}

const styles = StyleSheet.create({
screen: { flex: 1, backgroundColor: COLORS.BG, padding: 16 },

headerRow: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
marginBottom: 8,
},
backBtn: {
width: 36,
height: 36,
borderRadius: 12,
backgroundColor: "rgba(255,255,255,0.7)",
borderWidth: 1,
borderColor: COLORS.BORDER,
alignItems: "center",
justifyContent: "center",
},
headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.TEXT },

searchCard: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 18,
padding: 14,
marginBottom: 12,
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.05,
shadowRadius: 10,
shadowOffset: { width: 0, height: 3 },
},
android: { elevation: 1 },
}),
},
label: {
fontSize: 12,
color: COLORS.MUTED,
marginBottom: 10,
fontWeight: "800",
},
searchInputRow: {
flexDirection: "row",
alignItems: "center",
gap: 10,
backgroundColor: COLORS.INPUT_BG,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 14,
paddingHorizontal: 12,
paddingVertical: 10,
},
input: {
flex: 1,
paddingVertical: 8,
color: COLORS.TEXT,
fontWeight: "700",
},
clearBtn: {
paddingHorizontal: 12,
paddingVertical: 8,
borderRadius: 999,
backgroundColor: "#DDEFE6",
borderWidth: 1,
borderColor: "#C8E4D8",
},
clearText: { color: COLORS.GREEN_DARK, fontWeight: "900" },
countText: { marginTop: 10, color: COLORS.MUTED, fontWeight: "800" },

// ✅ Start typing card (soft highlight + dashed border)
startTypingCard: {
backgroundColor: COLORS.SOFT_CARD,
borderWidth: 2,
borderColor: COLORS.SOFT_BORDER,
borderStyle: "dashed",
borderRadius: 18,
padding: 16,
marginTop: 6,
},
startTitle: { fontSize: 16, fontWeight: "900", color: COLORS.TEXT },
startSub: { marginTop: 6, color: COLORS.MUTED, fontWeight: "700" },

sectionTitle: {
marginTop: 4,
marginBottom: 10,
fontSize: 14,
fontWeight: "900",
color: COLORS.TEXT,
},

resultCard: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 18,
padding: 14,
marginBottom: 10,
flexDirection: "row",
alignItems: "center",
gap: 12,
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.04,
shadowRadius: 10,
shadowOffset: { width: 0, height: 3 },
},
android: { elevation: 1 },
}),
},
resultName: { color: COLORS.TEXT, fontWeight: "900", fontSize: 14 },
meta: { marginTop: 6, color: COLORS.MUTED, fontSize: 12, fontWeight: "800" },

addBtn: {
backgroundColor: COLORS.GREEN_DARK,
borderRadius: 16,
paddingHorizontal: 18,
paddingVertical: 12,
minWidth: 86,
alignItems: "center",
justifyContent: "center",
},
addText: { color: "#fff", fontWeight: "900" },

stepper: {
flexDirection: "row",
alignItems: "center",
backgroundColor: "#E6F2EC",
borderWidth: 1,
borderColor: "#D0E7DB",
borderRadius: 16,
paddingHorizontal: 10,
paddingVertical: 8,
gap: 10,
minWidth: 110,
justifyContent: "space-between",
},
stepBtn: {
width: 34,
height: 34,
borderRadius: 12,
alignItems: "center",
justifyContent: "center",
backgroundColor: "#DCEFE6",
},
stepSymbol: { fontSize: 20, fontWeight: "900", color: COLORS.GREEN_DARK },
qtyText: { fontWeight: "900", color: COLORS.TEXT, minWidth: 18, textAlign: "center" },

bottomCard: {
position: "absolute",
left: 16,
right: 16,
bottom: 16,
backgroundColor: COLORS.GREEN_DARK,
borderRadius: 22,
paddingVertical: 14,
paddingHorizontal: 14,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
},
bottomLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
cartCircle: {
width: 38,
height: 38,
borderRadius: 14,
backgroundColor: "rgba(255,255,255,0.18)",
alignItems: "center",
justifyContent: "center",
},
bottomCount: { color: "#fff", fontWeight: "900" },
bottomSub: { color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 12, marginTop: 2 },

bottomRight: { flexDirection: "row", alignItems: "center", gap: 8 },
bottomAction: { color: "#fff", fontWeight: "900" },
});
