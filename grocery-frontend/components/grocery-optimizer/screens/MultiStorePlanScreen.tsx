import React, { useEffect, useMemo, useState } from "react";
import {
View,
Text,
ScrollView,
Pressable,
StyleSheet,
ActivityIndicator,
Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
SUCCESS_BG: "#ECFDF3",
SUCCESS_BORDER: "#ABEFC6",
WARNING_BG: "#FFF4ED",
WARNING_BORDER: "#FFD6AE",
};

async function postJson(url: string, body: any) {
const res = await fetch(url, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
});
if (!res.ok) {
const txt = await res.text();
throw new Error(txt || `Request failed: ${res.status}`);
}
return res.json();
}

const money = (v: any) => (v == null ? "N/A" : Number(v).toFixed(2));
const km = (v: any) => (v == null ? "N/A" : Number(v).toFixed(2));
const mins = (v: any) => (v == null ? "N/A" : Number(v).toFixed(1));

export default function MultiStorePlanPage() {
const router = useRouter();
const params = useLocalSearchParams();

const [loading, setLoading] = useState(true);
const [err, setErr] = useState<string | null>(null);
const [data, setData] = useState<any>(null);

const [aiOpen, setAiOpen] = useState(false);
const [aiText, setAiText] = useState("");
const [aiLoading, setAiLoading] = useState(false);

const payload = useMemo(() => {
const lat = Number(params.lat);
const lng = Number(params.lng);

const itemsRaw = typeof params.items === "string" ? params.items : "[]";
let itemsParsed: any[] = [];
try {
itemsParsed = JSON.parse(itemsRaw);
} catch {
itemsParsed = [];
}

return {
user_location: { lat, lng },
items: itemsParsed,
strict: true,
travel: {
mode: typeof params.mode === "string" && params.mode ? params.mode : "driving",
provider:
typeof params.provider === "string" && params.provider
? params.provider
: "google",
cost_model:
typeof params.costModel === "string" && params.costModel
? params.costModel
: "distance",
include_route: false,
},
};
}, [params.lat, params.lng, params.items, params.mode, params.provider, params.costModel]);

useEffect(() => {
const run = async () => {
try {
setErr(null);
setLoading(true);

const base = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!base) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");

const latOk = Number.isFinite(payload.user_location.lat);
const lngOk = Number.isFinite(payload.user_location.lng);
if (!latOk || !lngOk) {
throw new Error(
`Invalid lat/lng: ${payload.user_location.lat}, ${payload.user_location.lng}`
);
}

if (!Array.isArray(payload.items) || payload.items.length === 0) {
throw new Error("No canonicalItems passed to multistore page");
}

console.log("MULTI base:", base);
console.log("MULTI payload:", payload);

const json = await postJson(`${base}/recommend/multistore`, payload);
setData(json);
} catch (e: any) {
console.log("MULTI error:", e);
setErr(e?.message || "Failed to load multi-store plan");
} finally {
setLoading(false);
}
};

run();
}, [payload]);

const insightsMetrics = useMemo(() => {
const best = data?.baselines?.best_single_store;
const rec = data?.recommended;
if (!best || !rec) return null;

const bestItems = Number(best.items_total ?? 0);
const bestTravel = Number(best.travel_cost ?? 0);
const bestTotal = Number(best.total_cost ?? bestItems + bestTravel);

const recItems = Number(rec.costs?.basket_total ?? 0);
const recTravel = Number(rec.costs?.travel?.travel_cost ?? 0);
const recTotal = Number(rec.costs?.total_cost ?? recItems + recTravel);

return {
bestItems,
bestTravel,
bestTotal,
recItems,
recTravel,
recTotal,
itemDelta: bestItems - recItems,
travelDelta: recTravel - bestTravel,
netDelta: bestTotal - recTotal,
};
}, [data]);

async function onPressAiInsight() {
try {
if (!data?.recommended) {
setAiText("No multi-store recommendation data available.");
setAiOpen(true);
return;
}

setAiLoading(true);
setAiText("");

const aiPayload = {
mode: "multi",
basket: {
basket_size: Array.isArray(payload.items) ? payload.items.length : 0,
},
travel: payload.travel,
plan: data?.recommended?.plan ?? null,
baselines: data?.baselines ?? null,
metrics: insightsMetrics ?? null,
savings_vs_best_single_store: data?.savings_vs_best_single_store ?? null,
};

const res = await fetchAiInsights(aiPayload);
setAiText(String(res?.insights ?? "").replace(/\\n/g, "\n"));
setAiOpen(true);
} catch (e: any) {
setAiText(e?.message ?? "Failed to fetch AI insight");
setAiOpen(true);
} finally {
setAiLoading(false);
}
}

