// RecommendationScreen.tsx
// ✅ Only style changes + small layout polish (no logic changes)

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import {
View,
Text,
StyleSheet,
Pressable,
Platform,
ScrollView,
Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import polyline from "@mapbox/polyline";

import { useGrocery } from "../state/GroceryContext";
import {
recommendStore,
RecommendStoreRequest,
TravelMode,
TravelProvider,
CostModel,
} from "../../../src/api/recommend";
import { fetchAiInsights } from "../../../src/api/ai";
import AiInsightsSheet from "../ui/AiInsightsSheet";

const COLORS = {
GREEN: "#2E8B6D",
GREEN_DARK: "#1F6A53",
BG: "#F2F7F5",
CARD: "#FFFFFF",
BORDER: "#E2ECE7",
TEXT: "#0E1A17",
MUTED: "#5D6E69",
SOFT: "#EEF7F3",
SOFT_BORDER: "#D6EFE5",
LIGHT_GREEN: "#E9F6F0",
LIGHT_GREEN_2: "#DDF3EB",
SUBTLE: "#7A8A86",
DANGER_TEXT: "#B42318",

// ✨ extra polish colors
HEADER_GRADIENT_1: "#EAF7F1",
HEADER_GRADIENT_2: "#F7FBF9",
SHADOW: "rgba(16, 24, 40, 0.08)",
OUTLINE: "rgba(46, 139, 109, 0.18)",
};

const STORE_LABELS: Record<string, string> = {
keells: "Keells",
cargills: "Cargills",
spar: "Spar",
};

const MOCK_COLOMBO = { lat: 6.9271, lng: 79.8612 };

const SRI_LANKA_BOUNDS = {
minLat: 5.5,
maxLat: 10.5,
minLng: 79.0,
maxLng: 82.5,
};

function isInSriLanka(lat: number, lng: number) {
return (
lat >= SRI_LANKA_BOUNDS.minLat &&
lat <= SRI_LANKA_BOUNDS.maxLat &&
lng >= SRI_LANKA_BOUNDS.minLng &&
lng <= SRI_LANKA_BOUNDS.maxLng
);
}

function toNum(v: any): number | null {
const n = typeof v === "number" ? v : Number(v);
return Number.isFinite(n) ? n : null;
}

export default function RecommendationScreen() {
const [aiOpen, setAiOpen] = useState(false);
const [aiText, setAiText] = useState("");
const [aiLoading, setAiLoading] = useState(false);

const router = useRouter();
const params = useLocalSearchParams();
const { items } = useGrocery() as any;

const source = useMemo(() => String((params as any)?.source ?? ""), [params]);

const conceptItemsFromParams = useMemo(() => {
const raw = params?.items;
if (!raw) return null;
try {
const s = Array.isArray(raw) ? String(raw[0]) : String(raw);
const parsed = JSON.parse(s);
if (!Array.isArray(parsed)) return null;
return parsed
.map((it: any) => {
const qty = Number(it?.qty ?? 1);
const cands = Array.isArray(it?.candidate_clean_product_ids)
? it.candidate_clean_product_ids
.map((x: any) => Number(x))
.filter((n: any) => Number.isFinite(n) && n > 0)
: [];
return {
name: String(it?.name ?? "").trim(),
qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
candidate_clean_product_ids: Array.from(new Set(cands)),
};
})
.filter((x: any) => x.candidate_clean_product_ids.length > 0);
} catch {
return null;
}
}, [params?.items]);

const mapRef = useRef<MapView | null>(null);

const [loading, setLoading] = useState(false);
const [result, setResult] = useState<any>(null);
const [showPartial, setShowPartial] = useState(false);

const [useMock, setUseMock] = useState(true);
const [travelMode, setTravelMode] = useState<TravelMode>("driving");
const [provider, setProvider] = useState<TravelProvider>("google");
const [costModel, setCostModel] = useState<CostModel>("distance");

const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(
null
);

const payloadItems = useMemo(() => {
if (conceptItemsFromParams && conceptItemsFromParams.length) {
return conceptItemsFromParams.map((x: any) => ({
candidate_clean_product_ids: x.candidate_clean_product_ids,
qty: x.qty,
name: x.name,
}));
}

return (items || [])
.map((it: any) => ({
clean_product_id: Number(it.clean_product_id ?? it.id),
qty: Number(it.qty ?? 1),
}))
.filter((x: any) => Number.isFinite(x.clean_product_id) && x.clean_product_id > 0);
}, [items, conceptItemsFromParams]);

const multiItems = useMemo(() => {
if (conceptItemsFromParams && conceptItemsFromParams.length) {
return conceptItemsFromParams.map((x: any) => ({
candidate_clean_product_ids: x.candidate_clean_product_ids,
qty: x.qty,
name: x.name,
}));
}

const list = (items || [])
.map((it: any) => ({
clean_product_id: Number(it.clean_product_id ?? it.id),
qty: Number(it.qty ?? 1),
}))
.filter((x: any) => Number.isFinite(x.clean_product_id) && x.clean_product_id > 0);

const qtyBy = new Map<number, number>();
for (const x of list) {
qtyBy.set(x.clean_product_id, (qtyBy.get(x.clean_product_id) ?? 0) + Number(x.qty || 1));
}

return Array.from(qtyBy.entries()).map(([clean_product_id, qty]) => ({
clean_product_id,
qty,
}));
}, [items, conceptItemsFromParams]);

const activeLocation = useMemo(() => {
if (!useMock && gpsLocation) return gpsLocation;
return MOCK_COLOMBO;
}, [useMock, gpsLocation]);

async function fetchGpsOnceAndMaybeAutoMock() {
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== "granted") {
Alert.alert("Location required", "Please allow location access.");
return;
}

const loc = await Location.getCurrentPositionAsync({});
const lat = Number(loc.coords.latitude);
const lng = Number(loc.coords.longitude);

if (Number.isFinite(lat) && Number.isFinite(lng)) {
setGpsLocation({ lat, lng });

if (!isInSriLanka(lat, lng)) {
setUseMock(true);
} else {
setUseMock(false);
}
}
}

function onPressMultiStore() {
const lat = toNum(activeLocation.lat);
const lng = toNum(activeLocation.lng);

if (lat == null || lng == null) {
Alert.alert("Multi-store", "Invalid location values.");
return;
}

if (!multiItems.length) {
Alert.alert(
"Multi-store",
"No canonical_group_id found for basket items.\n\nFix: ensure items include canonical_group_id (or map clean_product_id → canonical_group_id before navigating)."
);
return;
}

router.push({
pathname: "/multistore-plan",
params: {
lat: String(lat),
lng: String(lng),
mode: travelMode,
provider,
costModel,
items: JSON.stringify(multiItems),
},
});
}

async function onPressAiInsights() {
try {
if (!displayRec) {
Alert.alert("AI Insights", "No recommendation data yet.");
return;
}

setAiLoading(true);
setAiText("");

const payload = {
mode: "single",
basket: { basket_size: payloadItems.length },
travel: { mode: travelMode, provider, cost_model: costModel },
recommended: displayRec,
stores,
nearest_baseline: nearestBaseline ?? null,
savings_info: savingsInfo ?? null,
};

const data = await fetchAiInsights(payload);
setAiText(String(data?.insights ?? "").replace(/\\n/g, "\n"));
setAiOpen(true);
} catch (e: any) {
Alert.alert("AI Insights", e?.message ?? "Failed to fetch AI insights");
} finally {
setAiLoading(false);
}
}

async function runRecommendation() {
try {
if (!payloadItems.length) {
Alert.alert("No items", "Please add items with clean_product_id before recommending a store.");
return;
}

setLoading(true);
setResult(null);

if (!useMock && !gpsLocation) {
await fetchGpsOnceAndMaybeAutoMock();
}

const loc = activeLocation;
const lat = toNum(loc.lat);
const lng = toNum(loc.lng);

if (lat == null || lng == null) {
Alert.alert("Location error", "Invalid location values.");
return;
}

const payload: RecommendStoreRequest = {
items: payloadItems,
user_location: { lat, lng },
travel: {
mode: travelMode,
provider,
cost_model: costModel,
include_route: true,
} as any,
};

const data = await recommendStore(payload);
setResult(data);
} catch (e: any) {
Alert.alert("Error", e?.message ?? "Recommendation failed");
} finally {
setLoading(false);
}
}

useEffect(() => {
if (source === "price_comparison") {
setShowPartial(true);
}
}, [source]);

useEffect(() => {
const t = setTimeout(() => {
runRecommendation();
}, 150);

return () => clearTimeout(t);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [travelMode, provider, costModel]);

const recommended = result?.recommended;
const stores = Array.isArray(result?.stores) ? result.stores : [];

const bestPartial = useMemo(() => {
if (!stores.length) return null;

const scored = (stores as any[])
.map((s) => {
const itemsTotal = Number(s?.items_total);
const travelCost = Number(s?.travel_cost);
const missing = Array.isArray(s?.missing_items) ? s.missing_items : [];

if (!Number.isFinite(itemsTotal) || !Number.isFinite(travelCost)) return null;

const partialTotal = itemsTotal + travelCost;
const foundCount = Math.max(0, payloadItems.length - missing.length);

return {
...s,
partial_total_cost: Number(partialTotal.toFixed(2)),
coverage_found: foundCount,
coverage_total: payloadItems.length,
is_partial: true,
};
})
.filter(Boolean)
.sort((a: any, b: any) => a.partial_total_cost - b.partial_total_cost);

return scored[0] ?? null;
}, [stores, payloadItems.length]);

const displayRec = recommended ?? (showPartial ? bestPartial : null);

const savingsInfo = useMemo(() => {
const eligible = (stores as any[])
.filter((s) => s?.total_cost != null && Number.isFinite(Number(s.total_cost)))
.map((s) => ({
store: String(s.store ?? "").toLowerCase(),
total: Number(s.total_cost),
}))
.sort((a, b) => a.total - b.total);

if (eligible.length < 2) return null;

const best = eligible[0];
const second = eligible[1];

const save = second.total - best.total;
const pct = second.total > 0 ? (save / second.total) * 100 : null;

return {
bestStore: best.store,
bestTotal: best.total,
secondStore: second.store,
secondTotal: second.total,
saveAmount: save,
savePct: pct,
};
}, [stores]);

const nearestBaseline = useMemo(() => {
const candidates = (stores as any[])
.filter((s) => s?.distance_km != null && Number.isFinite(Number(s.distance_km)))
.map((s) => {
const storeKey = String(s.store ?? "").toLowerCase();
const missingCount = Array.isArray(s.missing_items) ? s.missing_items.length : 0;

const computedTotal =
s?.total_cost != null && Number.isFinite(Number(s.total_cost))
? Number(s.total_cost)
: s?.items_total != null && s?.travel_cost != null
? Number(s.items_total) + Number(s.travel_cost)
: null;

return {
store: storeKey,
label: STORE_LABELS[storeKey] ?? s.store,
distanceKm: Number(s.distance_km),
total: computedTotal,
itemsTotal: s?.items_total != null ? Number(s.items_total) : null,
travelCost: s?.travel_cost != null ? Number(s.travel_cost) : null,
missingCount,
isComplete: missingCount === 0,
};
})
.sort((a, b) => a.distanceKm - b.distanceKm);

if (!candidates.length) return null;
return candidates[0];
}, [stores]);

const partialSavingsInfo = useMemo(() => {
const eligible = (stores as any[])
.map((s) => {
const store = String(s.store ?? "").toLowerCase();
const total =
s?.total_cost != null && Number.isFinite(Number(s.total_cost))
? Number(s.total_cost)
: s?.items_total != null && s?.travel_cost != null
? Number(s.items_total) + Number(s.travel_cost)
: null;

const missingCount = Array.isArray(s.missing_items) ? s.missing_items.length : 0;

return { store, total, missingCount };
})
.filter((x) => x.total != null && Number.isFinite(Number(x.total)))
.sort((a, b) => (a.total as number) - (b.total as number));

if (eligible.length < 2) return null;

const best = eligible[0];
const second = eligible[1];

const save = (second.total as number) - (best.total as number);
const pct = (second.total as number) > 0 ? (save / (second.total as number)) * 100 : null;

return {
bestStore: best.store,
bestTotal: best.total as number,
bestMissing: best.missingCount,
secondStore: second.store,
secondTotal: second.total as number,
secondMissing: second.missingCount,
saveAmount: save,
savePct: pct,
};
}, [stores]);

const routeCoords = useMemo(() => {
const encoded = displayRec?.route_polyline;
if (!encoded || typeof encoded !== "string" || encoded.length < 5) return [];
try {
const pts: number[][] = polyline.decode(encoded);
return pts
.map(([lat, lng]) => ({ latitude: Number(lat), longitude: Number(lng) }))
.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
} catch {
return [];
}
}, [displayRec]);

const outletLat = toNum(displayRec?.nearest_outlet?.lat);
const outletLng = toNum(displayRec?.nearest_outlet?.lng);
const hasOutlet = outletLat != null && outletLng != null;

const userLat = toNum(activeLocation.lat);
const userLng = toNum(activeLocation.lng);
const hasUser = userLat != null && userLng != null;

useEffect(() => {
const map = mapRef.current;
if (!map) return;

const coords: { latitude: number; longitude: number }[] = [];

if (hasUser) coords.push({ latitude: userLat!, longitude: userLng! });
if (hasOutlet) coords.push({ latitude: outletLat!, longitude: outletLng! });
if (routeCoords.length > 1) coords.push(...routeCoords);

if (coords.length < 2) return;

setTimeout(() => {
try {
map.fitToCoordinates(coords, {
edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
animated: true,
});
} catch {
// ignore
}
}, 250);
}, [hasUser, hasOutlet, userLat, userLng, outletLat, outletLng, routeCoords.length]);

const locationLabel = useMock
? "Colombo (Test Mode)"
: isInSriLanka(userLat ?? 0, userLng ?? 0)
? "Sri Lanka (GPS)"
: "GPS (Outside Sri Lanka)";

const money = (v: any) => (v == null ? "N/A" : Number(v).toFixed(2));
const km = (v: any) => (v == null ? "N/A" : Number(v).toFixed(2));
const mins = (v: any) => (v == null ? "N/A" : Number(v).toFixed(1));

const onWhyThisStore = () => {
if (!displayRec) return;

const store = String(displayRec.store ?? "").toUpperCase();
const items = displayRec.items_total != null ? `Rs ${money(displayRec.items_total)}` : "N/A";
const travel = displayRec.travel_cost != null ? `Rs ${money(displayRec.travel_cost)}` : "N/A";
const total =
displayRec.total_cost != null
? `Rs ${money(displayRec.total_cost)}`
: displayRec.partial_total_cost != null
? `Rs ${money(displayRec.partial_total_cost)} (partial)`
: "N/A";

const costModelUsed = displayRec.cost_model_used ?? "N/A";
const providerUsed = displayRec.provider_used ?? "N/A";

Alert.alert(
"Why this store?",
`The system evaluates each store and selects the one with the lowest total cost.\n\n` +
`Total = Items + Travel\n` +
`• ${store}\n` +
`• Items: ${items}\n` +
`• Travel: ${travel}\n` +
`• Total: ${total}\n\n` +
`Travel uses ${costModelUsed} model via ${providerUsed}.` +
(`is_partial` in displayRec && displayRec.is_partial
? `\n\nNote: This is a partial recommendation because some items are missing.`
: "")
);
};

return (
<View style={styles.screen}>
{/* Header */}
<View style={styles.headerCard}>
<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
<Pressable
onPress={() => router.back()}
style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
hitSlop={10}
>
<Ionicons name="arrow-back" size={20} color={COLORS.TEXT} />
</Pressable>

<View style={{ flex: 1 }}>
<Text style={styles.title}>Cheapest & Nearest</Text>
<Text style={styles.subtitle}>Basket total + travel cost per store</Text>
</View>

<Pressable
onPress={runRecommendation}
style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.85 }]}
>
<Ionicons name="refresh" size={18} color={COLORS.GREEN_DARK} />
<Text style={styles.refreshText}>Recalculate</Text>
</Pressable>
</View>
</View>

<ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
{/* Location + toggles */}
<View style={styles.card}>
<View style={styles.cardHeaderRow}>
<View style={{ flex: 1 }}>
<Text style={styles.cardTitle}>Your location</Text>
<Text style={styles.locationText}>{locationLabel}</Text>
</View>

<View style={styles.locChip}>
<Ionicons name={useMock ? "flask-outline" : "locate-outline"} size={14} color={COLORS.GREEN_DARK} />
<Text style={styles.locChipText}>{useMock ? "Test" : "GPS"}</Text>
</View>
</View>

<View style={styles.innerCard}>
<Text style={styles.cardTitle}>Travel Mode</Text>

<View style={styles.row}>
{(["driving", "walking", "bicycling", "transit"] as TravelMode[]).map((m) => (
<Pressable
key={m}
onPress={() => setTravelMode(m)}
style={({ pressed }) => [
styles.optionBtn,
travelMode === m && styles.optionBtnActive,
pressed && { transform: [{ scale: 0.98 }] },
]}
>
<Text style={[styles.optionText, travelMode === m && styles.optionTextActive]}>
{m.toUpperCase()}
</Text>
</Pressable>
))}
</View>

<Text style={[styles.cardTitle, { marginTop: 14 }]}>Cost Model</Text>

<View style={styles.row}>
{(["distance", "time"] as CostModel[]).map((m) => (
<Pressable
key={m}
onPress={() => setCostModel(m)}
style={({ pressed }) => [
styles.optionBtn,
costModel === m && styles.optionBtnActive,
pressed && { transform: [{ scale: 0.98 }] },
]}
>
<Text style={[styles.optionText, costModel === m && styles.optionTextActive]}>
{m.toUpperCase()}
</Text>
</Pressable>
))}
</View>
</View>

