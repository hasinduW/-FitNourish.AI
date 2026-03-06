from __future__ import annotations

import os
import argparse
from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set")

DEFAULT_MODEL_VERSION = "rules_v1"
DEFAULT_TAXONOMY_VERSION = "v1"


# Delete only the slice we are rebuilding (safe for future taxonomy versions)
DELETE_EXISTING = """
DELETE FROM product_nutrition
WHERE model_version = %(model_version)s
  AND taxonomy_version = %(taxonomy_version)s
  AND (
        %(store)s::text IS NULL
        OR clean_product_id IN (
            SELECT clean_product_id
            FROM clean_products
            WHERE store = %(store)s::text
        )
  );
"""

# Build product nutrition by joining active categories with nutrition reference
# IMPORTANT: your schema uses unique (taxonomy_version, category_l2), so we join on that.
# We also exclude unknown categories.
INSERT_MAP = """
INSERT INTO product_nutrition (
  clean_product_id,
  taxonomy_version,
  model_version,
  category_l1,
  category_l2,
  energy_kcal_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g,
  fiber_g_per_100g, sugar_g_per_100g, sodium_mg_per_100g,
  confidence
)
SELECT
  pc.clean_product_id,
  pc.taxonomy_version,
  pc.model_version,
  pc.category_l1,
  pc.category_l2,
  nr.energy_kcal_per_100g,
  nr.protein_g_per_100g,
  nr.fat_g_per_100g,
  nr.carbs_g_per_100g,
  nr.fiber_g_per_100g,
  nr.sugar_g_per_100g,
  nr.sodium_mg_per_100g,
  pc.confidence
FROM product_categories pc
JOIN clean_products cp
  ON cp.clean_product_id = pc.clean_product_id
JOIN nutrition_reference nr
  ON nr.taxonomy_version = pc.taxonomy_version
 AND nr.category_l2 = pc.category_l2
WHERE pc.is_active = TRUE
  AND pc.model_version = %(model_version)s
  AND pc.taxonomy_version = %(taxonomy_version)s
  AND (%(store)s::text IS NULL OR cp.store = %(store)s::text)
  AND pc.category_l2 <> 'unknown'
  AND nr.is_food = TRUE
ON CONFLICT (clean_product_id, model_version) DO UPDATE SET
  taxonomy_version = EXCLUDED.taxonomy_version,
  category_l1 = EXCLUDED.category_l1,
  category_l2 = EXCLUDED.category_l2,
  energy_kcal_per_100g = EXCLUDED.energy_kcal_per_100g,
  protein_g_per_100g = EXCLUDED.protein_g_per_100g,
  fat_g_per_100g = EXCLUDED.fat_g_per_100g,
  carbs_g_per_100g = EXCLUDED.carbs_g_per_100g,
  fiber_g_per_100g = EXCLUDED.fiber_g_per_100g,
  sugar_g_per_100g = EXCLUDED.sugar_g_per_100g,
  sodium_mg_per_100g = EXCLUDED.sodium_mg_per_100g,
  confidence = EXCLUDED.confidence;
"""

COUNT_ROWS = """
SELECT COUNT(*)
FROM product_nutrition
WHERE model_version = %(model_version)s
  AND taxonomy_version = %(taxonomy_version)s
  AND (
    %(store)s::text IS NULL
    OR clean_product_id IN (
      SELECT clean_product_id
      FROM clean_products
      WHERE store = %(store)s::text
    )
  );
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-version", default=DEFAULT_MODEL_VERSION, help="e.g. rules_v1, ml_v1")
    parser.add_argument("--taxonomy-version", default=DEFAULT_TAXONOMY_VERSION, help="e.g. v1, v2")
    parser.add_argument("--store", help="Optional: build nutrition only for a store (keells/cargills)")
    args = parser.parse_args()

    model_version = args.model_version
    taxonomy_version = args.taxonomy_version
    store = args.store  # may be None

    params = {
        "model_version": model_version,
        "taxonomy_version": taxonomy_version,
        "store": store,
    }

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Safe rebuild for the slice (NOTE: store param must be passed)
            cur.execute(DELETE_EXISTING, params)

            # Insert/Upsert mapped rows
            cur.execute(INSERT_MAP, params)

            # Count for reporting
            cur.execute(COUNT_ROWS, params)
            count = cur.fetchone()[0]

        conn.commit()

    print("======================================")
    print("Built product_nutrition")
    print(f"Model version   : {model_version}")
    print(f"Taxonomy version: {taxonomy_version}")
    print(f"Store           : {store or 'ALL'}")
    print(f"Rows in product_nutrition (slice): {count}")
    print("======================================")


if __name__ == "__main__":
    main()