const savingsValue = Number(data?.savings_vs_best_single_store ?? 0);
const isBetter = savingsValue >= 0;

return (
<View style={styles.screen}>
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
<Text style={styles.title}>Multi-store plan</Text>
<Text style={styles.subtitle}>
Split basket across 2 stores + travel tour cost
</Text>
</View>
</View>
</View>

{loading ? (
<View style={styles.center}>
<View style={styles.loaderCard}>
<ActivityIndicator size="large" color={COLORS.GREEN_DARK} />
<Text style={styles.loaderText}>Building the best multi-store plan...</Text>
</View>
</View>
) : err ? (
<ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
<View style={[styles.card, styles.errorCard]}>
<View style={styles.cardTitleRow}>
<Ionicons name="alert-circle-outline" size={18} color={COLORS.DANGER_TEXT} />
<Text style={[styles.cardTitle, { color: COLORS.DANGER_TEXT }]}>Error</Text>
</View>
<Text style={styles.hint}>{err}</Text>
</View>
</ScrollView>
) : (
<ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
<View style={[styles.card, styles.highlightCard]}>
<View style={styles.cardTitleRow}>
<Ionicons name="cash-outline" size={18} color={COLORS.GREEN_DARK} />
<Text style={styles.cardTitle}>Savings vs best single-store</Text>
</View>

{data?.savings_vs_best_single_store == null ? (
<Text style={[styles.line, { marginTop: 12 }]}>N/A</Text>
) : (
<>
<View style={styles.savingsHeaderRow}>
<Text style={styles.bigSavingValue}>
Rs {money(data.savings_vs_best_single_store)}
</Text>

<View
style={[
styles.pill,
isBetter ? styles.pillGood : styles.pillBad,
]}
>
<Ionicons
name={isBetter ? "checkmark-circle" : "alert-circle"}
size={14}
color={isBetter ? COLORS.GREEN_DARK : COLORS.DANGER_TEXT}
/>
<Text
style={[
styles.pillText,
isBetter
? { color: COLORS.GREEN_DARK }
: { color: COLORS.DANGER_TEXT },
]}
>
{isBetter ? "Better" : "Worse"}
</Text>
</View>
</View>

{insightsMetrics && (
<View style={styles.metricBox}>
<View style={styles.metricRow}>
<Text style={styles.metricLabel}>Items difference</Text>
<Text style={styles.metricValue}>
{insightsMetrics.itemDelta >= 0 ? "Saved" : "Extra"} Rs{" "}
{money(Math.abs(insightsMetrics.itemDelta))}
</Text>
</View>

<View style={styles.metricRow}>
<Text style={styles.metricLabel}>Travel difference</Text>
<Text style={styles.metricValue}>
{insightsMetrics.travelDelta >= 0 ? "+" : "-"}Rs{" "}
{money(Math.abs(insightsMetrics.travelDelta))}
</Text>
</View>

<View style={styles.metricRow}>
<Text style={styles.metricLabel}>Net effect</Text>
<Text
style={[
styles.metricValue,
{
color: insightsMetrics.netDelta >= 0
? COLORS.GREEN_DARK
: COLORS.DANGER_TEXT,
},
]}
>
{insightsMetrics.netDelta >= 0 ? "Better" : "Worse"} by Rs{" "}
{money(Math.abs(insightsMetrics.netDelta))}
</Text>
</View>
</View>
)}

<Text style={styles.hint}>
Multi-store wins only when item savings are greater than the extra
travel tour cost.
</Text>
</>
)}
</View>

{data?.baselines?.best_single_store && (
<View style={styles.card}>
<View style={styles.cardTitleRow}>
<Ionicons name="storefront-outline" size={18} color={COLORS.GREEN_DARK} />
<Text style={styles.cardTitle}>Best single-store baseline</Text>
</View>

<View style={styles.infoGrid}>
<View style={styles.infoChip}>
<Text style={styles.infoChipLabel}>Store</Text>
<Text style={styles.infoChipValue}>
{String(data.baselines.best_single_store.store).toUpperCase()}
</Text>
</View>

<View style={styles.infoChip}>
<Text style={styles.infoChipLabel}>Items</Text>
<Text style={styles.infoChipValue}>
Rs {money(data.baselines.best_single_store.items_total)}
</Text>
</View>

<View style={styles.infoChip}>
<Text style={styles.infoChipLabel}>Travel</Text>
<Text style={styles.infoChipValue}>
Rs {money(data.baselines.best_single_store.travel_cost)}
</Text>
</View>

<View style={[styles.infoChip, styles.infoChipStrong]}>
<Text style={styles.infoChipLabel}>Total</Text>
<Text style={[styles.infoChipValue, styles.infoChipValueStrong]}>
Rs {money(data.baselines.best_single_store.total_cost)}
</Text>
</View>
</View>

<Text style={styles.hint}>
Distance: {km(data.baselines.best_single_store.distance_km)} km •{" "}
{mins(data.baselines.best_single_store.duration_min)} min •{" "}
{data.baselines.best_single_store.provider_used ?? "N/A"} •{" "}
{data.baselines.best_single_store.cost_model_used ?? "N/A"}
</Text>
</View>
)}

{data?.recommended && (
<>
<View style={styles.card}>
<View style={styles.topActionRow}>
<View style={styles.cardTitleRow}>
<Ionicons name="git-compare-outline" size={18} color={COLORS.GREEN_DARK} />
<Text style={styles.cardTitle}>Recommended split</Text>
</View>

<Pressable
onPress={onPressAiInsight}
style={({ pressed }) => [styles.aiBtn, pressed && { opacity: 0.85 }]}
>
<Ionicons name="sparkles" size={16} color={COLORS.GREEN_DARK} />
<Text style={styles.aiBtnText}>
{aiLoading ? "Loading…" : "AI insight"}
</Text>
</Pressable>
</View>

<View style={styles.summaryGrid}>
<View style={styles.summaryCard}>
<Text style={styles.summaryLabel}>Basket total</Text>
<Text style={styles.summaryValue}>
Rs {money(data.recommended.costs?.basket_total)}
</Text>
</View>

<View style={styles.summaryCard}>
<Text style={styles.summaryLabel}>Travel tour</Text>
<Text style={styles.summaryValue}>
Rs {money(data.recommended.costs?.travel?.travel_cost)}
</Text>
</View>

<View style={[styles.summaryCard, styles.summaryCardPrimary]}>
<Text style={styles.summaryLabel}>Final total</Text>
<Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
Rs {money(data.recommended.costs?.total_cost)}
</Text>
</View>
</View>

<View style={styles.routeBox}>
<Ionicons name="map-outline" size={18} color={COLORS.GREEN_DARK} />
<View style={{ flex: 1 }}>
<Text style={styles.routeTitle}>Route plan</Text>
<Text style={styles.routeText}>
{(data.recommended.route?.order || []).join(" → ")} •{" "}
{km(data.recommended.costs?.travel?.distance_km)} km •{" "}
{mins(data.recommended.costs?.travel?.duration_min)} min
</Text>
</View>
</View>

{insightsMetrics && (
<View style={styles.softPanel}>
<Text style={[styles.hint, { marginTop: 0 }]}>
Compared to best single-store:
</Text>
<Text style={styles.hint}>
• Items: {insightsMetrics.itemDelta >= 0 ? "saved" : "extra"} Rs{" "}
{money(Math.abs(insightsMetrics.itemDelta))}
</Text>
<Text style={styles.hint}>
• Travel: +Rs {money(Math.max(0, insightsMetrics.travelDelta))}
</Text>
<Text style={styles.hint}>
• Net: {insightsMetrics.netDelta >= 0 ? "better" : "worse"} by Rs{" "}
{money(Math.abs(insightsMetrics.netDelta))}
</Text>
</View>
)}
</View>

{(data.recommended.plan || []).map((p: any) => (
<View key={p.store} style={styles.card}>
<View style={styles.storeHeaderRow}>
<View style={styles.cardTitleRow}>
<Ionicons name="bag-handle-outline" size={18} color={COLORS.GREEN_DARK} />
<Text style={styles.cardTitle}>{String(p.store).toUpperCase()}</Text>
</View>

<View style={styles.storeBadge}>
<Text style={styles.storeBadgeText}>
Rs {money(p.items_total)}
</Text>
</View>
</View>

<View style={styles.outletBox}>
<Ionicons name="location-outline" size={16} color={COLORS.GREEN_DARK} />
<View style={{ flex: 1 }}>
<Text style={styles.outletTitle}>
{p.nearest_outlet?.name ?? "N/A"}
</Text>
<Text style={styles.outletSub}>
{p.nearest_outlet?.address ?? ""}
</Text>
</View>
</View>

<Text style={[styles.line, { marginTop: 12 }]}>
Subtotal: <Text style={styles.bold}>Rs {money(p.items_total)}</Text>
</Text>

<View style={styles.itemsWrap}>
{(p.items || []).map((it: any, idx: number) => (
<View key={`${p.store}-${idx}`} style={styles.itemRow}>
<View style={styles.itemBullet} />
<Text style={styles.itemText}>
{it.name ?? `Group ${it.canonical_group_id}`} ×{it.qty}
</Text>
<Text style={styles.itemPrice}>{money(it.unit_price)}</Text>
</View>
))}
</View>
</View>
))}
</>
)}
</ScrollView>
)}

<AiInsightsSheet
visible={aiOpen}
onClose={() => setAiOpen(false)}
title="AI insights"
text={aiText || (aiLoading ? "Generating insights…" : "No insight available.")}
loading={aiLoading}
colors={COLORS}
/>
</View>
);
}

