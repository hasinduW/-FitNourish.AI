from __future__ import annotations

import os
import argparse
import pandas as pd
from dotenv import load_dotenv
import psycopg

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set")

EXPORT_SQL = """
SELECT
  cp.clean_product_id,
  cp.store,
  cp.normalized_name,
  pc.category_l1,
  pc.category_l2
FROM clean_products cp
JOIN product_categories pc
  ON pc.clean_product_id = cp.clean_product_id
WHERE pc.is_active = TRUE
  AND pc.model_version = %(label_model_version)s
  AND pc.taxonomy_version = %(taxonomy_version)s
  AND pc.category_l2 <> 'unknown'
  AND (%(store)s::text IS NULL OR cp.store = %(store)s::text)
ORDER BY cp.clean_product_id;
"""

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--taxonomy-version", default="v1")
    ap.add_argument("--label-model-version", default="rules_v1", help="labels source, e.g. rules_v1")
    ap.add_argument("--store", help="optional: keells/cargills")
    ap.add_argument("--out", default=os.path.join("data", "ml", "train_v1.csv"))
    args = ap.parse_args()

    params = {
        "taxonomy_version": args.taxonomy_version,
        "label_model_version": args.label_model_version,
        "store": args.store,
    }

    with psycopg.connect(DATABASE_URL) as conn:
        df = pd.read_sql(EXPORT_SQL, conn, params=params)

    if df.empty:
        raise RuntimeError("No training rows exported. Check that rules_v1 has active non-unknown categories.")

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    df.to_csv(args.out, index=False, encoding="utf-8")

    print("======================================")
    print("Exported training data")
    print(f"Rows      : {len(df)}")
    print(f"Out file  : {args.out}")
    print(f"Store     : {args.store or 'ALL'}")
    print("======================================")

if __name__ == "__main__":
    main()