<View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
<Pressable
onPress={async () => {
await fetchGpsOnceAndMaybeAutoMock();
setUseMock(false);
}}
style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.92 }]}
>
<Ionicons name="locate-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.smallBtnText}>Use GPS</Text>
</Pressable>

<Pressable
onPress={() => setUseMock(true)}
style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.92 }]}
>
<Ionicons name="flask-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.smallBtnText}>Use Colombo</Text>
</Pressable>
</View>
</View>

{/* Provider */}
<View style={styles.card}>
<Text style={styles.cardTitle}>Distance provider</Text>
<Text style={styles.hint}>
Google = real routes (may fail for some modes/areas) • Haversine = fallback estimate
</Text>

<View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
<Pressable
onPress={() => setProvider("google")}
style={({ pressed }) => [
styles.pill,
provider === "google" ? styles.pillActive : styles.pillInactive,
pressed && { transform: [{ scale: 0.98 }] },
]}
>
<Text style={[styles.pillText, provider === "google" ? styles.pillTextActive : styles.pillTextInactive]}>
Google
</Text>
</Pressable>

<Pressable
onPress={() => setProvider("haversine")}
style={({ pressed }) => [
styles.pill,
provider === "haversine" ? styles.pillActive : styles.pillInactive,
pressed && { transform: [{ scale: 0.98 }] },
]}
>
<Text
style={[
styles.pillText,
provider === "haversine" ? styles.pillTextActive : styles.pillTextInactive,
]}
>
Haversine
</Text>
</Pressable>
</View>
</View>