const styles = StyleSheet.create({
screen: {
flex: 1,
backgroundColor: COLORS.BG,
padding: 16,
},

center: {
flex: 1,
alignItems: "center",
justifyContent: "center",
},

loaderCard: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 20,
paddingVertical: 24,
paddingHorizontal: 28,
alignItems: "center",
justifyContent: "center",
minWidth: 220,
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.06,
shadowRadius: 12,
shadowOffset: { width: 0, height: 4 },
},
android: { elevation: 2 },
}),
},

loaderText: {
marginTop: 12,
fontWeight: "800",
color: COLORS.MUTED,
fontSize: 13,
},

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
shadowOffset: { width: 0, height: 4 },
},
android: { elevation: 2 },
}),
},

headerRow: {
flexDirection: "row",
alignItems: "center",
gap: 10,
},

iconBtn: {
width: 42,
height: 42,
borderRadius: 14,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
alignItems: "center",
justifyContent: "center",
},

title: {
fontSize: 20,
fontWeight: "900",
color: COLORS.TEXT,
},

subtitle: {
marginTop: 4,
fontSize: 12,
fontWeight: "700",
color: COLORS.MUTED,
lineHeight: 18,
},

card: {
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 20,
padding: 16,
marginBottom: 12,
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

highlightCard: {
borderColor: COLORS.SOFT_BORDER,
backgroundColor: "#FBFEFC",
},

errorCard: {
borderColor: "#FECACA",
backgroundColor: "#FEF3F2",
},

cardTitleRow: {
flexDirection: "row",
alignItems: "center",
gap: 8,
},

topActionRow: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
gap: 10,
},

