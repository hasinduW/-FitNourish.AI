import React, { useEffect, useMemo, useState } from "react";
import {
View,
Text,
StyleSheet,
ScrollView,
Pressable,
Platform,
Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useGrocery, PriceRow, StorePrice } from "../state/GroceryContext";

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
SUBTLE: "#7A8A86",

CARD_TINT: "#F8FCFA",
DIVIDER: "#D9E7E1",
CHIP_BG: "#EAF7F0",
CHIP_BORDER: "#CFEBDD",
NA_BG: "#F3F6F5",
NA_BORDER: "#E2ECE7",

BEST_BG: "#E6FBF1",
BEST_BORDER: "#62D9A8",
BEST_GLOW: "rgba(46, 163, 122, 0.25)",
BEST_RIBBON_BG: "#2EA37A",
};

type StoreKey = "keells" | "cargills" | "spar";

const STORE_LABELS: Record<StoreKey, string> = {
keells: "Keells",
cargills: "Cargills",
spar: "Spar",
};

function qtyToNum(qty?: string) {
if (!qty) return 1;
const m = String(qty).match(/[0-9]+/);
const n = m ? parseInt(m[0], 10) : 1;
return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function PriceComparisonScreen() {
const router = useRouter();
const { items, prices, fetchPrices } = useGrocery();

const [recoLoading, setRecoLoading] = useState(false);
const [recoResult, setRecoResult] = useState<any>(null);

useEffect(() => {
if (items.length > 0) fetchPrices(items);
else fetchPrices([]);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [items]);

const getEffectivePrice = (s: StorePrice) => {
if (typeof s.final_price === "number") return s.final_price;
if (typeof s.price === "number") return s.price;
return null;
};

const getCheapestStore = (stores: StorePrice[]) => {
const list = (stores || [])
.map((s) => ({
store: (s.store || "").toLowerCase(),
price: getEffectivePrice(s),
}))
.filter((x) => typeof x.price === "number") as {
store: string;
price: number;
}[];

if (list.length === 0) return null;
return list.reduce((best, cur) => (cur.price < best.price ? cur : best));
};

const pricesById = useMemo(() => {
const map = new Map<number, PriceRow>();
(prices || []).forEach((p) => map.set(Number(p.clean_product_id), p));
return map;
}, [prices]);

const normalizeName = (s: string) =>
s
.toLowerCase()
.trim()
.replace(/\s+/g, " ")
.replace(/(\d)\s+(kg|g|l|ml)\b/g, "$1$2");

type GroupedCard = {
key: string;
name: string;
qty: number;
uiItemIds: string[];
cleanProductIds: number[];
stores: StorePrice[];
};

const groupedCards: GroupedCard[] = useMemo(() => {
const map = new Map<string, GroupedCard>();

for (const it of items) {
const name = String((it as any).name ?? "").trim();
const qty = Number((it as any).qty ?? 1);
const cid = Number((it as any).clean_product_id);
if (!name || !Number.isFinite(cid) || cid <= 0) continue;

const key = `${normalizeName(name)}__${qty}`;

if (!map.has(key)) {
map.set(key, {
key,
name,
qty,
uiItemIds: [],
cleanProductIds: [],
stores: [],
});
}

const g = map.get(key)!;
g.uiItemIds.push(String((it as any).id));
g.cleanProductIds.push(cid);

const row = pricesById.get(cid);
const rowStores = row?.stores ?? [];

for (const s of rowStores) {
const storeKey = String(s.store ?? "").toLowerCase().trim();
const existingIndex = g.stores.findIndex(
(x) => String(x.store ?? "").toLowerCase().trim() === storeKey
);

if (existingIndex === -1) {
g.stores.push(s);
} else {
const ex = g.stores[existingIndex];
const exPrice = getEffectivePrice(ex);
const newPrice = getEffectivePrice(s);

if (
typeof newPrice === "number" &&
(typeof exPrice !== "number" || newPrice < exPrice)
) {
g.stores[existingIndex] = s;
}
}
}
}

return Array.from(map.values());
}, [items, pricesById]);

const handleRecommendStore = () => {
if (!items || items.length === 0) {
Alert.alert("No items", "Please add items first.");
return;
}

const byKey = new Map<
string,
{ name: string; qty: number; candidate_clean_product_ids: number[] }
>();

for (const it of items) {
const name = String((it as any).name ?? "").trim();
if (!name) continue;

const qty = qtyToNum((it as any).qty);
const cid = Number((it as any).clean_product_id);
if (!Number.isFinite(cid) || cid <= 0) continue;

const key = `${normalizeName(name)}__${qty}`;
if (!byKey.has(key)) {
byKey.set(key, {
name,
qty,
candidate_clean_product_ids: [],
});
}
byKey.get(key)!.candidate_clean_product_ids.push(cid);
}

const conceptItems = Array.from(byKey.values()).map((x) => ({
name: x.name,
qty: x.qty,
candidate_clean_product_ids: Array.from(
new Set(x.candidate_clean_product_ids)
),
}));

if (conceptItems.length === 0) {
Alert.alert("No valid items", "Could not build a basket for recommendation.");
return;
}

router.push({
pathname: "/recommendation",
params: {
items: JSON.stringify(conceptItems),
source: "price_comparison",
},
});
};

const recommended = recoResult?.recommended;

return (
<View style={styles.screen}>
{/* Header */}
<View style={styles.headerCard}>
<View style={styles.headerTopRow}>
<Pressable
onPress={() => router.back()}
style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
hitSlop={10}
>
<Ionicons name="arrow-back" size={20} color={COLORS.TEXT} />
</Pressable>

<View style={{ flex: 1 }}>
<Text style={styles.title}>Item Prices</Text>
<Text style={styles.subtitle}>
Compare latest prices across available supermarkets.
</Text>
</View>

<View style={styles.headerBadgeMini}>
<Ionicons name="pricetag-outline" size={16} color={COLORS.GREEN_DARK} />
</View>
</View>
</View>

{/* Optional Recommended card */}
{recommended && (
<View style={styles.recoCard}>
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
<Ionicons name="navigate-outline" size={18} color={COLORS.GREEN_DARK} />
<Text style={styles.recoTitle}>
Recommended Store: {(recommended.store || "").toUpperCase()}
</Text>
</View>
<Text style={styles.recoLine}>Total Cost: Rs {recommended.total_cost ?? "N/A"}</Text>
<Text style={styles.recoLine}>
Distance: {recommended.distance_km ?? "N/A"} km
{recommended.duration_min != null ? ` • ${recommended.duration_min} min` : ""}
</Text>
<Text style={styles.recoLine}>Outlet: {recommended.nearest_outlet?.name ?? "N/A"}</Text>
</View>
)}

<ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
{groupedCards.map((g) => {
const stores = g.stores ?? [];
const cheapest = getCheapestStore(stores);

return (
<View key={g.key} style={styles.itemSection}>
<View style={styles.itemHeader}>
<View style={{ flex: 1 }}>
<Text style={styles.itemTitle}>
{g.name} <Text style={styles.qtyText}>({g.qty})</Text>
</Text>
<Text style={styles.itemSub}>Prices from Keells / Cargills</Text>
</View>

{cheapest && (
<View style={styles.badge}>
<Ionicons name="sparkles-outline" size={14} color={COLORS.GREEN_DARK} />
<Text style={styles.badgeText}>
Best:{" "}
{STORE_LABELS[(cheapest.store as StoreKey) ?? "keells"] ??
cheapest.store}
</Text>
</View>
)}
</View>

{/* ✅ Horizontal scroll + bigger card width so BEST badge is clear */}
<ScrollView
horizontal
showsHorizontalScrollIndicator={false}
contentContainerStyle={{ gap: 12, paddingVertical: 6 }}
>
{(["keells", "cargills"] as StoreKey[]).map((storeKey) => {
const storeRow =
stores.find((s) =>
(s.store || "").toLowerCase().includes(storeKey)
) ?? null;

const priceValue = storeRow ? getEffectivePrice(storeRow) : null;

const isCheapest =
cheapest &&
cheapest.store === storeKey &&
typeof priceValue === "number";

const hasPrice = typeof priceValue === "number";

return (
<View
key={storeKey}
style={[
styles.priceCard,
isCheapest && styles.priceCardBest,
!hasPrice && styles.priceCardNA,
]}
>
{/* ✅ BEST badge fixed on TOP RIGHT corner (won't overlap chip) */}
{isCheapest ? (
<View style={styles.bestBadge}>
<Ionicons name="trophy" size={14} color="#fff" />
<Text style={styles.bestBadgeText}>BEST PRICE</Text>
</View>
) : null}

{/* Store chip */}
<View style={styles.priceCardTop}>
<View style={styles.storeChip}>
<Ionicons
name="storefront-outline"
size={14}
color={COLORS.GREEN_DARK}
/>
<Text style={styles.storeName}>
{STORE_LABELS[storeKey]}
</Text>
</View>
</View>

{/* Price */}
<Text
style={[
styles.priceValue,
!hasPrice && { color: COLORS.SUBTLE },
]}
numberOfLines={1}
>
{hasPrice ? `Rs ${priceValue!.toFixed(2)}` : "N/A"}
</Text>

{/* Hint */}
{hasPrice ? (
storeRow?.price_per_unit != null ? (
<View style={styles.priceMetaRow}>
<Ionicons
name="information-circle-outline"
size={16}
color={COLORS.MUTED}
/>
<Text style={styles.smallHint} numberOfLines={2}>
{`PPU: Rs ${storeRow.price_per_unit.toFixed(2)}`}
</Text>
</View>
) : null
) : (
<View style={styles.priceMetaRow}>
<Ionicons
name="information-circle-outline"
size={16}
color={COLORS.MUTED}
/>
<Text style={styles.smallHint} numberOfLines={2}>
No price found
</Text>
</View>
)}


</View>
);
})}
</ScrollView>
</View>
);
})}
</ScrollView>

{/* Bottom CTA */}
<View style={styles.bottomBar}>
<Pressable
onPress={handleRecommendStore}
style={({ pressed }) => [
styles.primaryBtn,
pressed && { opacity: 0.92 },
]}
disabled={recoLoading}
>
<Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
<Text style={styles.primaryBtnText}>
{recoLoading ? "Calculating..." : "Find Cheapest & Nearest Store"}
</Text>
</Pressable>
</View>
</View>
);
}

const styles = StyleSheet.create({
screen: { flex: 1, backgroundColor: COLORS.BG, padding: 16 },

headerCard: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 20,
padding: 14,
marginBottom: 12,
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.06,
shadowRadius: 12,
shadowOffset: { width: 0, height: 5 },
},
android: { elevation: 2 },
}),
},
headerTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
iconBtn: {
width: 40,
height: 40,
borderRadius: 14,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
alignItems: "center",
justifyContent: "center",
},
headerBadgeMini: {
width: 40,
height: 40,
borderRadius: 14,
backgroundColor: COLORS.LIGHT_GREEN,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
alignItems: "center",
justifyContent: "center",
},
title: { fontSize: 18, fontWeight: "900", color: COLORS.TEXT },
subtitle: { marginTop: 3, fontSize: 12, fontWeight: "700", color: COLORS.MUTED },

