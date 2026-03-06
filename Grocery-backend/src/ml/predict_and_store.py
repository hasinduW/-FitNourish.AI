from __future__ import annotations

import os
import argparse
from typing import Any, Dict, List, Tuple, Optional

from dotenv import load_dotenv
import psycopg
from joblib import load

# sklearn metrics (install scikit-learn)
from sklearn.metrics import accuracy_score, classification_report, f1_score

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set")

# Inference-only select
SELECT_PRODUCTS = """
SELECT clean_product_id, store, normalized_name
FROM clean_products
WHERE (%(store)s::text IS NULL OR store = %(store)s::text)
ORDER BY clean_product_id;
"""

# Evaluation select (joins to ground-truth labels from product_categories)
SELECT_PRODUCTS_WITH_LABELS = """
SELECT
  cp.clean_product_id,
  cp.store,
  cp.normalized_name,
  pc.category_l2 AS true_category_l2
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

# Note: your product_categories has unique (clean_product_id, model_version)
UPSERT_CATEGORY = """
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
ON CONFLICT (clean_product_id, model_version) DO UPDATE SET
  taxonomy_version = EXCLUDED.taxonomy_version,
  method = EXCLUDED.method,
  category_l1 = EXCLUDED.category_l1,
  category_l2 = EXCLUDED.category_l2,
  confidence = EXCLUDED.confidence,
  explain = EXCLUDED.explain,
  is_active = EXCLUDED.is_active;
"""


def _predict_with_confidence(pipe, names: List[str]) -> Tuple[List[str], List[Optional[float]]]:
    preds = pipe.predict(names)
    preds = [str(p) for p in preds]

    # Try to compute probability confidence (LogReg supports predict_proba)
    try:
        probs = pipe.predict_proba(names)
        classes = pipe.named_steps["clf"].classes_
        class_to_idx = {c: i for i, c in enumerate(classes)}
        confs = [float(probs[i][class_to_idx[preds[i]]]) for i in range(len(preds))]
    except Exception:
        confs = [None] * len(preds)

    return preds, confs


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-path", default=os.path.join("models", "ml_v1.joblib"))
    ap.add_argument("--taxonomy-version", default="v1")
    ap.add_argument("--store", help="optional: keells/cargills")
    ap.add_argument("--model-version", default="ml_v1")
    ap.add_argument("--activate", action="store_true", help="if set, write ML predictions as active")

    # NEW: evaluation options
    ap.add_argument("--eval-against", dest="label_model_version", help="e.g. rules_v1 (ground truth)")
    ap.add_argument("--eval-only", action="store_true", help="only evaluate, do not write to DB")
    ap.add_argument("--report", action="store_true", help="print full classification report")

    args = ap.parse_args()

    bundle = load(args.model_path)
    pipe = bundle["pipeline"]
    label_col = bundle.get("label_col", "category_l2")

    predict_l2 = (label_col == "category_l2")
    if not predict_l2:
        raise RuntimeError(
            "This evaluation script expects an L2 classifier (label_col=category_l2). "
            "If you trained on category_l1, adjust evaluation to compare L1 instead."
        )

    # If evaluating, use labeled query; else use unlabeled query
    do_eval = bool(args.label_model_version)

    rows: List[Dict[str, Any]] = []
    total = 0

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            if do_eval:
                cur.execute(
                    SELECT_PRODUCTS_WITH_LABELS,
                    {
                        "store": args.store,
                        "taxonomy_version": args.taxonomy_version,
                        "label_model_version": args.label_model_version,
                    },
                )
                labeled_data: List[Tuple[int, str, str, str]] = cur.fetchall()
                if not labeled_data:
                    print("No labeled rows found for evaluation. Check rules_v1 active labels exist.")
                    return

                ids = [r[0] for r in labeled_data]
                names = [(r[2] or "").strip() for r in labeled_data]
                y_true = [str(r[3]) for r in labeled_data]

                y_pred, confs = _predict_with_confidence(pipe, names)

                acc = accuracy_score(y_true, y_pred)
                macro_f1 = f1_score(y_true, y_pred, average="macro")

                print("======================================")
                print("Evaluation results")
                print(f"Compared against : {args.label_model_version} (active labels)")
                print(f"Taxonomy version : {args.taxonomy_version}")
                print(f"Store            : {args.store or 'ALL'}")
                print(f"Rows evaluated   : {len(y_true)}")
                print(f"Accuracy         : {acc:.4f}")
                print(f"Macro F1         : {macro_f1:.4f}")
                print("======================================")

                if args.report:
                    print(classification_report(y_true, y_pred, zero_division=0))

                # If eval-only, stop here
                if args.eval_only:
                    return

                # Otherwise, we will continue and write predictions for these same ids
                # (write only for evaluated subset)
                for i in range(len(ids)):
                    total += 1
                    rows.append(
                        {
                            "clean_product_id": ids[i],
                            "taxonomy_version": args.taxonomy_version,
                            "method": "ml",
                            "model_version": args.model_version,
                            "category_l1": "unknown",
                            "category_l2": y_pred[i],
                            "confidence": confs[i],
                            "explain": f"ml:{os.path.basename(args.model_path)}",
                            "is_active": bool(args.activate),
                        }
                    )

            else:
                # normal inference on all clean_products
                cur.execute(SELECT_PRODUCTS, {"store": args.store})
                data: List[Tuple[int, str, str]] = cur.fetchall()
                if not data:
                    print("No clean_products found for the given filters.")
                    return

                ids = [r[0] for r in data]
                names = [(r[2] or "").strip() for r in data]

                y_pred, confs = _predict_with_confidence(pipe, names)

                for i in range(len(ids)):
                    total += 1
                    rows.append(
                        {
                            "clean_product_id": ids[i],
                            "taxonomy_version": args.taxonomy_version,
                            "method": "ml",
                            "model_version": args.model_version,
                            "category_l1": "unknown",
                            "category_l2": y_pred[i],
                            "confidence": confs[i],
                            "explain": f"ml:{os.path.basename(args.model_path)}",
                            "is_active": bool(args.activate),
                        }
                    )

            # Write predictions
            cur.executemany(UPSERT_CATEGORY, rows)
        conn.commit()

    print("======================================")
    print("ML predictions stored in product_categories")
    print(f"Model version : {args.model_version}")
    print(f"Taxonomy      : {args.taxonomy_version}")
    print(f"Store         : {args.store or 'ALL'}")
    print(f"Rows written  : {total}")
    print(f"Active?       : {bool(args.activate)}")
    print("======================================")


if __name__ == "__main__":
    main()