storeHeaderRow: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
gap: 10,
},

cardTitle: {
fontSize: 15,
fontWeight: "900",
color: COLORS.TEXT,
},

line: {
marginTop: 6,
fontSize: 13,
fontWeight: "800",
color: COLORS.MUTED,
lineHeight: 19,
},

bold: {
fontWeight: "900",
color: COLORS.TEXT,
},

hint: {
marginTop: 8,
fontSize: 12,
fontWeight: "800",
color: COLORS.SUBTLE,
lineHeight: 18,
},

bigSavingValue: {
fontSize: 28,
fontWeight: "900",
color: COLORS.TEXT,
letterSpacing: 0.2,
},

savingsHeaderRow: {
marginTop: 12,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
gap: 12,
},

metricBox: {
marginTop: 12,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
borderRadius: 16,
padding: 12,
},

metricRow: {
flexDirection: "row",
justifyContent: "space-between",
gap: 10,
paddingVertical: 5,
},

metricLabel: {
flex: 1,
fontSize: 12,
fontWeight: "800",
color: COLORS.MUTED,
},

metricValue: {
fontSize: 12,
fontWeight: "900",
color: COLORS.TEXT,
textAlign: "right",
},

infoGrid: {
marginTop: 12,
flexDirection: "row",
flexWrap: "wrap",
gap: 10,
},

