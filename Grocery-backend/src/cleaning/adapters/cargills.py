from __future__ import annotations

from typing import Dict, Any


def adapt_cargills_raw(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a raw_products row (already normalized by loader) into the
    canonical adapter format used by build_clean_and_fact_rows().

    The raw row shape comes from RAW_SELECT_SQL:
      store, outlet_code, scraped_at_utc, item_code, name, price, final_price, is_promo
    """
    price = raw.get("final_price") if raw.get("final_price") is not None else raw.get("price")

    return {
        "store": raw["store"],                        # "cargills"
        "outlet_code": raw["outlet_code"],            # e.g. "Colombo" (or webstore_id if you chose that)
        "scraped_at_utc": raw["scraped_at_utc"],

        # product identity
        "source_item_code": raw.get("item_code"),     # required for stable product key
        "name": raw.get("name"),

        # pricing
        "price": price,
        "is_promo": bool(raw.get("is_promo")) if raw.get("is_promo") is not None else False,
        "currency": "LKR",                            # if your system assumes a default, keep this consistent
    }