recoCard: {
backgroundColor: COLORS.LIGHT_GREEN,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
borderRadius: 20,
padding: 14,
marginBottom: 12,
},
recoTitle: { fontSize: 14, fontWeight: "900", color: COLORS.TEXT },
recoLine: { marginTop: 6, fontSize: 12, fontWeight: "800", color: COLORS.MUTED },

itemSection: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 20,
padding: 14,
marginBottom: 12,
},
itemHeader: {
flexDirection: "row",
justifyContent: "space-between",
gap: 10,
alignItems: "flex-start",
marginBottom: 12,
},
itemTitle: { fontSize: 15, fontWeight: "900", color: COLORS.TEXT },
qtyText: { fontSize: 14, fontWeight: "900", color: COLORS.SUBTLE },
itemSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: COLORS.SUBTLE },

badge: {
flexDirection: "row",
alignItems: "center",
gap: 6,
backgroundColor: COLORS.CHIP_BG,
borderWidth: 1,
borderColor: COLORS.CHIP_BORDER,
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 999,
},
badgeText: { fontSize: 12, fontWeight: "900", color: COLORS.GREEN_DARK },

// ✅ Wider store card (fixed) so badge is always visible
priceCard: {
width: 230, // ✅ increased width
backgroundColor: COLORS.CARD_TINT,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 18,
padding: 10,
paddingTop: 48, // ✅ reserve space so badge never overlaps chip
minHeight: 140,
position: "relative",
overflow: "hidden",
},
priceCardBest: {
backgroundColor: COLORS.BEST_BG,
borderColor: COLORS.BEST_BORDER,
borderWidth: 2,
...Platform.select({
ios: {
shadowColor: COLORS.BEST_GLOW,
shadowOpacity: 0.9,
shadowRadius: 14,
shadowOffset: { width: 0, height: 10 },
},
android: { elevation: 4 },
}),
},
priceCardNA: {
backgroundColor: COLORS.NA_BG,
borderColor: COLORS.NA_BORDER,
},

