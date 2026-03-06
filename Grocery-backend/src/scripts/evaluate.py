from __future__ import annotations

import argparse
import csv
import json
import os
import time
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

def to_float(x: Any, default: float = 0.0) -> float:
    try:
        if x is None or x == "":
            return default
        return float(x)
    except Exception:
        return default

def to_int(x: Any, default: int = 0) -> int:
    try:
        if x is None or x == "":
            return default
        return int(x)
    except Exception:
        return default

def post_json(base_url: str, path: str, payload: Dict[str, Any], timeout: int = 120) -> Dict[str, Any]:
    url = base_url.rstrip("/") + path
    r = requests.post(url, json=payload, timeout=timeout)
    if r.status_code >= 400:
        raise RuntimeError(f"{path} failed {r.status_code}: {r.text[:600]}")
    return r.json()

def avg(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0

def build_request_payload(
    basket: Dict[str, Any],
    mode: str,
    provider: str,
    cost_model: str,
    strict: bool,
    include_route: bool = False,
) -> Dict[str, Any]:
    return {
        "user_location": basket["user_location"],
        "items": basket["items"],
        "strict": strict,
        "travel": {
            "mode": mode,
            "provider": provider,
            "cost_model": cost_model,
            "include_route": include_route,
        },
    }

def parse_single_response(resp: Dict[str, Any]) -> Dict[str, Any]:
    """
    Shape from /recommend/store:
    {
      recommended: {...},
      nearest_baseline: {...},
      savings_info: {...},
      stores: [...]
    }
    """
    recommended = resp.get("recommended") or {}
    nearest = resp.get("nearest_baseline") or {}
    savings = resp.get("savings_info") or {}
    stores = resp.get("stores") or []

    missing_items = recommended.get("missing_items") or []
    coverage_found = recommended.get("coverage_found")
    coverage_total = recommended.get("coverage_total")

    if coverage_found is None and coverage_total is not None and isinstance(missing_items, list):
        coverage_found = max(0, int(coverage_total) - len(missing_items))

    return {
        "recommended_store": str(recommended.get("store") or "").lower(),
        "recommended_total": to_float(recommended.get("total_cost")),
        "recommended_items_total": to_float(recommended.get("items_total")),
        "recommended_travel_cost": to_float(recommended.get("travel_cost")),
        "recommended_missing_count": len(missing_items) if isinstance(missing_items, list) else 0,
        "coverage_found": to_int(coverage_found, 0) if coverage_found is not None else None,
        "coverage_total": to_int(coverage_total, 0) if coverage_total is not None else None,

        "nearest_store": str(nearest.get("store") or "").lower(),
        "nearest_total": to_float(nearest.get("total") or nearest.get("total_cost")),
        "nearest_items_total": to_float(nearest.get("itemsTotal") or nearest.get("items_total")),
        "nearest_travel_cost": to_float(nearest.get("travelCost") or nearest.get("travel_cost")),

        "second_store": savings.get("secondStore"),
        "second_total": to_float(savings.get("secondTotal")) if savings.get("secondTotal") is not None else None,
        "save_amount_vs_second": to_float(savings.get("saveAmount")) if savings.get("saveAmount") is not None else None,
        "save_pct_vs_second": to_float(savings.get("savePct")) if savings.get("savePct") is not None else None,

        "store_count_evaluated": len(stores) if isinstance(stores, list) else 0,
    }

def parse_multi_response(resp: Dict[str, Any]) -> Dict[str, Any]:
    """
    Shape from /recommend/multistore:
    {
      baselines: { best_single_store: {...} },
      recommended: {
        costs: { basket_total, total_cost, travel: {...} },
        plan: [...],
        route: {...}
      },
      savings_vs_best_single_store: ...
    }
    """
    baselines = resp.get("baselines") or {}
    best_single = baselines.get("best_single_store") or {}
    recommended = resp.get("recommended") or {}
    costs = recommended.get("costs") or {}
    travel = costs.get("travel") or {}
    plan = recommended.get("plan") or []

    multi_total = to_float(costs.get("total_cost"))
    best_single_total = to_float(best_single.get("total_cost") or best_single.get("total"))

    return {
        "multi_total": multi_total,
        "multi_basket_total": to_float(costs.get("basket_total")),
        "multi_travel_cost": to_float(travel.get("travel_cost")),
        "multi_distance_km": to_float(travel.get("distance_km")),
        "multi_duration_min": to_float(travel.get("duration_min")),
        "multi_num_stops": len(plan) if isinstance(plan, list) else 0,

        "best_single_store": str(best_single.get("store") or "").lower(),
        "best_single_total": best_single_total,
        "best_single_items_total": to_float(best_single.get("items_total")),
        "best_single_travel_cost": to_float(best_single.get("travel_cost")),

        "savings_vs_best_single_store": to_float(resp.get("savings_vs_best_single_store"))
        if resp.get("savings_vs_best_single_store") is not None
        else None,
    }

def main():
    ap = argparse.ArgumentParser(description="Run evaluation metrics against current grocery backend")
    ap.add_argument("--base-url", default=os.environ.get("API_BASE_URL", "http://127.0.0.1:5000"))
    ap.add_argument("--baskets", default="src/scripts/baskets_eval.json")
    ap.add_argument("--out-dir", default="evaluation_out")
    ap.add_argument("--mode", default="driving")
    ap.add_argument("--provider", default="google")
    ap.add_argument("--cost-model", default="distance")
    ap.add_argument("--strict", action="store_true", default=True)
    ap.add_argument("--sleep", type=float, default=0.0)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    with open(args.baskets, "r", encoding="utf-8") as f:
        baskets = json.load(f)

    if args.limit and args.limit > 0:
        baskets = baskets[:args.limit]

    os.makedirs(args.out_dir, exist_ok=True)
    csv_path = os.path.join(args.out_dir, "evaluation_results.csv")
    summary_path = os.path.join(args.out_dir, "evaluation_summary.json")

    rows: List[Dict[str, Any]] = []

    nearest_optimal_count = 0
    full_coverage_count = 0
    single_success_count = 0

    savings_vs_nearest_values: List[float] = []
    multi_win_count = 0
    multi_success_count = 0
    multi_num_stops_values: List[float] = []

    for idx, basket in enumerate(baskets, start=1):
        basket_id = basket.get("id", f"basket_{idx}")
        basket_size = len(basket.get("items") or [])

        single_payload = build_request_payload(
            basket=basket,
            mode=args.mode,
            provider=args.provider,
            cost_model=args.cost_model,
            strict=args.strict,
            include_route=False,
        )

        try:
            single_resp = post_json(args.base_url, "/recommend/store", single_payload)
            single = parse_single_response(single_resp)
            single_success_count += 1
        except Exception as e:
            print(f"[single-error] {basket_id}: {e}")
            continue

        nearest_optimal = (
            single["nearest_store"] != ""
            and single["recommended_store"] != ""
            and single["nearest_store"] == single["recommended_store"]
        )
        if nearest_optimal:
            nearest_optimal_count += 1

        full_coverage = single["recommended_missing_count"] == 0
        if full_coverage:
            full_coverage_count += 1

        savings_vs_nearest = None
        if single["nearest_total"] > 0 and single["recommended_total"] > 0:
            savings_vs_nearest = single["nearest_total"] - single["recommended_total"]
            savings_vs_nearest_values.append(savings_vs_nearest)

        row: Dict[str, Any] = {
            "basket_id": basket_id,
            "basket_size": basket_size,

            "single_recommended_store": single["recommended_store"],
            "single_total": round(single["recommended_total"], 2),
            "single_items_total": round(single["recommended_items_total"], 2),
            "single_travel_cost": round(single["recommended_travel_cost"], 2),
            "single_missing_count": single["recommended_missing_count"],

            "nearest_store": single["nearest_store"],
            "nearest_total": round(single["nearest_total"], 2),
            "nearest_items_total": round(single["nearest_items_total"], 2),
            "nearest_travel_cost": round(single["nearest_travel_cost"], 2),

            "nearest_optimal": int(nearest_optimal),
            "full_coverage": int(full_coverage),
            "savings_vs_nearest": round(savings_vs_nearest, 2) if savings_vs_nearest is not None else "",

            "second_store": single["second_store"] or "",
            "save_vs_second": round(single["save_amount_vs_second"], 2) if single["save_amount_vs_second"] is not None else "",
            "save_pct_vs_second": round(single["save_pct_vs_second"], 2) if single["save_pct_vs_second"] is not None else "",
            "stores_evaluated": single["store_count_evaluated"],
        }

        multi_payload = build_request_payload(
            basket=basket,
            mode=args.mode,
            provider=args.provider,
            cost_model=args.cost_model,
            strict=args.strict,
            include_route=False,
        )

        try:
            multi_resp = post_json(args.base_url, "/recommend/multistore", multi_payload)
            multi = parse_multi_response(multi_resp)
            multi_success_count += 1

            multi_wins = (
                multi["multi_total"] > 0
                and multi["best_single_total"] > 0
                and multi["multi_total"] < multi["best_single_total"]
            )
            if multi_wins:
                multi_win_count += 1

            if multi["multi_num_stops"] > 0:
                multi_num_stops_values.append(multi["multi_num_stops"])

            row.update({
                "multi_total": round(multi["multi_total"], 2),
                "multi_basket_total": round(multi["multi_basket_total"], 2),
                "multi_travel_cost": round(multi["multi_travel_cost"], 2),
                "multi_distance_km": round(multi["multi_distance_km"], 2),
                "multi_duration_min": round(multi["multi_duration_min"], 2),
                "multi_num_stops": multi["multi_num_stops"],

                "best_single_store": multi["best_single_store"],
                "best_single_total": round(multi["best_single_total"], 2),
                "best_single_items_total": round(multi["best_single_items_total"], 2),
                "best_single_travel_cost": round(multi["best_single_travel_cost"], 2),

                "savings_vs_best_single_store": round(multi["savings_vs_best_single_store"], 2)
                if multi["savings_vs_best_single_store"] is not None
                else "",

                "multi_wins": int(multi_wins),
            })
        except Exception as e:
            print(f"[multi-warn] {basket_id}: {e}")
            row.update({
                "multi_total": "",
                "multi_basket_total": "",
                "multi_travel_cost": "",
                "multi_distance_km": "",
                "multi_duration_min": "",
                "multi_num_stops": "",
                "best_single_store": "",
                "best_single_total": "",
                "best_single_items_total": "",
                "best_single_travel_cost": "",
                "savings_vs_best_single_store": "",
                "multi_wins": "",
            })

        rows.append(row)

        print(
            f"[ok] {basket_id} | single={row['single_recommended_store']} "
            f"| nearest={row['nearest_store']} "
            f"| single_total={row['single_total']} "
            f"| multi_total={row['multi_total'] if row['multi_total'] != '' else 'NA'}"
        )

        if args.sleep > 0:
            time.sleep(args.sleep)

    processed = len(rows)

    summary = {
        "count_baskets_processed": processed,
        "single_success_count": single_success_count,
        "multi_success_count": multi_success_count,

        "nearest_optimal_rate": (nearest_optimal_count / processed) if processed else 0.0,
        "full_coverage_rate": (full_coverage_count / processed) if processed else 0.0,

        "avg_savings_vs_nearest": avg(savings_vs_nearest_values),
        "max_savings_vs_nearest": max(savings_vs_nearest_values) if savings_vs_nearest_values else 0.0,
        "min_savings_vs_nearest": min(savings_vs_nearest_values) if savings_vs_nearest_values else 0.0,

        "multi_store_win_rate": (multi_win_count / multi_success_count) if multi_success_count else 0.0,
        "avg_multi_num_stops": avg(multi_num_stops_values),
    }

    if rows:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("\n=== Evaluation Summary ===")
    print(f"Baskets processed: {processed}")
    print(f"Single-store success count: {single_success_count}")
    print(f"Multi-store success count: {multi_success_count}")
    print(f"Nearest == recommended rate: {summary['nearest_optimal_rate']*100:.1f}%")
    print(f"Full coverage rate: {summary['full_coverage_rate']*100:.1f}%")
    print(f"Average savings vs nearest: Rs {summary['avg_savings_vs_nearest']:.2f}")
    print(f"Max savings vs nearest: Rs {summary['max_savings_vs_nearest']:.2f}")
    print(f"Min savings vs nearest: Rs {summary['min_savings_vs_nearest']:.2f}")
    print(f"Multi-store win rate: {summary['multi_store_win_rate']*100:.1f}%")
    print(f"Average multi-store stops: {summary['avg_multi_num_stops']:.2f}")
    print(f"\nWrote:\n- {csv_path}\n- {summary_path}")

if __name__ == "__main__":
    main()