{/* Recommended */}
<View style={styles.card}>
<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
<Ionicons name="trophy-outline" size={20} color={COLORS.GREEN_DARK} />
<Text style={styles.cardTitle}>{loading ? "Calculating..." : "Recommended Store"}</Text>
</View>

<View style={{ flexDirection: "row", gap: 10 }}>
<Pressable
onPress={onPressMultiStore}
disabled={loading || !payloadItems.length}
style={({ pressed }) => [
styles.smallBtn,
(loading || !payloadItems.length) && { opacity: 0.6 },
pressed && { opacity: 0.92 },
]}
>
<Ionicons name="git-branch-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.smallBtnText}>Multi</Text>
</Pressable>

<Pressable
onPress={onPressAiInsights}
disabled={aiLoading || !displayRec}
style={({ pressed }) => [
styles.smallBtn,
(aiLoading || !displayRec) && { opacity: 0.6 },
pressed && { opacity: 0.92 },
]}
>
<Ionicons name="sparkles-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.smallBtnText}>{aiLoading ? "Loading..." : "AI"}</Text>
</Pressable>
</View>
</View>

{displayRec ? (
<>
<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
<View style={styles.recoPill}>
<Ionicons name="sparkles" size={14} color="#fff" />
<Text style={styles.recoPillText}>
{String(displayRec.store ?? "Store").toUpperCase()}
{"is_partial" in displayRec && displayRec.is_partial ? " (PARTIAL)" : ""}
</Text>
</View>

<Pressable onPress={onWhyThisStore} hitSlop={10} style={styles.infoBtn}>
<Ionicons name="information-circle-outline" size={18} color={COLORS.GREEN_DARK} />
</Pressable>
</View>

<Text style={styles.hint}>
Lowest total cost (items + travel)
{"is_partial" in displayRec && displayRec.is_partial ? " • Partial basket" : ""}
</Text>

<View style={styles.metricRow}>
<View style={styles.metricCard}>
<Text style={styles.metricLabel}>Items</Text>
<Text style={styles.metricValue}>Rs {money(displayRec.items_total)}</Text>
</View>

<View style={styles.metricCard}>
<Text style={styles.metricLabel}>Travel</Text>
<Text style={styles.metricValue}>Rs {money(displayRec.travel_cost)}</Text>
</View>

<View style={[styles.metricCard, styles.metricCardStrong]}>
<Text style={[styles.metricLabel, { color: "#0B3B2E" }]}>Total</Text>
<Text style={[styles.metricValue, styles.metricValueStrong]}>
Rs {displayRec.total_cost != null ? money(displayRec.total_cost) : money(displayRec.partial_total_cost)}
</Text>
</View>
</View>

<View style={{ marginTop: 10 }}>
<Text style={styles.line}>
Distance: {km(displayRec.distance_km)} km • Time used: {mins(displayRec.duration_min)} min
</Text>

{displayRec.duration_min_in_traffic != null &&
displayRec.duration_min_no_traffic != null &&
Math.abs(displayRec.duration_min_in_traffic - displayRec.duration_min_no_traffic) >= 0.5 && (
<View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
<Ionicons
name={
displayRec.duration_min_in_traffic < displayRec.duration_min_no_traffic ? "arrow-down" : "arrow-up"
}
size={14}
color={
displayRec.duration_min_in_traffic < displayRec.duration_min_no_traffic
? COLORS.GREEN_DARK
: COLORS.DANGER_TEXT
}
/>
<Text
style={[
styles.hint,
{
marginTop: 0,
color:
displayRec.duration_min_in_traffic < displayRec.duration_min_no_traffic
? COLORS.GREEN_DARK
: COLORS.DANGER_TEXT,
},
]}
>
{displayRec.duration_min_in_traffic < displayRec.duration_min_no_traffic
? "Traffic lighter than usual"
: "Traffic heavier than usual"}
</Text>
</View>
)}

{displayRec.duration_min_in_traffic != null && displayRec.duration_min_no_traffic != null && (
<Text style={styles.hint}>
🚗 Live: {mins(displayRec.duration_min_in_traffic)} min • Typical: {mins(displayRec.duration_min_no_traffic)} min
</Text>
)}

<View style={styles.outletRow}>
<Ionicons name="storefront-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={[styles.line, { marginTop: 0, flex: 1 }]}>
Outlet: {displayRec.nearest_outlet?.name ?? "N/A"}
</Text>
</View>

{"is_partial" in displayRec && displayRec.is_partial && (
<Text style={styles.hint}>
Covers {displayRec.coverage_found}/{displayRec.coverage_total} items (missing shown below)
</Text>
)}

{savingsInfo ? (
<View style={styles.savingsBox}>
<Ionicons name="cash-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.savingsText}>
Save Rs {money(savingsInfo.saveAmount)} vs 2nd best ({STORE_LABELS[savingsInfo.secondStore] ?? savingsInfo.secondStore})
</Text>
</View>
) : partialSavingsInfo ? (
<View style={styles.savingsBox}>
<Ionicons name="cash-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.savingsText}>
(Partial) Save Rs {money(partialSavingsInfo.saveAmount)} vs 2nd best ({STORE_LABELS[partialSavingsInfo.secondStore] ?? partialSavingsInfo.secondStore})
</Text>
</View>
) : null}

<Text style={[styles.hint, { marginTop: 8 }]}>
Provider: {displayRec.provider_used ?? "N/A"} • Cost model: {displayRec.cost_model_used ?? "N/A"}
</Text>
</View>
</>
) : (
<>
<Text style={styles.hint}>
{loading ? "Please wait…" : "No single store can fulfil the full basket (items are missing across all stores)."}
</Text>

{!loading && stores.length > 0 && (
<View style={{ marginTop: 10 }}>
{(stores as any[]).map((s) => {
const missing = Array.isArray(s?.missing_items) ? s.missing_items : [];
if (missing.length === 0) return null;
return (
<Text key={`why-${s.store}`} style={styles.hint}>
• {String(s.store).toUpperCase()}: missing {missing.length}
</Text>
);
})}
</View>
)}

{!loading && bestPartial && (
<Pressable
onPress={() => setShowPartial(true)}
style={({ pressed }) => [styles.refreshBtn, { marginTop: 12 }, pressed && { opacity: 0.85 }]}
>
<Ionicons name="flash-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.refreshText}>Recommend best partial store (ignore missing)</Text>
</Pressable>
)}
</>
)}
</View>