// ✅ badge placed top-right and always above everything
bestBadge: {
position: "absolute",
top: 10,
right: 10,
zIndex: 50,
flexDirection: "row",
alignItems: "center",
gap: 6,
backgroundColor: COLORS.BEST_RIBBON_BG,
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 999,
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.12,
shadowRadius: 10,
shadowOffset: { width: 0, height: 4 },
},
android: { elevation: 4 },
}),
},
bestBadgeText: { color: "#fff", fontWeight: "900", fontSize: 11 },

priceCardTop: {
position: "absolute",
top: 10,
left: 10,
right: 10,
flexDirection: "row",
alignItems: "center",
justifyContent: "flex-start",
},

storeChip: {
flexDirection: "row",
alignItems: "center",
gap: 6,
backgroundColor: "#FFFFFF",
borderWidth: 1,
borderColor: COLORS.DIVIDER,
paddingHorizontal: 10,
paddingVertical: 7,
borderRadius: 999,
},
storeName: { fontSize: 13, fontWeight: "900", color: COLORS.TEXT },

priceValue: {
marginTop: 18,
fontSize: 26,
fontWeight: "900",
color: COLORS.TEXT,
letterSpacing: 0.2,
},

priceMetaRow: {
marginTop: 10,
flexDirection: "row",
alignItems: "flex-start",
gap: 6,
},
smallHint: {
flex: 1,
fontSize: 12,
fontWeight: "800",
color: COLORS.MUTED,
lineHeight: 16,
},

bottomBar: {
position: "absolute",
left: 16,
right: 16,
bottom: 16,
padding: 10,
borderRadius: 18,
},
primaryBtn: {
backgroundColor: COLORS.GREEN_DARK,
borderRadius: 20,
paddingVertical: 14,
paddingHorizontal: 16,
alignItems: "center",
justifyContent: "center",
flexDirection: "row",
gap: 10,
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.12,
shadowRadius: 12,
shadowOffset: { width: 0, height: 6 },
},
android: { elevation: 3 },
}),
},
primaryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
