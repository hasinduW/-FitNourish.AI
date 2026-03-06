import React, {
createContext,
useCallback,
useContext,
useEffect,
useMemo,
useRef,
useState,
} from "react";

/**
* ✅ Use the IP shown in Flask terminal
* - Real phone -> your PC IPv4 in same Wi-Fi
* - Android emulator -> http://10.0.2.2:5000
*/
const BACKEND_BASE_URL =
process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.8.101:5000";

// ---------------- TYPES ----------------

export type ProductVariant = {
clean_product_id: number;
canonical_name: string;
brand?: string | null;
store?: string | null;
size_value?: number | null;
size_unit?: string | null;
category_l1?: string | null;
category_l2?: string | null;
};

export type ProductGroupSearchRow = {
group_key: string; // canonical_name lower
canonical_name: string;
primary_clean_product_id: number;
variants: ProductVariant[]; // typically: 1 per store
};

export type StoreKey = "keells" | "cargills" | "spar";

export type GroceryItem = {
id: string; // UI id
group_key: string; // ✅ stable concept key (canonical lower)
clean_product_id: number; // DB id
name: string; // canonical_name
qty: number; // ✅ numeric qty (1,2,3...)
prices?: Partial<Record<StoreKey, number>>;
};

export type StorePrice = {
store: string;
outlet_code: string;
price: number | null;
final_price: number | null;
price_per_unit: number | null;
is_promo?: boolean;
scraped_at_utc?: string | null;
};

export type PriceRow = {
clean_product_id: number;
item_name: string | null;
qty: number;
stores: StorePrice[];
store_prices?: Record<string, number>;
};

type GroceryContextType = {
items: GroceryItem[];
prices: PriceRow[];

/** unique item concepts count (what you show in bottom card) */
cartCount: number;

/** Live search (grouped) */
searchProducts: (q: string, limit?: number) => Promise<ProductGroupSearchRow[]>;

/** Qty helpers for Search screen stepper */
getQtyByGroupKey: (group_key: string) => number;
setGroupQty: (group: ProductGroupSearchRow, qty: number) => void;
incGroup: (group: ProductGroupSearchRow) => void;
decGroup: (group: ProductGroupSearchRow) => void;

/** Remove whole concept from cart (all stores) */
removeGroup: (group_key: string) => void;

/** Prices */
fetchPrices: (itemList?: GroceryItem[]) => Promise<void>;
};

const GroceryContext = createContext<GroceryContextType | null>(null);

// ---------------- HELPERS ----------------

function normalizeStoreKey(raw: string): StoreKey | null {
const s = (raw || "").toLowerCase();
if (s.includes("keells")) return "keells";
if (s.includes("cargills")) return "cargills";
if (s.includes("spar")) return "spar";
return null;
}

function effectivePrice(sp: StorePrice): number | null {
if (typeof sp.final_price === "number") return sp.final_price;
if (typeof sp.price === "number") return sp.price;
return null;
}

function storeKeyOfVariant(v: ProductVariant): string {
return String(v.store ?? "").toLowerCase().trim();
}

function uid() {
return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampQty(n: number) {
if (!Number.isFinite(n)) return 0;
return Math.max(0, Math.floor(n));
}

// ---------------- PROVIDER ----------------

export function GroceryProvider({ children }: { children: React.ReactNode }) {
const [items, setItems] = useState<GroceryItem[]>([]);
const [prices, setPrices] = useState<PriceRow[]>([]);

// Abort stale price requests (avoid old response overriding new)
const pricesAbortRef = useRef<AbortController | null>(null);

// ✅ Live Search (DB) -> group by canonical_name
const searchProducts = useCallback(async (q: string, limit = 20) => {
const keyword = q.trim();
if (!keyword) return [];

try {
const url = `${BACKEND_BASE_URL}/products/search?q=${encodeURIComponent(
keyword
)}&limit=${limit}`;

const res = await fetch(url);
if (!res.ok) {
const text = await res.text();
console.log("❌ /products/search failed:", res.status, text);
return [];
}

const data = await res.json();
const rows: ProductVariant[] = Array.isArray(data?.items) ? data.items : [];

// Group by canonical_name (case-insensitive)
const map = new Map<string, ProductVariant[]>();
for (const r of rows) {
const name = String(r?.canonical_name ?? "").trim();
if (!name) continue;
const key = name.toLowerCase();
if (!map.has(key)) map.set(key, []);
map.get(key)!.push(r);
}

const groups: ProductGroupSearchRow[] = Array.from(map.entries()).map(
([key, variants]) => {
// Deduplicate variants by store
const byStore = new Map<string, ProductVariant>();
for (const v of variants) {
const sk = storeKeyOfVariant(v);
if (!sk) continue;
if (!byStore.has(sk)) byStore.set(sk, v);
}
const deduped = Array.from(byStore.values());

const ids = deduped
.map((v) => Number(v.clean_product_id))
.filter((x) => Number.isFinite(x));
const primaryId = ids.length
? Math.min(...ids)
: Number(deduped[0]?.clean_product_id ?? 0);

return {
group_key: key,
canonical_name:
deduped[0]?.canonical_name ??
variants[0]?.canonical_name ??
"",
primary_clean_product_id: primaryId,
variants: deduped.sort((a, b) =>
String(a.store ?? "").localeCompare(String(b.store ?? ""))
),
};
}
);

groups.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
return groups.slice(0, limit);
} catch (e) {
console.log("❌ /products/search network error:", e);
return [];
}
}, []);

// ✅ Count concepts (unique group_key)
const cartCount = useMemo(() => {
const set = new Set<string>();
for (const it of items) {
if (it.qty > 0) set.add(it.group_key);
}
return set.size;
}, [items]);

// ✅ get qty for a concept
const getQtyByGroupKey = useCallback(
(group_key: string) => {
const found = items.find((x) => x.group_key === group_key);
return found ? Number(found.qty) || 0 : 0;
},
[items]
);

// ✅ Fetch prices for selected DB ids
const fetchPrices = useCallback(
async (itemList?: GroceryItem[]) => {
const list = itemList ?? items;

if (!list || list.length === 0) {
setPrices([]);
setItems((prev) => prev.map((x) => ({ ...x, prices: {} })));
return;
}

const payloadItems = list.map((it) => ({
clean_product_id: it.clean_product_id,
qty: Number(it.qty) || 1,
}));

try {
// abort previous
if (pricesAbortRef.current) pricesAbortRef.current.abort();
const controller = new AbortController();
pricesAbortRef.current = controller;

const res = await fetch(`${BACKEND_BASE_URL}/prices`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ items: payloadItems }),
signal: controller.signal,
});

const text = await res.text();
if (!res.ok) {
console.log("❌ /prices failed:", res.status, text);
setPrices([]);
return;
}

const data = JSON.parse(text);
const rows: PriceRow[] = Array.isArray(data?.items) ? data.items : [];
setPrices(rows);

// Fill item.prices
const byId = new Map<number, Partial<Record<StoreKey, number>>>();
for (const r of rows) {
const map: Partial<Record<StoreKey, number>> = {};
for (const sp of r.stores || []) {
const key = normalizeStoreKey(sp.store);
const p = effectivePrice(sp);
if (key && typeof p === "number") map[key] = p;
}
byId.set(Number(r.clean_product_id), map);
}

setItems((prev) =>
prev.map((it) => ({
...it,
prices: byId.get(it.clean_product_id) ?? {},
}))
);
} catch (err: any) {
if (err?.name === "AbortError") return;
console.log("❌ fetchPrices error:", err);
setPrices([]);
}
},
[items]
);

