// screens/EnterItemsScreen.tsx
import React, { useMemo } from "react";
import {
View,
Text,
Pressable,
FlatList,
StyleSheet,
Alert,
Platform,
ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGrocery } from "../state/GroceryContext";

/** Theme Colors (keep your green theme) */
const COLORS = {
GREEN: "#2EA37A",
GREEN_DARK: "#1F6A53",
BG: "#F2F7F5",
CARD: "#FFFFFF",
BORDER: "#E2ECE7",
TEXT: "#0E1A17",
MUTED: "#5D6E69",
SUBTLE: "#7A8A86",
INPUT_BG: "#FBFDFC",
LIGHT_GREEN: "#E9F6F0",
LIGHT_GREEN_2: "#DDF3EB",
DELETE_TEXT: "#B42318",
DISABLED_BG: "#E7EFEC",
DISABLED_ICON: "#8CA09A",
};

type UiConcept = {
group_key: string;
name: string;
qty: number;
};

type Row =
| { type: "banner" }
| { type: "searchCard" }
| { type: "yourItemsCard" };

/**
* Banner image URL
*/
const BANNER_IMAGE_URL =
"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=70";

export default function EnterItemsScreen() {
const router = useRouter();
const { items, removeGroup, cartCount } = useGrocery();

const concepts: UiConcept[] = useMemo(() => {
const map = new Map<string, UiConcept>();
for (const it of items) {
if (!it.group_key) continue;
if (!map.has(it.group_key)) {
map.set(it.group_key, {
group_key: it.group_key,
name: it.name,
qty: Number(it.qty) || 1,
});
}
}
return Array.from(map.values()).reverse();
}, [items]);

const onDeleteConcept = (group_key: string) => {
Alert.alert("Delete item", "Remove this item from your list?", [
{ text: "Cancel", style: "cancel" },
{
text: "Delete",
style: "destructive",
onPress: () => removeGroup(group_key),
},
]);
};

const goNext = () => {
if (cartCount === 0) {
Alert.alert("No items", "Please add at least one item first.");
return;
}
router.push("/prices");
};

const goReviewList = () => {
if (concepts.length === 0) return;
router.push("/item_list");
};

const rows: Row[] = useMemo(
() => [{ type: "banner" }, { type: "searchCard" }, { type: "yourItemsCard" }],
[]
);

const hasItems = concepts.length > 0;

return (
<View style={styles.screen}>
<FlatList
data={rows}
keyExtractor={(row, idx) => `${row.type}-${idx}`}
contentContainerStyle={{ paddingBottom: 120 }}
renderItem={({ item }) => {
// ---------------- Banner ----------------
if (item.type === "banner") {
return (
<View style={styles.bannerOuter}>
<ImageBackground
source={{ uri: BANNER_IMAGE_URL }}
style={styles.banner}
imageStyle={styles.bannerImage}
resizeMode="cover"
>
<View style={styles.bannerOverlay} />

<View style={styles.bannerPill}>
<Ionicons
name="sparkles"
size={16}
color={COLORS.GREEN_DARK}
/>
<Text style={styles.bannerPillText}>
Smart Grocery Optimizer
</Text>
</View>

<View style={styles.bannerCenter}>
<Text style={styles.bannerTitle}>
Shop Smarter, Save{"\n"}More !
</Text>

<Text style={styles.bannerSubtitle}>
Find items for your meal plan and discover{"\n"} the most affordable supermarket nearby. 
</Text>
</View>
</ImageBackground>
</View>
);
}

// ---------------- Search card ----------------
if (item.type === "searchCard") {
return (
<View style={styles.searchBlockCard}>
<Pressable
onPress={() => router.push("/search_items")}
style={({ pressed }) => [
styles.searchCard,
pressed && { opacity: 0.92 },
]}
>
<Text style={styles.label}>Search item</Text>

<View style={styles.searchRow}>
<Ionicons name="search" size={18} color={COLORS.SUBTLE} />
<Text style={styles.searchPlaceholder}>
Type: milk / chicken...
</Text>
<Ionicons
name="chevron-forward"
size={18}
color={COLORS.SUBTLE}
/>
</View>
</Pressable>

<View style={styles.tipInsideCard}>
<Ionicons
name="checkmark-circle"
size={18}
color={COLORS.GREEN_DARK}
/>
<Text style={styles.tipText}>
Choose and add items required for your meal plan.
</Text>
</View>
</View>
);
}

// ---------------- Your items card ----------------
if (item.type === "yourItemsCard") {
return (
<View style={styles.yourItemsCard}>
<View style={styles.yourItemsHeader}>
<View>
<Text style={styles.sectionTitle}>Your Meal Plan Items</Text>
<Text style={styles.sectionSub}>
{hasItems ? `${concepts.length} items` : "0 items"}
</Text>
</View>

<Pressable
onPress={goReviewList}
disabled={!hasItems}
style={({ pressed }) => [
styles.cartIconWrap,
!hasItems && styles.cartIconWrapDisabled,
pressed && hasItems && { opacity: 0.9 },
]}
>
<Ionicons
name="cart"
size={20}
color={hasItems ? "#fff" : COLORS.DISABLED_ICON}
/>
{hasItems ? (
<View style={styles.badge}>
<Text style={styles.badgeText}>{concepts.length}</Text>
</View>
) : null}
</Pressable>
</View>

{!hasItems ? (
<View style={styles.emptyBoxInCard}>
<Text style={styles.emptyTitle}>No items yet</Text>
<Text style={styles.emptySub}>
Tap “Search item” above and add products.
</Text>
</View>
) : (
<View style={styles.itemsList}>
{concepts.map((c, idx) => (
<View key={c.group_key} style={styles.itemRowWrap}>
<View
style={[
styles.itemRow,
idx !== 0 && styles.itemRowWithTopDivider,
]}
>
<View style={styles.itemLeft}>
<View style={styles.bullet} />
<Text style={styles.itemText} numberOfLines={1}>
{c.name} ({c.qty})
</Text>
</View>

<Pressable
onPress={() => onDeleteConcept(c.group_key)}
style={({ pressed }) => [
styles.deleteIcon,
pressed && { opacity: 0.6 },
]}
hitSlop={10}
>
<Ionicons
name="trash-outline"
size={22}
color={COLORS.DELETE_TEXT}
/>
</Pressable>
</View>
</View>
))}
</View>
)}
</View>
);
}

return null;
}}
/>

{/* Bottom CTA */}
<View style={styles.bottomBar}>
<Pressable
onPress={goNext}
style={({ pressed }) => [
styles.nextBtn,
pressed && { opacity: 0.92 },
]}
>
<Ionicons name="stats-chart" size={18} color="#fff" />
<Text style={styles.nextText}>View Price Comparison</Text>
</Pressable>
</View>
</View>
);
}

