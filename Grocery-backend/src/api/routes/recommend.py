# src/api/routes/recommend.py
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Tuple

import psycopg
import requests
from dotenv import load_dotenv
from flask import Blueprint, jsonify, request
from psycopg.rows import dict_row

from src.services.distance_provider import get_distance_result

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")  # required for polyline
GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"

bp = Blueprint("recommend", __name__)

SQL_LATEST_PRICES_BY_IDS = """
WITH latest_prices AS (
  SELECT DISTINCT ON (ppf.clean_product_id, ppf.outlet_code)
    ppf.clean_product_id,
    ppf.outlet_code,
    ppf.price,
    ppf.final_price,
    ppf.scraped_at_utc,
    cp.store,
    cp.canonical_name
  FROM public.product_price_facts ppf
  JOIN public.clean_products cp
    ON cp.clean_product_id = ppf.clean_product_id
  ORDER BY ppf.clean_product_id, ppf.outlet_code, ppf.scraped_at_utc DESC
)
SELECT *
FROM latest_prices
WHERE clean_product_id = ANY(%(ids)s);
"""

SQL_ACTIVE_OUTLETS_BY_STORE = """
SELECT outlet_id, store, outlet_code, name, address, lat, lng
FROM public.store_outlets
WHERE lower(store) = lower(%(store)s)
  AND is_active = true;
"""

SQL_PRODUCTS_META_BY_IDS = """
SELECT clean_product_id,
       lower(store) AS store,
       canonical_group_id,
       canonical_name
FROM public.clean_products
WHERE clean_product_id = ANY(%(ids)s);
"""


SQL_LATEST_PRICES_BY_GROUP_IDS = """
WITH latest_prices AS (
  SELECT DISTINCT ON (ppf.clean_product_id, ppf.outlet_code)
    ppf.clean_product_id,
    ppf.outlet_code,
    ppf.price,
    ppf.final_price,
    ppf.scraped_at_utc,
    cp.store,
    cp.canonical_name,
    cp.canonical_group_id
  FROM public.product_price_facts ppf
  JOIN public.clean_products cp
    ON cp.clean_product_id = ppf.clean_product_id
  WHERE cp.canonical_group_id = ANY(%(group_ids)s)
  ORDER BY ppf.clean_product_id, ppf.outlet_code, ppf.scraped_at_utc DESC
)
SELECT *
FROM latest_prices;
"""

def _connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL_PG is missing in .env")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def _safe_float(v: Any, default: Optional[float] = 0.0) -> Optional[float]:
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


def _safe_int(v: Any) -> Optional[int]:
    try:
        if v is None:
            return None
        return int(v)
    except Exception:
        return None


def _normalize_items(items: Any) -> Tuple[List[int], Dict[int, float]]:
    ids: List[int] = []
    qty_by_id: Dict[int, float] = {}

    if not isinstance(items, list):
        return ids, qty_by_id

    for it in items:
        if not isinstance(it, dict):
            continue
        cid = _safe_int(it.get("clean_product_id"))
        if cid is None:
            continue
        qty = _safe_float(it.get("qty", 1), default=1.0) or 1.0
        if qty <= 0:
            qty = 1.0

        ids.append(cid)
        qty_by_id[cid] = qty

    return ids, qty_by_id


def _normalize_items_any(items: Any) -> Dict[str, Any]:
    """Supports 2 input shapes:

    1) Legacy:
        {clean_product_id, qty}

    2) Concept:
        {candidate_clean_product_ids: [..], qty, name?}

    Returns dict with:
      - kind: "legacy" | "concept"
      - ids, qty_by_id (legacy)
      - concepts: List[{candidate_ids: List[int], qty: float, name: str}]
      - all_candidate_ids: List[int]
    """
    if not isinstance(items, list):
        return {"kind": "legacy", "ids": [], "qty_by_id": {}}

    concepts = []
    legacy_items = []

    for it in items:
        if not isinstance(it, dict):
            continue

        # Concept input
        cands = it.get("candidate_clean_product_ids")
        if isinstance(cands, list) and len(cands) > 0:
            cand_ids = []
            for x in cands:
                xi = _safe_int(x)
                if xi is not None and xi > 0:
                    cand_ids.append(xi)
            cand_ids = list(dict.fromkeys(cand_ids))
            if not cand_ids:
                continue

            qty = _safe_float(it.get("qty", 1), default=1.0) or 1.0
            if qty <= 0:
                qty = 1.0

            concepts.append(
                {
                    "candidate_ids": cand_ids,
                    "qty": float(qty),
                    "name": (it.get("name") or "") if isinstance(it.get("name"), str) else "",
                }
            )
            continue

        # Legacy input
        if it.get("clean_product_id") is not None:
            legacy_items.append(it)

    if concepts:
        all_candidate_ids = []
        for c in concepts:
            all_candidate_ids.extend(c["candidate_ids"])
        all_candidate_ids = list(dict.fromkeys(all_candidate_ids))
        return {
            "kind": "concept",
            "concepts": concepts,
            "all_candidate_ids": all_candidate_ids,
        }

    ids, qty_by_id = _normalize_items(legacy_items)
    return {"kind": "legacy", "ids": ids, "qty_by_id": qty_by_id}