{/* Map preview */}
<View style={styles.mapCard}>
<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
<Text style={styles.cardTitle}>Map preview</Text>

<Pressable
onPress={() => {
const map = mapRef.current;
if (!map) return;

const coords: { latitude: number; longitude: number }[] = [];
if (hasUser) coords.push({ latitude: userLat!, longitude: userLng! });
if (hasOutlet) coords.push({ latitude: outletLat!, longitude: outletLng! });
if (routeCoords.length > 1) coords.push(...routeCoords);
if (coords.length < 2) return;

map.fitToCoordinates(coords, {
edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
animated: true,
});
}}
style={({ pressed }) => [styles.smallLinkBtn, pressed && { opacity: 0.86 }]}
>
<Ionicons name="expand-outline" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.smallLinkText}>Fit</Text>
</Pressable>
</View>

<View style={styles.mapWrap}>
<MapView
ref={mapRef}
style={StyleSheet.absoluteFill}
provider={PROVIDER_GOOGLE}
initialRegion={{
latitude: hasUser ? userLat! : MOCK_COLOMBO.lat,
longitude: hasUser ? userLng! : MOCK_COLOMBO.lng,
latitudeDelta: 0.06,
longitudeDelta: 0.06,
}}
>
{hasUser && (
<Marker
coordinate={{ latitude: userLat!, longitude: userLng! }}
title="You"
pinColor={COLORS.GREEN_DARK}
/>
)}

