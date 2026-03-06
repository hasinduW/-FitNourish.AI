from __future__ import annotations

import os
import csv
import argparse
from decimal import Decimal
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set")

DEFAULT_CSV_PATH = os.path.join("data", "nutrition", "nutrition_reference_v1.csv")

# Matches your DB unique constraint: (taxonomy_version, category_l2)
UPSERT_SQL = """
INSERT INTO nutrition_reference (
  taxonomy_version, category_l1, category_l2,
  energy_kcal_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g,
  fiber_g_per_100g, sugar_g_per_100g, sodium_mg_per_100g,
  is_food, source_name, source_notes
)
VALUES (
  %(taxonomy_version)s, %(category_l1)s, %(category_l2)s,
  %(energy_kcal_per_100g)s, %(protein_g_per_100g)s, %(fat_g_per_100g)s, %(carbs_g_per_100g)s,
  %(fiber_g_per_100g)s, %(sugar_g_per_100g)s, %(sodium_mg_per_100g)s,
  %(is_food)s, %(source_name)s, %(source_notes)s
)
ON CONFLICT (taxonomy_version, category_l2) DO UPDATE SET
  category_l1 = EXCLUDED.category_l1,
  energy_kcal_per_100g = EXCLUDED.energy_kcal_per_100g,
  protein_g_per_100g = EXCLUDED.protein_g_per_100g,
  fat_g_per_100g = EXCLUDED.fat_g_per_100g,
  carbs_g_per_100g = EXCLUDED.carbs_g_per_100g,
  fiber_g_per_100g = EXCLUDED.fiber_g_per_100g,
  sugar_g_per_100g = EXCLUDED.sugar_g_per_100g,
  sodium_mg_per_100g = EXCLUDED.sodium_mg_per_100g,
  is_food = EXCLUDED.is_food,
  source_name = EXCLUDED.source_name,
  source_notes = EXCLUDED.source_notes;
"""


def dec_or_none(x: Optional[str]) -> Optional[Decimal]:
    x = (x or "").strip()
    if x == "":
        return None
    # allow commas (e.g., "1,234.5")
    x = x.replace(",", "")
    return Decimal(x)


def bool_from_csv(x: Optional[str]) -> bool:
    return str(x or "").strip().lower() in ("1", "true", "yes", "y")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default=DEFAULT_CSV_PATH, help="Path to nutrition_reference CSV")
    args = parser.parse_args()

    csv_path = args.csv
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    rows: List[Dict[str, Any]] = []

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        required_cols = {"taxonomy_version", "category_l1", "category_l2"}
        missing = required_cols - set(r.fieldnames or [])
        if missing:
            raise RuntimeError(f"Missing required CSV columns: {sorted(missing)}")

        for row in r:
            taxonomy_version = (row.get("taxonomy_version") or "").strip()
            category_l1 = (row.get("category_l1") or "").strip()
            category_l2 = (row.get("category_l2") or "").strip()

            if not taxonomy_version or not category_l1 or not category_l2:
                # skip invalid lines
                continue

            rows.append(
                {
                    "taxonomy_version": taxonomy_version,
                    "category_l1": category_l1,
                    "category_l2": category_l2,
                    "energy_kcal_per_100g": dec_or_none(row.get("energy_kcal_per_100g")),
                    "protein_g_per_100g": dec_or_none(row.get("protein_g_per_100g")),
                    "fat_g_per_100g": dec_or_none(row.get("fat_g_per_100g")),
                    "carbs_g_per_100g": dec_or_none(row.get("carbs_g_per_100g")),
                    "fiber_g_per_100g": dec_or_none(row.get("fiber_g_per_100g")),
                    "sugar_g_per_100g": dec_or_none(row.get("sugar_g_per_100g")),
                    "sodium_mg_per_100g": dec_or_none(row.get("sodium_mg_per_100g")),
                    "is_food": bool_from_csv(row.get("is_food", "true")),
                    "source_name": (row.get("source_name") or "").strip() or None,
                    "source_notes": (row.get("source_notes") or "").strip() or None,
                }
            )

    if not rows:
        print(f"No valid rows found in {csv_path}")
        return

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.executemany(UPSERT_SQL, rows)
        conn.commit()

    print("======================================")
    print("nutrition_reference loaded/updated")
    print(f"CSV      : {csv_path}")
    print(f"Rows     : {len(rows)}")
    print("======================================")


if __name__ == "__main__":
    main()