def _pick_nearest_outlet(
    user_lat: float,
    user_lng: float,
    outlets: List[Dict[str, Any]],
    mode: str,
    requested_provider: Optional[str],
) -> Tuple[
    Optional[Dict[str, Any]],
    Optional[float],  # distance_km
    Optional[float],  # duration_min (chosen)
    Optional[str],    # provider_used
    Optional[float],  # duration_min_no_traffic
    Optional[float],  # duration_min_in_traffic
]:
    """
    Returns:
  (nearest_outlet, distance_km, duration_min, provider_used, duration_min_no_traffic, duration_min_in_traffic)
    """
    if not outlets:
        return None, None, None, None, None, None

    best_outlet: Optional[Dict[str, Any]] = None
    best_dist: Optional[float] = None
    best_dur: Optional[float] = None
    best_provider: Optional[str] = None
    best_dur_no_traffic: Optional[float] = None
    best_dur_in_traffic: Optional[float] = None

    for o in outlets:
        dist_res = get_distance_result(
            origin_lat=user_lat,
            origin_lng=user_lng,
            dest_lat=o["lat"],
            dest_lng=o["lng"],
            mode=mode,
            requested_provider=requested_provider,
        )

        d_km = _safe_float(dist_res.distance_km, default=None)
        if d_km is None:
            continue

        # ✅ simpler + correct comparison
        if best_dist is None or d_km < best_dist:
            best_outlet = o
            best_dist = d_km
            best_dur = dist_res.duration_min
            best_provider = dist_res.provider_used
            best_dur_no_traffic = getattr(dist_res, "duration_min_no_traffic", None)
            best_dur_in_traffic = getattr(dist_res, "duration_min_in_traffic", None)

    return best_outlet, best_dist, best_dur, best_provider, best_dur_no_traffic, best_dur_in_traffic


def _compute_travel_cost(
    *,
    cost_model: str,
    distance_km: Optional[float],
    duration_min: Optional[float],
    cost_per_km: Optional[float],
    cost_per_min: Optional[float],
) -> Tuple[Optional[float], str]:
    """
    Returns (travel_cost, cost_model_used)

    Rules:
    - If cost_model == "time" and duration_min available -> use minutes
    - If cost_model == "time" but duration missing -> fallback to distance
    - If distance missing -> returns None
    """
    cost_model = (cost_model or "distance").lower().strip()
    if cost_model not in ("distance", "time"):
        cost_model = "distance"

    # Defaults if not provided
    if cost_per_km is None:
        cost_per_km = _safe_float(os.getenv("TRAVEL_COST_PER_KM", 80), default=80.0) or 80.0
    if cost_per_min is None:
        cost_per_min = _safe_float(os.getenv("TRAVEL_COST_PER_MIN", 12), default=12.0) or 12.0

    if cost_model == "time":
        if duration_min is not None:
            return float(duration_min) * float(cost_per_min), "time"
        # fallback
        cost_model = "distance"

    if distance_km is None:
        return None, cost_model

    return float(distance_km) * float(cost_per_km), "distance"