{hasOutlet && (
<Marker
coordinate={{ latitude: outletLat!, longitude: outletLng! }}
title={recommended?.nearest_outlet?.name ?? "Outlet"}
/>
)}

{routeCoords.length > 1 && <Polyline coordinates={routeCoords} strokeWidth={5} />}
</MapView>
</View>

{displayRec?.route_polyline ? (
<Text style={styles.hint}>Route based on Google navigation data ({travelMode})</Text>
) : (
<Text style={styles.hint}>
No {travelMode} route available for this location. Showing estimated travel values.
</Text>
)}
</View>

{nearestBaseline && (
<View style={[styles.card, styles.baselineCard]}>
<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
<Text style={styles.cardTitle}>Nearest store baseline</Text>
<View style={styles.baselineChip}>
<Ionicons name="navigate-outline" size={14} color={COLORS.GREEN_DARK} />
<Text style={styles.baselineChipText}>Distance-only</Text>
</View>
</View>

<Text style={styles.line}>
Nearest: <Text style={styles.bold}>{nearestBaseline.label}</Text> • {km(nearestBaseline.distanceKm)} km
</Text>

<Text style={styles.hint}>
Total: Rs {money(nearestBaseline.total)} (Items: Rs {money(nearestBaseline.itemsTotal)} • Travel: Rs {money(nearestBaseline.travelCost)})
</Text>

{!nearestBaseline.isComplete && (
<Text style={[styles.hint, { color: COLORS.DANGER_TEXT }]}>
Baseline incomplete • Missing {nearestBaseline.missingCount} items
</Text>
)}

<Text style={styles.hint}>
Nearest is not always cheapest when availability and travel cost are considered.
</Text>
</View>
)}

{/* Breakdown */}
<View style={{ marginTop: 16, marginBottom: 8 }}>
<Text style={styles.sectionTitle}>Store breakdown (all stores evaluated)</Text>
<Text style={styles.hint}>These stores were compared using the same basket and travel assumptions.</Text>
</View>

