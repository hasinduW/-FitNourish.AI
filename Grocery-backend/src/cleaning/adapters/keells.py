from __future__ import annotations
from typing import Dict, Any

def adapt_keells_raw(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Input row = row from raw_products query (dict-style in the pipeline).
    Output = canonical adapter row expected by core.build_clean_and_fact_rows()
    """
    return {
        "store": row["store"],
        "outlet_code": row["outlet_code"],
        "scraped_at_utc": row["scraped_at_utc"],
        "name": row["name"],
        "price": row["price"],
        "final_price": row.get("final_price"),
        "is_promo": row.get("is_promo"),
        "brand": None,                 # temporary heuristic
        "store_noise_words": {"keells"},   # remove 'keells' from canonical name
    }