infoChip: {
width: "47%",
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
borderRadius: 16,
padding: 12,
},

infoChipStrong: {
backgroundColor: COLORS.LIGHT_GREEN,
borderColor: COLORS.LIGHT_GREEN_2,
},

infoChipLabel: {
fontSize: 11,
fontWeight: "800",
color: COLORS.SUBTLE,
marginBottom: 6,
},

infoChipValue: {
fontSize: 13,
fontWeight: "900",
color: COLORS.TEXT,
},

infoChipValueStrong: {
color: COLORS.GREEN_DARK,
},

summaryGrid: {
marginTop: 14,
gap: 10,
},

summaryCard: {
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
borderRadius: 16,
padding: 14,
},

summaryCardPrimary: {
backgroundColor: COLORS.LIGHT_GREEN,
borderColor: COLORS.LIGHT_GREEN_2,
},

summaryLabel: {
fontSize: 11,
fontWeight: "800",
color: COLORS.SUBTLE,
marginBottom: 6,
},

summaryValue: {
fontSize: 20,
fontWeight: "900",
color: COLORS.TEXT,
},

summaryValuePrimary: {
color: COLORS.GREEN_DARK,
},

routeBox: {
marginTop: 12,
flexDirection: "row",
gap: 10,
alignItems: "flex-start",
backgroundColor: "#F9FCFB",
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 16,
padding: 12,
},

routeTitle: {
fontSize: 12,
fontWeight: "900",
color: COLORS.TEXT,
marginBottom: 4,
},

routeText: {
fontSize: 12,
fontWeight: "800",
color: COLORS.MUTED,
lineHeight: 18,
},

softPanel: {
marginTop: 12,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
borderRadius: 16,
padding: 12,
},

outletBox: {
marginTop: 12,
flexDirection: "row",
gap: 10,
alignItems: "flex-start",
backgroundColor: "#F9FCFB",
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 16,
padding: 12,
},

outletTitle: {
fontSize: 13,
fontWeight: "900",
color: COLORS.TEXT,
},

outletSub: {
marginTop: 4,
fontSize: 12,
fontWeight: "700",
color: COLORS.MUTED,
lineHeight: 18,
},

itemsWrap: {
marginTop: 12,
gap: 8,
},

itemRow: {
flexDirection: "row",
alignItems: "center",
gap: 10,
backgroundColor: "#FAFCFB",
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 14,
paddingHorizontal: 12,
paddingVertical: 10,
},

itemBullet: {
width: 8,
height: 8,
borderRadius: 99,
backgroundColor: COLORS.GREEN,
},

itemText: {
flex: 1,
fontSize: 12,
fontWeight: "800",
color: COLORS.TEXT,
lineHeight: 18,
},

itemPrice: {
fontSize: 12,
fontWeight: "900",
color: COLORS.GREEN_DARK,
},

storeBadge: {
backgroundColor: COLORS.LIGHT_GREEN,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
borderRadius: 999,
paddingHorizontal: 12,
paddingVertical: 7,
},

storeBadgeText: {
fontSize: 11,
fontWeight: "900",
color: COLORS.GREEN_DARK,
},

pill: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 12,
paddingVertical: 7,
borderRadius: 999,
borderWidth: 1,
},

pillGood: {
backgroundColor: COLORS.SUCCESS_BG,
borderColor: COLORS.SUCCESS_BORDER,
},

pillBad: {
backgroundColor: COLORS.WARNING_BG,
borderColor: COLORS.WARNING_BORDER,
},

pillText: {
fontSize: 11,
fontWeight: "900",
},

aiBtn: {
flexDirection: "row",
alignItems: "center",
gap: 6,
paddingHorizontal: 12,
paddingVertical: 9,
borderRadius: 14,
backgroundColor: COLORS.SOFT,
borderWidth: 1,
borderColor: COLORS.SOFT_BORDER,
},

aiBtnText: {
fontSize: 12,
fontWeight: "900",
color: COLORS.GREEN_DARK,
},
});