{stores.map((s: any) => {
const storeKey = String(s.store ?? "").toLowerCase();
const label = STORE_LABELS[storeKey] ?? s.store;

const missing = Array.isArray(s.missing_items) ? s.missing_items : [];
const isComplete = missing.length === 0;

const isBest = savingsInfo?.bestStore === storeKey;
const isSecond = savingsInfo?.secondStore === storeKey;

return (
<View key={s.store} style={[styles.card, styles.storeCard, isBest && styles.bestCard, !isBest && isSecond && styles.secondCard]}>
<View style={styles.storeHeaderRow}>
<View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
<Text style={styles.cardTitle}>{label}</Text>

{isBest && (
<View style={styles.badgeBest}>
<Ionicons name="trophy-outline" size={14} color={COLORS.GREEN_DARK} />
<Text style={styles.badgeBestText}>Best</Text>
</View>
)}

{!isBest && isSecond && (
<View style={styles.badgeSecond}>
<Ionicons name="medal-outline" size={14} color={COLORS.TEXT} />
<Text style={styles.badgeSecondText}>2nd</Text>
</View>
)}
</View>

<Text style={[styles.statusPill, isComplete ? styles.statusOk : styles.statusWarn]}>
{isComplete ? "Complete" : `Missing ${missing.length}`}
</Text>
</View>

<View style={styles.miniMetricRow}>
<View style={styles.miniMetric}>
<Text style={styles.miniLabel}>Items</Text>
<Text style={styles.miniValue}>Rs {money(s.items_total)}</Text>
</View>
<View style={styles.miniMetric}>
<Text style={styles.miniLabel}>Travel</Text>
<Text style={styles.miniValue}>Rs {money(s.travel_cost)}</Text>
</View>
<View style={[styles.miniMetric, isBest && styles.miniMetricBest]}>
<Text style={styles.miniLabel}>Total</Text>
<Text style={[styles.miniValue, styles.bold]}>
Rs{" "}
{money(
s.total_cost ??
(s.items_total != null && s.travel_cost != null ? Number(s.items_total) + Number(s.travel_cost) : null)
)}
</Text>
</View>
</View>

<Text style={styles.hint}>
Distance: {km(s.distance_km)} km
{s.duration_min != null ? ` • ${mins(s.duration_min)} min` : ""} • {s.provider_used ?? "N/A"} •{" "}
{s.cost_model_used ?? "N/A"}
</Text>

{s.provider_used === "google" &&
s.duration_min_in_traffic != null &&
s.duration_min_no_traffic != null &&
s.duration_min_in_traffic !== s.duration_min_no_traffic && (
<Text style={styles.hint}>
🚗 Live: {mins(s.duration_min_in_traffic)} min • Typical: {mins(s.duration_min_no_traffic)} min
</Text>
)}

<Text style={styles.hint}>Nearest outlet: {s.nearest_outlet?.name ?? "N/A"}</Text>

{!isComplete && (
<View style={{ marginTop: 10 }}>
<Text style={[styles.hint, { color: COLORS.DANGER_TEXT }]}>Missing items:</Text>
{missing.slice(0, 6).map((m: any, idx: number) => (
<Text key={`${s.store}-m-${idx}`} style={styles.hint}>
• {m.name ?? `ID ${m.clean_product_id}`}
</Text>
))}
{missing.length > 6 && <Text style={styles.hint}>…and more</Text>}
</View>
)}
</View>
);
})}
</ScrollView>

<AiInsightsSheet
visible={aiOpen}
onClose={() => setAiOpen(false)}
title="AI insights"
text={aiText || (aiLoading ? "Generating insights…" : "No insights returned.")}
loading={aiLoading}
colors={COLORS}
/>
</View>
);
}

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
ios: {
shadowColor: COLORS.SHADOW as any,
shadowOpacity: 1,
shadowRadius: 14,
shadowOffset: { width: 0, height: 6 },
},
android: { elevation: 3 },
}),
},

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

refreshBtn: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 12,
paddingVertical: 9,
borderRadius: 999,
backgroundColor: COLORS.LIGHT_GREEN,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
},
refreshText: { fontSize: 12, fontWeight: "900", color: COLORS.GREEN_DARK },

title: { fontSize: 18, fontWeight: "900", color: COLORS.TEXT },
subtitle: { marginTop: 3, fontSize: 12, fontWeight: "700", color: COLORS.MUTED },

card: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 18,
padding: 14,
marginBottom: 12,
},

innerCard: {
marginTop: 10,
backgroundColor: COLORS.HEADER_GRADIENT_2,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 16,
padding: 12,
},

cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

mapCard: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 18,
padding: 14,
marginBottom: 12,
},

mapWrap: {
marginTop: 10,
height: 220,
borderRadius: 16,
overflow: "hidden",
borderWidth: 1,
borderColor: COLORS.BORDER,
backgroundColor: COLORS.SOFT,
},

cardTitle: { fontSize: 14, fontWeight: "900", color: COLORS.TEXT },

locationText: { marginTop: 6, fontSize: 13, fontWeight: "900", color: COLORS.TEXT },

line: { marginTop: 6, fontSize: 12, fontWeight: "800", color: COLORS.MUTED },
bold: { fontWeight: "900", color: COLORS.TEXT },

hint: { marginTop: 8, fontSize: 11, fontWeight: "800", color: COLORS.SUBTLE },

sectionTitle: {
marginTop: 6,
marginBottom: 8,
fontSize: 13,
fontWeight: "900",
color: COLORS.TEXT,
},

statusPill: {
fontSize: 11,
fontWeight: "900",
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 999,
overflow: "hidden",
},
statusOk: { backgroundColor: COLORS.LIGHT_GREEN, color: COLORS.GREEN_DARK },
statusWarn: { backgroundColor: "#FFF1F3", color: COLORS.DANGER_TEXT },

smallBtn: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 12,
paddingVertical: 10,
borderRadius: 14,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
},
smallBtnText: { fontSize: 12, fontWeight: "900", color: COLORS.GREEN_DARK },

