from __future__ import annotations

import re
from decimal import Decimal
from typing import Optional, Tuple, Dict, Any, List


# -----------------------------
# Normalization helpers
# -----------------------------

# common packaging noise words across Sri Lanka grocery listings
NOISE_WORDS = {
    "pet", "pkt", "pack", "bottle", "jar", "tin", "pouch", "bag",
    "assorted", "small", "large"
}

def normalize_name(name: str) -> str:
    n = (name or "").strip().lower()
    # keep letters/numbers/underscore/dot/space
    n = re.sub(r"[^\w\s\.]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n

def remove_noise_tokens(n: str) -> str:
    tokens = n.split()
    cleaned = [t for t in tokens if t not in NOISE_WORDS]
    return " ".join(cleaned).strip()


# -----------------------------
# Size / pack parsing (Sri Lanka realities)
# -----------------------------

# weights/volumes: 500ml, 1.5L, 100g, 2kg
SIZE_RE = re.compile(r"""(?P<val>\d+(?:\.\d+)?)\s*(?P<unit>kg|g|l|ml)\b""", re.IGNORECASE)

# multipack like "3x50g", "500g x 2"
MULTIPACK_RE = re.compile(
    r"""
    # 500g x 2   OR   500g * 2   (also allow 2s)
    (?P<a>\d+(?:\.\d+)?)\s*(?P<unit>kg|g|l|ml)\s*[*xX]\s*(?P<b>\d+)\s*(?:s\b|\b)
    |
    # 3x50g OR 3*50g
    (?P<count>\d+)\s*[*xX]\s*(?P<val>\d+(?:\.\d+)?)\s*(?P<unit2>kg|g|l|ml)\b
    """,
    re.IGNORECASE | re.VERBOSE,
)

# counts: "10s", "12s", "1 No", "2 Nos", "4 pcs", "Pack of 6", "6 pack"
COUNT_S_RE = re.compile(r"""(?<!\d)(?P<count>\d{1,3})\s*s\b""", re.IGNORECASE)  # eggs 10s
COUNT_UNIT_RE = re.compile(r"""(?P<count>\d{1,4})\s*(pcs|pc|nos|no)\b""", re.IGNORECASE)
PACK_OF_RE = re.compile(r"""pack\s*of\s*(?P<count>\d{1,4})\b""", re.IGNORECASE)
N_PACK_RE = re.compile(r"""(?P<count>\d{1,4})\s*pack\b""", re.IGNORECASE)


def extract_size(text: str) -> Tuple[Optional[Decimal], Optional[str]]:
    """
    Extract size from product text.
    Supports:
      - weights/volumes: 500ml, 1.5L, 100g, 2kg
      - multipacks: 3x50g, 500g x 2
      - counts: 10s, 12s, 1 no, 2 nos, 4 pcs, pack of 6, 6 pack
    Returns: (size_value, size_unit)
      - size_unit in {"g","kg","ml","l","pcs"}
    """
    if not text:
        return None, None

    # 1) multipack patterns
    m = MULTIPACK_RE.search(text)
    if m:
        # pattern: "500g x 2"
        if m.group("a") and m.group("unit") and m.group("b"):
            a = Decimal(m.group("a"))
            unit = m.group("unit").lower()
            b = Decimal(m.group("b"))
            return (a * b, unit)

        # pattern: "3x50g"
        if m.group("count") and m.group("val") and m.group("unit2"):
            count = Decimal(m.group("count"))
            val = Decimal(m.group("val"))
            unit = m.group("unit2").lower()
            return (count * val, unit)

    # 2) explicit count units: "2 nos", "4 pcs", "1 no"
    m = COUNT_UNIT_RE.search(text)
    if m:
        return Decimal(m.group("count")), "pcs"

    # 3) pack-of patterns
    m = PACK_OF_RE.search(text)
    if m:
        return Decimal(m.group("count")), "pcs"

    m = N_PACK_RE.search(text)
    if m:
        return Decimal(m.group("count")), "pcs"

    # 4) "10s" (common for eggs etc.)
    # Only apply if no weight/volume is present (avoid weird matches)
    if not SIZE_RE.search(text):
        m = COUNT_S_RE.search(text)
        if m:
            return Decimal(m.group("count")), "pcs"

    # 5) normal size: g/ml/kg/l
    m = SIZE_RE.search(text)
    if not m:
        return None, None

    val = Decimal(m.group("val"))
    unit = m.group("unit").lower()
    return val, unit


def canonicalize(raw_name: str, store_noise_words: Optional[set[str]] = None) -> Tuple[str, str, Optional[Decimal], Optional[str]]:
    """
    Returns: canonical_name, normalized_name, size_value, size_unit
    """
    norm = normalize_name(raw_name)
    size_value, size_unit = extract_size(norm)

    # remove weight/volume and count tokens from name
    no_size = re.sub(r"\d+(?:\.\d+)?\s*(kg|g|l|ml)\b", " ", norm, flags=re.IGNORECASE)
    no_size = re.sub(r"\b\d{1,4}\s*(pcs|pc|nos|no)\b", " ", no_size, flags=re.IGNORECASE)
    no_size = re.sub(r"\b\d{1,3}\s*s\b", " ", no_size, flags=re.IGNORECASE)  # 10s
    no_size = re.sub(r"\bpack\s*of\s*\d{1,4}\b", " ", no_size, flags=re.IGNORECASE)
    no_size = re.sub(r"\b\d{1,4}\s*pack\b", " ", no_size, flags=re.IGNORECASE)
    no_size = re.sub(r"\s+", " ", no_size).strip()

    canonical = remove_noise_tokens(no_size)

    # remove store-specific noise tokens (like 'keells') if provided
    if store_noise_words:
        tokens = canonical.split()
        canonical = " ".join([t for t in tokens if t not in store_noise_words]).strip()

    if not canonical:
        canonical = no_size if no_size else norm

    normalized = canonical
    return canonical.title(), normalized, size_value, size_unit


# -----------------------------
# Brand + category mapping (starter)
# -----------------------------

SRI_LANKA_BRANDS = {
    "anchor", "highland", "munchee", "maggie", "nestle", "prima", "harischandra",
    "md", "maliban", "cic", "dilmah", "lipton", "lux", "sunlight", "signal",
    "clear", "lifebuoy", "harpic", "vim", "surf", "rin", "sanitarium",
}

CATEGORY_RULES: List[Tuple[str, str, List[str]]] = [
    ("household", "cleaning", ["dishwash", "soap", "detergent", "toilet", "floor", "glass cleaner", "bleach", "tissue", "serviette"]),
    ("beverages", "water", ["drinking water", "water"]),
    ("snacks", "biscuits", ["biscuit", "cookie", "wafer", "cracker"]),
    ("staples", "rice_flour", ["rice", "flour", "wheat", "semolina"]),
    ("staples", "lentils_pulses", ["dhal", "lentil", "chickpea", "peas", "beans"]),
    ("spices", "spices", ["coriander", "mustard", "dill", "pepper", "chilli", "turmeric", "cumin", "goraka"]),
    ("dairy", "milk_powder", ["milk powder", "powdered milk"]),
    ("bakery", "bread", ["bread", "roti"]),
    ("eggs", "eggs", ["egg", "eggs"]),
]


def extract_brand(raw_name: str, store_noise_words: Optional[set[str]] = None) -> Optional[str]:
    if not raw_name:
        return None

    tokens = raw_name.strip().split()
    if not tokens:
        return None

    # normalize first token for matching
    t0 = normalize_name(tokens[0])

    # skip store noise (like 'keells')
    if store_noise_words and t0 in store_noise_words and len(tokens) > 1:
        t0 = normalize_name(tokens[1])
        # also shift original token for output
        first_token = tokens[1]
    else:
        first_token = tokens[0]

    if t0 in SRI_LANKA_BRANDS:
        return t0.title()

    # avoid silly brands
    if t0 in {"pack", "pcs", "pc", "no", "nos"}:
        return None

    return first_token.title()


def map_category(normalized_name: str) -> Tuple[Optional[str], Optional[str]]:
    n = normalize_name(normalized_name)
    for l1, l2, keywords in CATEGORY_RULES:
        for kw in keywords:
            if kw in n:
                return l1, l2
    return None, None


# -----------------------------
# Decimal helpers
# -----------------------------

def to_decimal(x) -> Optional[Decimal]:
    if x is None:
        return None
    try:
        return Decimal(str(x))
    except Exception:
        return None


def compute_price_per_unit(final_price: Optional[Decimal], size_value: Optional[Decimal], size_unit: Optional[str]) -> Optional[Decimal]:
    """
    Standardize:
      - g/kg => price per 100g
      - ml/l => price per 1L
      - pcs   => price per 1 pc
    """
    if final_price is None or size_value is None or size_unit is None:
        return None

    try:
        if size_unit == "g":
            return (final_price / size_value) * Decimal(100) if size_value != 0 else None
        if size_unit == "kg":
            grams = size_value * Decimal(1000)
            return (final_price / grams) * Decimal(100) if grams != 0 else None
        if size_unit == "ml":
            return (final_price / size_value) * Decimal(1000) if size_value != 0 else None
        if size_unit == "l":
            ml = size_value * Decimal(1000)
            return (final_price / ml) * Decimal(1000) if ml != 0 else None
        if size_unit == "pcs":
            return (final_price / size_value) if size_value != 0 else None
        return None
    except Exception:
        return None


# -----------------------------
# SQL used by build_clean_layer.py
# -----------------------------

UPSERT_CLEAN_PRODUCT_SQL = """
INSERT INTO clean_products (
  store, brand, canonical_name, normalized_name,
  size_value, size_unit, category_l1, category_l2
)
VALUES (
  %(store)s, %(brand)s, %(canonical_name)s, %(normalized_name)s,
  %(size_value)s, %(size_unit)s, %(category_l1)s, %(category_l2)s
)
ON CONFLICT (store, normalized_name, size_value, size_unit)
DO UPDATE SET
  canonical_name = EXCLUDED.canonical_name
RETURNING clean_product_id;
"""

INSERT_PRICE_FACT_SQL = """
INSERT INTO product_price_facts (
  clean_product_id, scraped_at_utc, outlet_code,
  price, final_price, price_per_unit, is_promo
)
VALUES (
  %(clean_product_id)s, %(scraped_at_utc)s, %(outlet_code)s,
  %(price)s, %(final_price)s, %(price_per_unit)s, %(is_promo)s
)
ON CONFLICT (clean_product_id, scraped_at_utc, outlet_code) DO NOTHING;
"""


def build_clean_and_fact_rows(adapter_row: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    adapter_row must provide:
      store, outlet_code, scraped_at_utc, name, price, final_price, is_promo
    Optional:
      brand
      store_noise_words (set[str]) e.g. {"keells"}
    """
    store = adapter_row["store"]
    outlet_code = adapter_row["outlet_code"]
    scraped_at_utc = adapter_row["scraped_at_utc"]
    name = adapter_row["name"]

    store_noise_words = adapter_row.get("store_noise_words")
    brand = adapter_row.get("brand")

    canonical_name, normalized_name, size_value, size_unit = canonicalize(name, store_noise_words=store_noise_words)

    # brand fallback if adapter didn't provide one
    if not brand:
        brand = extract_brand(name, store_noise_words=store_noise_words)

    category_l1, category_l2 = map_category(normalized_name)

    price_d = to_decimal(adapter_row.get("price"))
    final_d = to_decimal(adapter_row.get("final_price")) if adapter_row.get("final_price") is not None else price_d

    ppu = compute_price_per_unit(final_d, size_value, size_unit)

    clean_row = {
        "store": store,
        "brand": brand,
        "canonical_name": canonical_name,
        "normalized_name": normalized_name,
        "size_value": size_value,
        "size_unit": size_unit,
        "category_l1": category_l1,
        "category_l2": category_l2,
    }

    fact_row = {
        "outlet_code": outlet_code,
        "scraped_at_utc": scraped_at_utc,
        "price": price_d,
        "final_price": final_d,
        "price_per_unit": ppu,
        "is_promo": adapter_row.get("is_promo"),
    }

    return clean_row, fact_row