/**
* ✅ setGroupQty:
* qty=0 -> remove all variants for that group
* qty>0 -> ensure variants exist (1 per store) and set same qty for all
*/
const setGroupQty = useCallback(
(group: ProductGroupSearchRow, qty: number) => {
const q = clampQty(qty);
const gk = String(group.group_key || "").toLowerCase().trim();
if (!gk) return;

// Deduplicate variants by store
const byStore = new Map<string, ProductVariant>();
for (const v of group.variants ?? []) {
const store = storeKeyOfVariant(v);
if (!store) continue;
if (!byStore.has(store)) byStore.set(store, v);
}
const dedupedVariants = Array.from(byStore.values());

setItems((prev) => {
// remove all if q==0
if (q <= 0) {
const next = prev.filter((x) => x.group_key !== gk);
return next;
}

// update existing items for group
const existing = prev.filter((x) => x.group_key === gk);
const existingIds = new Set(existing.map((x) => x.clean_product_id));

// create missing store variants
const missing: GroceryItem[] = dedupedVariants
.filter((v) => !existingIds.has(Number(v.clean_product_id)))
.map((v) => ({
id: uid(),
group_key: gk,
clean_product_id: Number(v.clean_product_id),
name: group.canonical_name,
qty: q,
prices: {},
}));

const next = [
...prev
.filter((x) => x.group_key !== gk)
.concat(
existing.map((x) => ({ ...x, qty: q, name: group.canonical_name }))
),
...missing,
];

// keep newest on top (optional)
next.sort((a, b) => (a.id < b.id ? 1 : -1));
return next;
});
},
[]
);

const incGroup = useCallback(
(group: ProductGroupSearchRow) => {
const gk = String(group.group_key || "").toLowerCase().trim();
const current = getQtyByGroupKey(gk);
setGroupQty(group, current + 1);
},
[getQtyByGroupKey, setGroupQty]
);

const decGroup = useCallback(
(group: ProductGroupSearchRow) => {
const gk = String(group.group_key || "").toLowerCase().trim();
const current = getQtyByGroupKey(gk);
setGroupQty(group, current - 1);
},
[getQtyByGroupKey, setGroupQty]
);

const removeGroup = useCallback((group_key: string) => {
const gk = String(group_key || "").toLowerCase().trim();
if (!gk) return;
setItems((prev) => prev.filter((x) => x.group_key !== gk));
}, []);

// ✅ auto refresh prices when cart changes (debounced)
const itemsKey = useMemo(() => {
return (items || [])
.map((it) => `${it.clean_product_id}:${Number(it.qty) || 1}`)
.sort()
.join("|");
}, [items]);

useEffect(() => {
if (!items || items.length === 0) {
setPrices([]);
return;
}
const t = setTimeout(() => {
fetchPrices(items);
}, 250);
return () => clearTimeout(t);
}, [itemsKey, fetchPrices]);

const value = useMemo(
() => ({
items,
prices,
cartCount,
searchProducts,
getQtyByGroupKey,
setGroupQty,
incGroup,
decGroup,
removeGroup,
fetchPrices,
}),
[
items,
prices,
cartCount,
searchProducts,
getQtyByGroupKey,
setGroupQty,
incGroup,
decGroup,
removeGroup,
fetchPrices,
]
);

return (
<GroceryContext.Provider value={value}>{children}</GroceryContext.Provider>
);
}

export function useGrocery() {
const ctx = useContext(GroceryContext);
if (!ctx) throw new Error("useGrocery must be used inside <GroceryProvider>");
return ctx;
}