def _get_google_route_polyline(
    *,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str,
) -> Optional[str]:
    """
    Calls Google Directions API and returns overview_polyline.points
    Returns None if not available or API fails.
    """
    if not GOOGLE_MAPS_API_KEY:
        return None

    # ✅ normalize mode for Directions API
    mode = (mode or "driving").lower().strip()
    if mode == "bicycle":
        mode = "bicycling"
    if mode not in {"driving", "walking", "bicycling", "transit"}:
        mode = "driving"    

    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "mode": mode,
        "key": GOOGLE_MAPS_API_KEY,
    }

    try:
        r = requests.get(GOOGLE_DIRECTIONS_URL, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        if data.get("status") != "OK":
            # e.g. ZERO_RESULTS, REQUEST_DENIED
            print(f"⚠️ Google directions failed (mode={mode}): {data.get('status')} {data.get('error_message')}")
            return None

        routes = data.get("routes") or []
        if not routes:
            return None

        poly = routes[0].get("overview_polyline", {}).get("points")
        if not poly:
            return None

        return poly
    except Exception as e:
        print(f"⚠️ Google directions exception: {e}")
        return None


def _tour_distance_time_cost(
    *,
    user_lat: float,
    user_lng: float,
    outlet_a: Dict[str, Any],
    outlet_b: Dict[str, Any],
    mode: str,
    requested_provider: Optional[str],
    cost_model: str,
    cost_per_km: Optional[float],
    cost_per_min: Optional[float],
) -> Dict[str, Any]:
    """
    Computes tour: home -> A -> B -> home.
    Tries both orders (A then B) vs (B then A) and returns the cheaper one.
    """

    def leg(o_lat, o_lng, d_lat, d_lng):
        return get_distance_result(
            origin_lat=o_lat,
            origin_lng=o_lng,
            dest_lat=d_lat,
            dest_lng=d_lng,
            mode=mode,
            requested_provider=requested_provider,
        )

    def compute_for_order(first_outlet, second_outlet):
        r1 = leg(user_lat, user_lng, float(first_outlet["lat"]), float(first_outlet["lng"]))
        r2 = leg(float(first_outlet["lat"]), float(first_outlet["lng"]),
                 float(second_outlet["lat"]), float(second_outlet["lng"]))
        r3 = leg(float(second_outlet["lat"]), float(second_outlet["lng"]), user_lat, user_lng)

        total_km = float(r1.distance_km) + float(r2.distance_km) + float(r3.distance_km)

        dur_min = None
        if r1.duration_min is not None and r2.duration_min is not None and r3.duration_min is not None:
            dur_min = float(r1.duration_min) + float(r2.duration_min) + float(r3.duration_min)

        no_traffic = None
        in_traffic = None
        if r1.duration_min_no_traffic is not None and r2.duration_min_no_traffic is not None and r3.duration_min_no_traffic is not None:
            no_traffic = float(r1.duration_min_no_traffic) + float(r2.duration_min_no_traffic) + float(r3.duration_min_no_traffic)
        if r1.duration_min_in_traffic is not None and r2.duration_min_in_traffic is not None and r3.duration_min_in_traffic is not None:
            in_traffic = float(r1.duration_min_in_traffic) + float(r2.duration_min_in_traffic) + float(r3.duration_min_in_traffic)

        travel_cost, cost_model_used = _compute_travel_cost(
            cost_model=cost_model,
            distance_km=total_km,
            duration_min=dur_min,
            cost_per_km=cost_per_km,
            cost_per_min=cost_per_min,
        )

        return {
            "order": ["home", first_outlet["store"], second_outlet["store"], "home"],
            "distance_km": total_km,
            "duration_min": dur_min,
            "duration_min_no_traffic": no_traffic,
            "duration_min_in_traffic": in_traffic,
            "travel_cost": travel_cost,
            "cost_model_used": cost_model_used,
            "provider_used": r1.provider_used,
        }

    # ensure outlet has store field
    outlet_a = dict(outlet_a); outlet_b = dict(outlet_b)
    outlet_a["store"] = (outlet_a.get("store") or "").lower()
    outlet_b["store"] = (outlet_b.get("store") or "").lower()

    opt1 = compute_for_order(outlet_a, outlet_b)
    opt2 = compute_for_order(outlet_b, outlet_a)

    c1 = opt1["travel_cost"] if opt1["travel_cost"] is not None else float("inf")
    c2 = opt2["travel_cost"] if opt2["travel_cost"] is not None else float("inf")
    return opt1 if c1 <= c2 else opt2


def _get_google_tour_polyline(
    *,
    origin_lat: float,
    origin_lng: float,
    waypoints: List[Tuple[float, float]],
    mode: str,
) -> Optional[str]:
    """
    Google Directions polyline for a tour:
    origin = home, destination = home, waypoints = store A + store B
    """
    if not GOOGLE_MAPS_API_KEY:
        return None

    mode = (mode or "driving").lower().strip()
    if mode == "bicycle":
        mode = "bicycling"
    if mode not in {"driving", "walking", "bicycling", "transit"}:
        mode = "driving"

    wp = "|".join([f"{lat},{lng}" for lat, lng in waypoints])

    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{origin_lat},{origin_lng}",
        "waypoints": wp,
        "mode": mode,
        "key": GOOGLE_MAPS_API_KEY,
    }

    try:
        r = requests.get(GOOGLE_DIRECTIONS_URL, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data.get("status") != "OK":
            print(f"⚠️ Google tour directions failed: {data.get('status')} {data.get('error_message')}")
            return None

        routes = data.get("routes") or []
        if not routes:
            return None
        return routes[0].get("overview_polyline", {}).get("points")
    except Exception as e:
        print(f"⚠️ Google tour directions exception: {e}")
        return None


@bp.route("/recommend/store", methods=["POST"])
def recommend_store():
    """
    Computes per-store basket total + nearest outlet travel cost and recommends lowest total.

    Supports:
    - travel.cost_model: "distance" | "time"
    - travel.cost_per_km, travel.cost_per_min (overrides)
    - travel.include_route (if True, returns route_polyline for recommended store)
    - travel.mode: driving|walking|bicycling|transit (google uses it; haversine ignores)
    - travel.provider: google|haversine (google may fallback)
    """
    data = request.get_json(silent=True) or {}

    user_location = data.get("user_location") or {}
    user_lat = user_location.get("lat")
    user_lng = user_location.get("lng")

    if user_lat is None or user_lng is None:
        return jsonify({"error": "user_location.lat and user_location.lng are required"}), 400

    user_lat_f = _safe_float(user_lat, default=None)
    user_lng_f = _safe_float(user_lng, default=None)
    if user_lat_f is None or user_lng_f is None:
        return jsonify({"error": "user_location.lat and user_location.lng must be numeric"}), 400

    items = data.get("items", []) or []
    parsed = _normalize_items_any(items)

    # Legacy: list of clean_product_id
    ids: List[int] = []
    qty_by_id: Dict[int, float] = {}

    # Concept: list of candidate ids per item
    concepts: List[Dict[str, Any]] = []
    candidate_meta: Dict[int, Dict[str, Any]] = {}

    if parsed.get("kind") == "concept":
        concepts = parsed.get("concepts", []) or []
        all_candidate_ids = parsed.get("all_candidate_ids", []) or []
        if not concepts or not all_candidate_ids:
            return jsonify({"error": "items must contain at least one candidate_clean_product_ids"}), 400

        # Load meta for candidates (store + canonical_name)
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(SQL_PRODUCTS_META_BY_IDS, {"ids": all_candidate_ids})
                rows = cur.fetchall()
        for r in rows:
            candidate_meta[int(r["clean_product_id"])] = dict(r)

        # If none of the candidates exist in DB -> error
        if not candidate_meta:
            return jsonify({"error": "No valid candidate_clean_product_ids found in clean_products"}), 400

        # We'll fetch prices for all candidates once and select per-store later.
        ids = list(candidate_meta.keys())
    else:
        ids = parsed.get("ids", []) or []
        qty_by_id = parsed.get("qty_by_id", {}) or {}
        if not ids:
            return jsonify({"error": "items must contain at least one clean_product_id"}), 400

    travel = data.get("travel") or {}
    mode = (travel.get("mode") or os.getenv("GOOGLE_MAPS_DEFAULT_MODE") or "driving").lower().strip()
    requested_provider = travel.get("provider")  # "google" | "haversine" | None
    requested_cost_model = (travel.get("cost_model") or "distance").lower().strip()
    include_route = bool(travel.get("include_route", False))

    # Overrides (optional)
    cost_per_km = _safe_float(travel.get("cost_per_km"), default=None)
    cost_per_min = _safe_float(travel.get("cost_per_min"), default=None)

    # 1) Fetch latest prices
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(SQL_LATEST_PRICES_BY_IDS, {"ids": ids})
            price_rows = cur.fetchall()

    # 2) store -> product_id -> cheapest price (final_price preferred)
    store_price: Dict[str, Dict[int, float]] = {}
    product_names: Dict[int, str] = {}

    for r in price_rows:
        store = (r.get("store") or "").lower().strip()
        pid = int(r["clean_product_id"])
        if r.get("canonical_name"):
            product_names[pid] = r["canonical_name"]

        raw_val = r["final_price"] if r["final_price"] is not None else r["price"]
        val = _safe_float(raw_val, default=None)
        if val is None:
            continue

        store_price.setdefault(store, {})
        if pid not in store_price[store] or val < store_price[store][pid]:
            store_price[store][pid] = val

    candidate_stores = sorted(set(store_price.keys()))
    # Always consider these stores (even if missing items),
    # so frontend can show breakdown + missing items.
    #candidate_stores = ["keells", "cargills", "spar"]
    
    if not candidate_stores:
        return jsonify({"error": "No prices found for given items"}), 404

    results: List[Dict[str, Any]] = []
    best_payload: Optional[Dict[str, Any]] = None

    # 3) For each store: basket total + nearest outlet + travel cost + total
    with _connect() as conn:
        with conn.cursor() as cur:
            for store in candidate_stores:
                missing: List[Dict[str, Any]] = []
                items_total = 0.0

                if concepts:
                    # Concept mode: each concept has candidates; choose candidate belonging to this store.
                    for c in concepts:
                        chosen_pid: Optional[int] = None
                        for cand_id in c.get("candidate_ids", []):
                            meta = candidate_meta.get(int(cand_id))
                            if not meta:
                                continue
                            if (meta.get("store") or "").lower().strip() == store:
                                chosen_pid = int(cand_id)
                                break

                        if chosen_pid is None:
                            missing.append({
                                "name": c.get("name") or None,
                                "candidate_clean_product_ids": c.get("candidate_ids", []),
                            })
                            continue

                        price = store_price.get(store, {}).get(chosen_pid)
                        if price is None:
                            missing.append({
                                "clean_product_id": chosen_pid,
                                "name": product_names.get(chosen_pid) or c.get("name") or None,
                            })
                            continue

                        items_total += float(price) * float(c.get("qty", 1.0))
                else:
                    # Legacy mode
                    for pid in ids:
                        price = store_price.get(store, {}).get(pid)
                        if price is None:
                            missing.append({"clean_product_id": pid, "name": product_names.get(pid)})
                            continue
                        qty = qty_by_id.get(pid, 1.0)
                        items_total += float(price) * float(qty)

                cur.execute(SQL_ACTIVE_OUTLETS_BY_STORE, {"store": store})
                outlets = cur.fetchall()

                nearest_outlet, distance_km, duration_min, provider_used, duration_no_traffic, duration_in_traffic = _pick_nearest_outlet(
                    user_lat=user_lat_f,
                    user_lng=user_lng_f,
                    outlets=outlets,
                    mode=mode,
                    requested_provider=requested_provider,
                )

                # ✅ Convert outlet coords to numeric values for frontend safety
                if nearest_outlet is not None:
                    nearest_outlet = dict(nearest_outlet)
                    if nearest_outlet.get("lat") is not None:
                        nearest_outlet["lat"] = float(nearest_outlet["lat"])
                    if nearest_outlet.get("lng") is not None:
                        nearest_outlet["lng"] = float(nearest_outlet["lng"])

                # travel cost
                travel_cost, cost_model_used = _compute_travel_cost(
                    cost_model=requested_cost_model,
                    distance_km=distance_km,
                    duration_min=duration_min,
                    cost_per_km=cost_per_km,
                    cost_per_min=cost_per_min,
                )

                total_cost = None
                if not missing:
                    total_cost = items_total + (travel_cost or 0.0)

                route_polyline = None
                if include_route and provider_used == "google" and nearest_outlet is not None:
                    route_polyline = _get_google_route_polyline(
                        origin_lat=user_lat_f,
                        origin_lng=user_lng_f,
                        dest_lat=float(nearest_outlet["lat"]),
                        dest_lng=float(nearest_outlet["lng"]),
                        mode=mode,
                    )    

                payload: Dict[str, Any] = {
                    "store": store,
                    "items_total": round(items_total, 2),
                    "missing_items": missing,
                    "nearest_outlet": nearest_outlet,
                    "distance_km": round(distance_km, 3) if distance_km is not None else None,
                    "duration_min": round(duration_min, 2) if duration_min is not None else None,
                    "duration_min_no_traffic": round(duration_no_traffic, 2) if duration_no_traffic is not None else None,
                    "duration_min_in_traffic": round(duration_in_traffic, 2) if duration_in_traffic is not None else None,
                    "route_polyline": route_polyline,
                    "provider_used": provider_used,
                    "cost_model_used": cost_model_used,
                    "travel_cost": round(travel_cost, 2) if travel_cost is not None else None,
                    "total_cost": round(total_cost, 2) if total_cost is not None else None,
                }

                results.append(payload)

                if total_cost is not None:
                    if best_payload is None or float(total_cost) < float(best_payload["total_cost"]):
                        best_payload = payload

    # 4) Optional: attach route_polyline to recommended only
    if best_payload and include_route:
        try:
            ro = best_payload.get("nearest_outlet") or {}
            dest_lat = _safe_float(ro.get("lat"), default=None)
            dest_lng = _safe_float(ro.get("lng"), default=None)

            # Only attempt directions if we have coordinates and Google key.
            if dest_lat is not None and dest_lng is not None:
                poly = _get_google_route_polyline(
                    origin_lat=user_lat_f,
                    origin_lng=user_lng_f,
                    dest_lat=dest_lat,
                    dest_lng=dest_lng,
                    mode=mode,
                )
                best_payload["route_polyline"] = poly
            else:
                best_payload["route_polyline"] = None
        except Exception as e:
            print(f"⚠️ route_polyline error: {e}")
            best_payload["route_polyline"] = None

    return jsonify({"recommended": best_payload, "stores": results})


@bp.route("/recommend/multistore", methods=["POST"])
def recommend_multistore():
    data = request.get_json(silent=True) or {}

    # ---- 0) Validate location ----
    user_location = data.get("user_location") or {}
    user_lat_f = _safe_float(user_location.get("lat"), default=None)
    user_lng_f = _safe_float(user_location.get("lng"), default=None)
    if user_lat_f is None or user_lng_f is None:
        return jsonify({"error": "user_location.lat and user_location.lng are required"}), 400

        # ---- 1) Parse items (canonical groups OR clean_product_id) ----
    items = data.get("items", []) or []

    # we'll end up with canonical_group_ids always
    group_ids: List[int] = []
    qty_by_gid: Dict[int, float] = {}

    # support input as either:
    #  - {"canonical_group_id": X, "qty": Y}
    #  - {"clean_product_id": X, "qty": Y}
    #  - {"candidate_clean_product_ids": [..], "qty": Y, "name"?: str}  (concept)
    clean_ids: List[int] = []
    qty_by_clean: Dict[int, float] = {}

    concept_candidates: List[Tuple[List[int], float]] = []

    for it in items:
        qty = _safe_float(it.get("qty"), default=1.0)
        if qty is None or qty <= 0:
            qty = 1.0

        gid = it.get("canonical_group_id")
        if gid is not None:
            try:
                gid_i = int(gid)
                group_ids.append(gid_i)
                qty_by_gid[gid_i] = qty_by_gid.get(gid_i, 0.0) + float(qty)
                continue
            except Exception:
                pass

        # Concept input: candidates
        cands = it.get("candidate_clean_product_ids")
        if isinstance(cands, list) and len(cands) > 0:
            cand_ids: List[int] = []
            for x in cands:
                xi = _safe_int(x)
                if xi is not None and xi > 0:
                    cand_ids.append(xi)
            cand_ids = list(dict.fromkeys(cand_ids))
            if cand_ids:
                concept_candidates.append((cand_ids, float(qty)))
            continue

        pid = it.get("clean_product_id")
        if pid is not None:
            try:
                pid_i = int(pid)
                clean_ids.append(pid_i)
                qty_by_clean[pid_i] = qty_by_clean.get(pid_i, 0.0) + float(qty)
            except Exception:
                pass

    # If user sent clean_product_id OR candidate_clean_product_ids, map to canonical_group_id
    map_ids = list(dict.fromkeys(clean_ids + [x for c, _ in concept_candidates for x in c]))
    if map_ids:
        with _connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT clean_product_id, canonical_group_id
                    FROM public.clean_products
                    WHERE clean_product_id = ANY(%(ids)s)
                    """,
                    {"ids": map_ids},
                )
                rows = cur.fetchall()

        pid_to_gid: Dict[int, int] = {}
        for r in rows:
            pid = int(r["clean_product_id"])
            gid = r.get("canonical_group_id")
            if gid is None:
                continue
            pid_to_gid[pid] = int(gid)

        # Legacy clean ids -> gids
        for pid, qty in qty_by_clean.items():
            gid = pid_to_gid.get(int(pid))
            if gid is None:
                continue
            group_ids.append(gid)
            qty_by_gid[gid] = qty_by_gid.get(gid, 0.0) + float(qty)

        # Concept candidates -> choose gid (first non-null / most common)
        for cand_ids, qty in concept_candidates:
            gids = [pid_to_gid.get(int(pid)) for pid in cand_ids]
            gids = [g for g in gids if g is not None]
            if not gids:
                continue
            # choose most common
            chosen = max(set(gids), key=gids.count)
            group_ids.append(int(chosen))
            qty_by_gid[int(chosen)] = qty_by_gid.get(int(chosen), 0.0) + float(qty)

    # de-dupe group_ids preserve order
    seen = set()
    group_ids = [g for g in group_ids if not (g in seen or seen.add(g))]

    if not group_ids:
        return jsonify({"error": "items must contain at least one canonical_group_id or clean_product_id (mapped to canonical_group_id)"}), 400

    # de-dupe while preserving order
    seen = set()
    group_ids = [g for g in group_ids if not (g in seen or seen.add(g))]

    if not group_ids:
        return jsonify({"error": "items must contain at least one canonical_group_id"}), 400

    strict = bool(data.get("strict", True))

    # ---- 2) Travel config ----
    travel = data.get("travel") or {}
    mode = (travel.get("mode") or os.getenv("GOOGLE_MAPS_DEFAULT_MODE") or "driving").lower().strip()
    requested_provider = travel.get("provider")
    requested_cost_model = (travel.get("cost_model") or "distance").lower().strip()
    include_route = bool(travel.get("include_route", False))  # Step 4 later

    cost_per_km = _safe_float(travel.get("cost_per_km"), default=None)
    cost_per_min = _safe_float(travel.get("cost_per_min"), default=None)

    # ---- 3) Fetch latest prices for these canonical groups ----
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(SQL_LATEST_PRICES_BY_GROUP_IDS, {"group_ids": group_ids})
            price_rows = cur.fetchall()

    # Build: store -> group_id -> cheapest price (across outlets/products)
    store_group_price: Dict[str, Dict[int, float]] = {}
    group_names: Dict[int, str] = {}

    for r in price_rows:
        store = (r.get("store") or "").lower().strip()
        gid = r.get("canonical_group_id")
        if gid is None:
            continue
        gid = int(gid)

        if r.get("canonical_name") and gid not in group_names:
            group_names[gid] = r["canonical_name"]

        raw_val = r["final_price"] if r["final_price"] is not None else r["price"]
        val = _safe_float(raw_val, default=None)
        if val is None:
            continue

        store_group_price.setdefault(store, {})
        if gid not in store_group_price[store] or float(val) < store_group_price[store][gid]:
            store_group_price[store][gid] = float(val)

    candidate_stores = sorted(store_group_price.keys())
    if len(candidate_stores) < 2:
        return jsonify({"error": "Need at least 2 stores with prices for these canonical_group_id items"}), 404

    # ---- 4) Pick nearest outlet per store ----
    nearest_by_store: Dict[str, Dict[str, Any]] = {}
    with _connect() as conn:
        with conn.cursor() as cur:
            for store in candidate_stores:
                cur.execute(SQL_ACTIVE_OUTLETS_BY_STORE, {"store": store})
                outlets = cur.fetchall()

                nearest_outlet, *_ = _pick_nearest_outlet(
                    user_lat=user_lat_f,
                    user_lng=user_lng_f,
                    outlets=outlets,
                    mode=mode,
                    requested_provider=requested_provider,
                )
                if nearest_outlet is None:
                    continue

                o = dict(nearest_outlet)
                o["store"] = store
                o["lat"] = float(o["lat"])
                o["lng"] = float(o["lng"])
                nearest_by_store[store] = o

    stores = sorted(nearest_by_store.keys())
    if len(stores) < 2:
        return jsonify({"error": "Need at least 2 stores with active outlets"}), 404

    # ---- 4.5) Compute best single-store baseline (same logic as /recommend/store) ----
    single_store_results: List[Dict[str, Any]] = []
    best_single_store: Optional[Dict[str, Any]] = None

    with _connect() as conn:
        with conn.cursor() as cur:
            for store in stores:
                missing: List[Dict[str, Any]] = []
                items_total = 0.0

                for gid in group_ids:
                    price = store_group_price.get(store, {}).get(gid)
                    if price is None:
                        missing.append({"canonical_group_id": gid, "name": group_names.get(gid)})
                        continue
                    qty = qty_by_gid.get(gid, 1.0)
                    items_total += float(price) * float(qty)

                cur.execute(SQL_ACTIVE_OUTLETS_BY_STORE, {"store": store})
                outlets = cur.fetchall()

                nearest_outlet, distance_km, duration_min, provider_used, duration_no_traffic, duration_in_traffic = _pick_nearest_outlet(
                    user_lat=user_lat_f,
                    user_lng=user_lng_f,
                    outlets=outlets,
                    mode=mode,
                    requested_provider=requested_provider,
                )

                if nearest_outlet is not None:
                    nearest_outlet = dict(nearest_outlet)
                    if nearest_outlet.get("lat") is not None:
                        nearest_outlet["lat"] = float(nearest_outlet["lat"])
                    if nearest_outlet.get("lng") is not None:
                        nearest_outlet["lng"] = float(nearest_outlet["lng"])

                travel_cost, cost_model_used = _compute_travel_cost(
                    cost_model=requested_cost_model,
                    distance_km=distance_km,
                    duration_min=duration_min,
                    cost_per_km=cost_per_km,
                    cost_per_min=cost_per_min,
                )

                total_cost = None
                if not missing:
                    total_cost = items_total + (travel_cost or 0.0)

                payload = {
                    "store": store,
                    "items_total": round(items_total, 2),
                    "missing_items": missing,
                    "nearest_outlet": nearest_outlet,
                    "distance_km": round(distance_km, 3) if distance_km is not None else None,
                    "duration_min": round(duration_min, 2) if duration_min is not None else None,
                    "duration_min_no_traffic": round(duration_no_traffic, 2) if duration_no_traffic is not None else None,
                    "duration_min_in_traffic": round(duration_in_traffic, 2) if duration_in_traffic is not None else None,
                    "provider_used": provider_used,
                    "cost_model_used": cost_model_used,
                    "travel_cost": round(travel_cost, 2) if travel_cost is not None else None,
                    "total_cost": round(total_cost, 2) if total_cost is not None else None,
                }

                single_store_results.append(payload)

                if total_cost is not None:
                    if best_single_store is None or float(total_cost) < float(best_single_store["total_cost"]):
                        best_single_store = payload

    # ---- 5) Evaluate all store pairs ----
    best = None

    for i in range(len(stores)):
        for j in range(i + 1, len(stores)):
            a = stores[i]
            b = stores[j]

            missing = []
            covered_count = 0

            for gid in group_ids:
                in_a = gid in store_group_price.get(a, {})
                in_b = gid in store_group_price.get(b, {})
                if in_a or in_b:
                    covered_count += 1
                else:
                    missing.append({"canonical_group_id": gid, "name": group_names.get(gid)})

            if strict and missing:
                continue

            # Assign each group to cheaper store (or the only available store)
            plan_a, plan_b = [], []
            basket_a, basket_b = 0.0, 0.0

            for gid in group_ids:
                qty = float(qty_by_gid.get(gid, 1.0))
                pa = store_group_price.get(a, {}).get(gid)
                pb = store_group_price.get(b, {}).get(gid)

                if pa is None and pb is None:
                    continue

                if pb is None:
                    plan_a.append({"canonical_group_id": gid, "qty": qty, "unit_price": float(pa), "name": group_names.get(gid)})
                    basket_a += float(pa) * qty
                    continue

                if pa is None:
                    plan_b.append({"canonical_group_id": gid, "qty": qty, "unit_price": float(pb), "name": group_names.get(gid)})
                    basket_b += float(pb) * qty
                    continue

                if float(pa) <= float(pb):
                    plan_a.append({"canonical_group_id": gid, "qty": qty, "unit_price": float(pa), "name": group_names.get(gid)})
                    basket_a += float(pa) * qty
                else:
                    plan_b.append({"canonical_group_id": gid, "qty": qty, "unit_price": float(pb), "name": group_names.get(gid)})
                    basket_b += float(pb) * qty

            # If all items end up in a single store, visiting both stores is pointless and
            # can produce confusing UI (e.g. one store subtotal = 0 with a 2-store tour).
            # In that case, compute a simple round-trip: home -> store -> home.
            use_two_stores = bool(plan_a) and bool(plan_b)

            if use_two_stores:
                # Travel tour (A->B or B->A whichever cheaper)
                tour = _tour_distance_time_cost(
                    user_lat=user_lat_f,
                    user_lng=user_lng_f,
                    outlet_a=nearest_by_store[a],
                    outlet_b=nearest_by_store[b],
                    mode=mode,
                    requested_provider=requested_provider,
                    cost_model=requested_cost_model,
                    cost_per_km=cost_per_km,
                    cost_per_min=cost_per_min,
                )

                travel_cost = float(tour.get("travel_cost") or 0.0)
                basket_total = basket_a + basket_b
                total_cost = basket_total + travel_cost

                order = tour.get("order")
                dist_km = tour.get("distance_km")
                dur_min = tour.get("duration_min")
                dur_no_traffic = tour.get("duration_min_no_traffic")
                dur_in_traffic = tour.get("duration_min_in_traffic")
                provider_used = tour.get("provider_used")
                cost_model_used = tour.get("cost_model_used")
                chain_model = "tour"

            else:
                # Identify the actual store that has items
                single_store = a if plan_a else b
                outlet = nearest_by_store[single_store]

                # Round-trip distance/time
                r1 = get_distance_result(
                    origin_lat=user_lat_f,
                    origin_lng=user_lng_f,
                    dest_lat=outlet["lat"],
                    dest_lng=outlet["lng"],
                    mode=mode,
                    requested_provider=requested_provider,
                )
                r2 = get_distance_result(
                    origin_lat=outlet["lat"],
                    origin_lng=outlet["lng"],
                    dest_lat=user_lat_f,
                    dest_lng=user_lng_f,
                    mode=mode,
                    requested_provider=requested_provider,
                )

                dist_km = float(r1.distance_km) + float(r2.distance_km)
                dur_min = None
                if r1.duration_min is not None and r2.duration_min is not None:
                    dur_min = float(r1.duration_min) + float(r2.duration_min)
                dur_no_traffic = None
                if r1.duration_min_no_traffic is not None and r2.duration_min_no_traffic is not None:
                    dur_no_traffic = float(r1.duration_min_no_traffic) + float(r2.duration_min_no_traffic)
                dur_in_traffic = None
                if r1.duration_min_in_traffic is not None and r2.duration_min_in_traffic is not None:
                    dur_in_traffic = float(r1.duration_min_in_traffic) + float(r2.duration_min_in_traffic)

                travel_cost_calc, cost_model_used = _compute_travel_cost(
                    cost_model=requested_cost_model,
                    distance_km=dist_km,
                    duration_min=dur_min,
                    cost_per_km=cost_per_km,
                    cost_per_min=cost_per_min,
                )
                travel_cost = float(travel_cost_calc or 0.0)

                basket_total = basket_a + basket_b
                total_cost = basket_total + travel_cost

                order = ["home", single_store, "home"]
                provider_used = r1.provider_used
                chain_model = "roundtrip"

            candidate = {
                "selected_stores": [a, b] if use_two_stores else [a if plan_a else b],
                "coverage": {"total_items": len(group_ids), "covered_items": covered_count, "missing_items": missing},
                "plan": [
                    *([
                        {"store": a, "nearest_outlet": nearest_by_store[a], "items": plan_a, "items_total": round(basket_a, 2)},
                        {"store": b, "nearest_outlet": nearest_by_store[b], "items": plan_b, "items_total": round(basket_b, 2)},
                    ] if use_two_stores else [
                        {"store": (a if plan_a else b), "nearest_outlet": nearest_by_store[(a if plan_a else b)], "items": (plan_a if plan_a else plan_b), "items_total": round((basket_a if plan_a else basket_b), 2)},
                    ]),
                ],
                "costs": {
                    "basket_total": round(basket_total, 2),
                    "basket_by_store": {a: round(basket_a, 2), b: round(basket_b, 2)},
                    "travel": {
                        "chain_model": chain_model,
                        "order": order,
                        "distance_km": round(dist_km, 3) if dist_km is not None else None,
                        "duration_min": round(dur_min, 2) if dur_min is not None else None,
                        "duration_min_no_traffic": round(dur_no_traffic, 2) if dur_no_traffic is not None else None,
                        "duration_min_in_traffic": round(dur_in_traffic, 2) if dur_in_traffic is not None else None,
                        "travel_cost": round(travel_cost, 2),
                        "provider_used": provider_used,
                        "cost_model_used": cost_model_used,
                    },
                    "total_cost": round(total_cost, 2),
                },
                "route": {"chain_model": chain_model, "order": order, "polyline": None},
            }

            # Optional: provide polyline for the recommended route (kept off by default)
            if include_route:
                try:
                    if use_two_stores:
                        waypoints = [
                            (float(nearest_by_store[a]["lat"]), float(nearest_by_store[a]["lng"])),
                            (float(nearest_by_store[b]["lat"]), float(nearest_by_store[b]["lng"])),
                        ]
                        candidate["route"]["polyline"] = _get_google_tour_polyline(
                            origin_lat=user_lat_f,
                            origin_lng=user_lng_f,
                            waypoints=waypoints,
                            mode=mode,
                        )
                    else:
                        s = a if plan_a else b
                        outlet = nearest_by_store[s]
                        candidate["route"]["polyline"] = _get_google_tour_polyline(
                            origin_lat=user_lat_f,
                            origin_lng=user_lng_f,
                            waypoints=[(float(outlet["lat"]), float(outlet["lng"]))],
                            mode=mode,
                        )
                except Exception as e:
                    print(f"⚠️ failed to compute route polyline: {e}")

            # Best logic: max coverage, then min cost
            if best is None:
                best = candidate
            else:
                if candidate["coverage"]["covered_items"] > best["coverage"]["covered_items"]:
                    best = candidate
                elif (
                    candidate["coverage"]["covered_items"] == best["coverage"]["covered_items"]
                    and candidate["costs"]["total_cost"] < best["costs"]["total_cost"]
                ):
                    best = candidate

    if best is None:
        return jsonify({"error": "No valid multistore plan found (strict mode may be too strict)"}), 404

    savings = None
    if best_single_store is not None and best_single_store.get("total_cost") is not None:
        savings = round(float(best_single_store["total_cost"]) - float(best["costs"]["total_cost"]), 2)

    response = {
        "type": "multistore",
        "recommended": best,
        "baselines": {
            "best_single_store": best_single_store,
            "all_single_store": single_store_results,
        },
        "savings_vs_best_single_store": savings,
    }

    return jsonify(response)



@bp.route("/recommend/debug/overlap", methods=["POST"])
def debug_overlap():
    data = request.get_json(silent=True) or {}
    limit = int(data.get("limit", 20))

    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                WITH latest_prices AS (
                SELECT DISTINCT ON (ppf.clean_product_id, ppf.outlet_code)
                    ppf.clean_product_id,
                    ppf.outlet_code,
                    COALESCE(ppf.final_price, ppf.price) AS chosen_price,
                    ppf.scraped_at_utc,
                    cp.store,
                    cp.canonical_name
                FROM public.product_price_facts ppf
                JOIN public.clean_products cp
                    ON cp.clean_product_id = ppf.clean_product_id
                WHERE COALESCE(ppf.final_price, ppf.price) IS NOT NULL
                ORDER BY ppf.clean_product_id, ppf.outlet_code, ppf.scraped_at_utc DESC
                ),
                store_presence AS (
                SELECT
                    clean_product_id,
                    canonical_name,
                    COUNT(DISTINCT store) AS store_count
                FROM latest_prices
                GROUP BY clean_product_id, canonical_name
                HAVING COUNT(DISTINCT store) >= 2
                ORDER BY clean_product_id
                LIMIT %(limit)s
                )
                SELECT clean_product_id, canonical_name, store_count
                FROM store_presence;
            """, {"limit": limit})
            rows = cur.fetchall()

    return jsonify({"overlap": rows})