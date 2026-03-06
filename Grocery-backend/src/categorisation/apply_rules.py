from __future__ import annotations

import os
import re
import argparse
from typing import Optional, Tuple, List, Dict, Any

from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set in .env")


# =============================
# Config
# =============================
TAXONOMY_VERSION = "v1"
METHOD = "rules"
MODEL_VERSION = "rules_v1"


# =============================
# Helpers
# =============================
def normalize(text: str) -> str:
    t = (text or "").strip().lower()
    t = re.sub(r"[^\w\s\.]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


# =============================
# Rule definitions (Sri Lanka focused)
# =============================
CATEGORY_RULES: List[Tuple[str, str, List[str]]] = [

    # --- Beverages ---
    ("beverages", "tea", ["tea bopf", "tea kahata", "tea"]),
    ("beverages", "water", ["drinking water", "water"]),
    ("beverages", "juice", ["juice", "nectar"]),

    # --- Staples ---
    ("staples", "rice", ["rice", "basmati", "samba", "nadu"]),
    ("staples", "lentils_pulses", ["dhal", "dal", "lentil", "gram", "chickpea", "peas", "beans"]),
    ("staples", "flour", ["flour", "wheat flour", "atta", "semolina"]),
    ("staples", "salt", ["table salt", "salt"]),
    ("staples", "papadams", ["papadam", "papadum"]),

    # --- Dairy ---
    ("dairy", "milk_powder", ["milk powder", "powdered milk"]),
    ("dairy", "cream", ["whipping cream", "cream powder"]),

    # --- Fats ---
    ("fats", "oils", ["coconut oil", "vegetable oil", "oil"]),

    # --- Protein ---
    ("protein", "eggs", ["egg", "eggs"]),
    ("protein", "dried_fish", ["maldive fish"]),

    # --- Snacks ---
    ("snacks", "biscuits", ["biscuit", "cookie", "wafer", "cracker"]),
    ("snacks", "popcorn", ["popcorn"]),

    # --- Condiments ---
    ("condiments", "sauces", ["tomato sauce", "soya sauce", "soy sauce"]),
    ("condiments", "pickles", ["pickle", "malay pickle"]),

    # --- Spices ---
    ("spices", "spice_mixes", ["tikka mix", "bbq chicken", "chicken tikka"]),
    ("spices", "spices", ["chilli", "pepper", "cumin", "turmeric", "coriander", "mustard", "dill", "goraka", "curry powder"]),

    # --- Fruits ---
    ("fruits", "dried_fruits", ["dates"]),
]


def classify(normalized_name: str) -> Tuple[str, str, str]:
    """
    Returns:
        (category_l1, category_l2, explain)
    """
    n = normalize(normalized_name)

    for l1, l2, keywords in CATEGORY_RULES:
        for kw in keywords:
            if kw in n:
                return l1, l2, f"kw:{kw}"

    return "unknown", "unknown", "no_match"


# =============================
# SQL
# =============================

SELECT_CLEAN_PRODUCTS = """
SELECT clean_product_id, store, normalized_name
FROM clean_products
WHERE (%(store)s::text IS NULL OR store = %(store)s::text)
ORDER BY clean_product_id;
"""


DEACTIVATE_MODEL_VERSION = """
UPDATE product_categories pc
SET is_active = FALSE
FROM clean_products cp
WHERE pc.clean_product_id = cp.clean_product_id
  AND pc.model_version = %(model_version)s
  AND (%(store)s::text IS NULL OR cp.store = %(store)s::text);
"""


INSERT_CATEGORY = """
INSERT INTO product_categories (
    clean_product_id,
    taxonomy_version,
    method,
    model_version,
    category_l1,
    category_l2,
    confidence,
    explain,
    is_active
)
VALUES (
    %(clean_product_id)s,
    %(taxonomy_version)s,
    %(method)s,
    %(model_version)s,
    %(category_l1)s,
    %(category_l2)s,
    %(confidence)s,
    %(explain)s,
    %(is_active)s
)
ON CONFLICT (clean_product_id, model_version)
DO UPDATE SET
    taxonomy_version = EXCLUDED.taxonomy_version,
    method = EXCLUDED.method,
    category_l1 = EXCLUDED.category_l1,
    category_l2 = EXCLUDED.category_l2,
    confidence = EXCLUDED.confidence,
    explain = EXCLUDED.explain,
    is_active = EXCLUDED.is_active;
"""


# =============================
# Main
# =============================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--store", help="Filter by store (e.g. keells, cargills)")
    args = parser.parse_args()

    store = args.store

    total = 0
    classified = 0
    rows: List[Dict[str, Any]] = []

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:

            # deactivate only matching store + model
            cur.execute(
                DEACTIVATE_MODEL_VERSION,
                {
                    "model_version": MODEL_VERSION,
                    "store": store,
                },
            )

            # fetch products
            cur.execute(SELECT_CLEAN_PRODUCTS, {"store": store})

            for clean_product_id, store_name, normalized_name in cur.fetchall():
                total += 1

                l1, l2, explain = classify(normalized_name)

                rows.append(
                    {
                        "clean_product_id": clean_product_id,
                        "taxonomy_version": TAXONOMY_VERSION,
                        "method": METHOD,
                        "model_version": MODEL_VERSION,
                        "category_l1": l1,
                        "category_l2": l2,
                        "confidence": None,  # rules baseline
                        "explain": explain,
                        "is_active": True,
                    }
                )

                if l1 != "unknown":
                    classified += 1

            if rows:
                cur.executemany(INSERT_CATEGORY, rows)

        conn.commit()

    print("======================================")
    print("Categorisation completed")
    print(f"Model version : {MODEL_VERSION}")
    print(f"Store         : {store or 'ALL'}")
    print(f"Total products: {total}")
    print(f"Classified    : {classified}")
    print(f"Unknown       : {total - classified}")
    print("======================================")


if __name__ == "__main__":
    main()