const styles = StyleSheet.create({
screen: { flex: 1, backgroundColor: COLORS.BG, padding: 16 },

// ---------------- Banner (FIXED / USER FRIENDLY) ----------------
bannerOuter: {
marginBottom: 14,
borderRadius: 24,
backgroundColor: COLORS.CARD,
borderWidth: 1,
borderColor: COLORS.BORDER,
padding: 4,
overflow: "hidden",
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.08,
shadowRadius: 12,
shadowOffset: { width: 0, height: 5 },
},
android: {
elevation: 3,
},
}),
},

banner: {
width: "100%",
height: 220,
borderRadius: 22,
overflow: "hidden",
justifyContent: "space-between",
alignItems: "center",
paddingTop: 14,
paddingBottom: 18,
paddingHorizontal: 0,
},

bannerImage: {
borderRadius: 22,
},

bannerOverlay: {
...StyleSheet.absoluteFillObject,
backgroundColor: "rgba(0,0,0,0.18)",
borderRadius: 22,
},

bannerPill: {
alignSelf: "center",
flexDirection: "row",
alignItems: "center",
gap: 8,
paddingHorizontal: 18,
paddingVertical: 8,
borderRadius: 999,
backgroundColor: "rgba(255,255,255,0.93)",
borderWidth: 1,
borderColor: "rgba(255,255,255,0.78)",
...Platform.select({
ios: {
shadowColor: "#000",
shadowOpacity: 0.08,
shadowRadius: 8,
shadowOffset: { width: 0, height: 2 },
},
android: {
elevation: 2,
},
}),
},

bannerPillText: {
color: COLORS.GREEN_DARK,
fontWeight: "900",
fontSize: 14,
},

bannerCenter: {
flex: 1,
width: "100%",
alignItems: "center",
justifyContent: "center",
paddingHorizontal: 10,
},