pill: {
paddingHorizontal: 14,
paddingVertical: 10,
borderRadius: 999,
borderWidth: 1,
},
pillActive: {
backgroundColor: COLORS.LIGHT_GREEN,
borderColor: COLORS.LIGHT_GREEN_2,
},
pillInactive: {
backgroundColor: COLORS.SOFT,
borderColor: COLORS.SOFT_BORDER,
},
pillText: { fontSize: 12, fontWeight: "900" },
pillTextActive: { color: COLORS.GREEN_DARK },
pillTextInactive: { color: COLORS.SUBTLE },

row: {
flexDirection: "row",
gap: 8,
marginTop: 8,
flexWrap: "wrap",
},

optionBtn: {
paddingHorizontal: 12,
paddingVertical: 9,
borderRadius: 12,
borderWidth: 1,
borderColor: COLORS.BORDER,
backgroundColor: "#fff",
},

optionBtnActive: {
backgroundColor: COLORS.LIGHT_GREEN,
borderColor: COLORS.GREEN_DARK,
shadowColor: COLORS.OUTLINE as any,
shadowOpacity: 1,
shadowRadius: 8,
shadowOffset: { width: 0, height: 4 },
elevation: 2,
},

optionText: {
fontWeight: "900",
color: COLORS.MUTED,
fontSize: 12,
letterSpacing: 0.2,
},

optionTextActive: {
color: COLORS.GREEN_DARK,
},

// ✨ Recommended store pill
recoPill: {
flexDirection: "row",
alignItems: "center",
gap: 6,
backgroundColor: COLORS.GREEN_DARK,
paddingHorizontal: 12,
paddingVertical: 8,
borderRadius: 999,
},
recoPillText: { color: "#fff", fontWeight: "900", fontSize: 12, letterSpacing: 0.4 },

infoBtn: {
width: 34,
height: 34,
borderRadius: 12,
alignItems: "center",
justifyContent: "center",
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
},

// ✨ Metric cards
metricRow: { marginTop: 12, flexDirection: "row", gap: 10 },
metricCard: {
flex: 1,
padding: 10,
borderRadius: 14,
borderWidth: 1,
borderColor: COLORS.BORDER,
backgroundColor: "#fff",
},
metricCardStrong: {
backgroundColor: "#EAF7F1",
borderColor: COLORS.LIGHT_GREEN_2,
},
metricLabel: { fontSize: 11, fontWeight: "900", color: COLORS.SUBTLE },
metricValue: { marginTop: 6, fontSize: 13, fontWeight: "900", color: COLORS.TEXT },
metricValueStrong: { fontSize: 14, color: COLORS.GREEN_DARK },

outletRow: {
marginTop: 10,
flexDirection: "row",
alignItems: "center",
gap: 8,
padding: 10,
borderRadius: 14,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
},

savingsBox: {
marginTop: 10,
padding: 10,
borderRadius: 14,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
backgroundColor: COLORS.LIGHT_GREEN,
flexDirection: "row",
alignItems: "center",
gap: 8,
},
savingsText: { flex: 1, fontSize: 12, fontWeight: "900", color: COLORS.GREEN_DARK },

smallLinkBtn: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 10,
paddingVertical: 8,
borderRadius: 999,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
},
smallLinkText: { fontSize: 12, fontWeight: "900", color: COLORS.GREEN_DARK },

// baseline
baselineCard: {
borderStyle: "dashed",
borderColor: COLORS.LIGHT_GREEN_2,
backgroundColor: "#FBFEFC",
},
baselineChip: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 999,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
},
baselineChipText: { fontSize: 11, fontWeight: "900", color: COLORS.GREEN_DARK },

// store breakdown cards
storeCard: {
padding: 14,
},
storeHeaderRow: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
gap: 10,
},

miniMetricRow: { marginTop: 10, flexDirection: "row", gap: 10 },
miniMetric: {
flex: 1,
padding: 10,
borderRadius: 14,
borderWidth: 1,
borderColor: COLORS.BORDER,
backgroundColor: "#fff",
},
miniMetricBest: {
borderColor: COLORS.LIGHT_GREEN_2,
backgroundColor: "#EAF7F1",
},
miniLabel: { fontSize: 10, fontWeight: "900", color: COLORS.SUBTLE },
miniValue: { marginTop: 6, fontSize: 12, fontWeight: "900", color: COLORS.TEXT },

bestCard: {
borderColor: COLORS.GREEN_DARK,
borderWidth: 2,
backgroundColor: "#F0FBF6",
},

secondCard: {
borderColor: "#B7C6C1",
borderWidth: 2,
backgroundColor: "#FBFCFC",
},

badgeBest: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 999,
backgroundColor: COLORS.LIGHT_GREEN,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
},

badgeBestText: {
fontSize: 12,
fontWeight: "900",
color: COLORS.GREEN_DARK,
},

badgeSecond: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 999,
backgroundColor: "#EFF2F1",
borderWidth: 1,
borderColor: "#D8E0DD",
},

badgeSecondText: {
fontSize: 12,
fontWeight: "900",
color: COLORS.TEXT,
},

// location chip
locChip: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 10,
paddingVertical: 6,
borderRadius: 999,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
},
locChipText: { fontSize: 11, fontWeight: "900", color: COLORS.GREEN_DARK },
});