bannerTitle: {
color: "#FFFFFF",
fontWeight: "900",
fontSize: 32,
lineHeight: 40,
textAlign: "center",
textShadowColor: "rgba(0,0,0,0.45)",
textShadowOffset: { width: 0, height: 2 },
textShadowRadius: 6,
},

bannerSubtitle: {
marginTop: 14,
color: "rgba(255,255,255,0.98)",
fontWeight: "800",
fontSize: 14,
lineHeight: 21,
textAlign: "center",
textShadowColor: "rgba(0,0,0,0.35)",
textShadowOffset: { width: 0, height: 1 },
textShadowRadius: 4,
},

// ---------------- Search block ----------------
searchBlockCard: {
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
shadowOffset: { width: 0, height: 4 },
},
android: { elevation: 2 },
}),
},
searchCard: { borderRadius: 18 },
label: {
fontSize: 12,
color: COLORS.MUTED,
marginBottom: 10,
fontWeight: "800",
},
searchRow: {
flexDirection: "row",
alignItems: "center",
gap: 10,
backgroundColor: COLORS.INPUT_BG,
borderWidth: 1,
borderColor: COLORS.BORDER,
borderRadius: 14,
paddingHorizontal: 12,
paddingVertical: 14,
},
searchPlaceholder: { color: COLORS.SUBTLE, fontWeight: "800", flex: 1 },

tipInsideCard: {
marginTop: 12,
flexDirection: "row",
alignItems: "center",
gap: 10,
backgroundColor: COLORS.LIGHT_GREEN,
borderWidth: 1,
borderColor: COLORS.LIGHT_GREEN_2,
borderRadius: 14,
padding: 12,
},
tipText: {
color: COLORS.GREEN_DARK,
fontSize: 13,
lineHeight: 17,
fontWeight: "800",
flex: 1,
},

// ---------------- Your Items card ----------------
yourItemsCard: {
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
shadowOffset: { width: 0, height: 4 },
},
android: { elevation: 2 },
}),
},
yourItemsHeader: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
marginBottom: 12,
},
sectionTitle: { fontSize: 16, fontWeight: "900", color: COLORS.TEXT },
sectionSub: { marginTop: 4, color: COLORS.MUTED, fontWeight: "800" },

cartIconWrap: {
width: 54,
height: 54,
borderRadius: 16,
backgroundColor: COLORS.GREEN_DARK,
alignItems: "center",
justifyContent: "center",
position: "relative",
},
cartIconWrapDisabled: { backgroundColor: COLORS.DISABLED_BG },
badge: {
position: "absolute",
right: -4,
top: -4,
backgroundColor: "#E53935",
minWidth: 20,
height: 20,
borderRadius: 10,
alignItems: "center",
justifyContent: "center",
paddingHorizontal: 6,
},
badgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },

emptyBoxInCard: {
backgroundColor: "#EEF3F1",
borderWidth: 1,
borderColor: "#D9E7E1",
borderRadius: 16,
padding: 14,
},
emptyTitle: { color: COLORS.TEXT, fontWeight: "900", marginBottom: 4 },
emptySub: { color: COLORS.MUTED, lineHeight: 18, fontWeight: "700" },

itemsList: {
borderRadius: 16,
overflow: "hidden",
borderWidth: 1,
borderColor: "#D9E7E1",
backgroundColor: "#F6FBF9",
},
itemRowWrap: { backgroundColor: "#F6FBF9" },
itemRow: {
paddingVertical: 12,
paddingHorizontal: 12,
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
gap: 10,
},
itemRowWithTopDivider: {
borderTopWidth: 1,
borderTopColor: "#D9E7E1",
},
itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
bullet: {
width: 10,
height: 10,
borderRadius: 999,
backgroundColor: COLORS.GREEN,
},
itemText: { color: COLORS.TEXT, fontWeight: "900", flex: 1 },
deleteIcon: { padding: 6 },

// ---------------- Bottom CTA ----------------
bottomBar: {
position: "absolute",
left: 16,
right: 16,
bottom: 16,
padding: 10,
borderRadius: 18,
},
nextBtn: {
backgroundColor: COLORS.GREEN_DARK,
borderRadius: 22,
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
shadowRadius: 10,
shadowOffset: { width: 0, height: 4 },
},
android: { elevation: 3 },
}),
},
nextText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
