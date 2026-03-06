import os
from flask import Blueprint, request, jsonify
from openai import OpenAI

bp_ai = Blueprint("ai", __name__)
client = OpenAI()

def _to_int(x, default=0):
    try:
        return int(x)
    except Exception:
        return default

def _to_float(x, default=0.0):
    try:
        return float(x)
    except Exception:
        return default

@bp_ai.post("/ai/insights")
def ai_insights():
    body = request.get_json(force=True)
    mode = body.get("mode", "single")

    if mode == "multi":
        plan = body.get("plan")
        baselines = body.get("baselines")
        metrics = body.get("metrics")
        basket = body.get("basket", {}) or {}
        travel = body.get("travel", {}) or {}
        basket_size = _to_int(basket.get("basket_size"), 0)

        basket = body.get("basket", {}) or {}
        basket_size = int(basket.get("basket_size") or 0)
        travel = body.get("travel", {}) or {}

        plan = body.get("plan") or []
        baselines = body.get("baselines")
        metrics = body.get("metrics") or {}
        savings_vs_best_single_store = body.get("savings_vs_best_single_store")

        num_stops = len(plan) if isinstance(plan, list) else 0

        net_delta = metrics.get("netDelta") if isinstance(metrics, dict) else None
        item_delta = metrics.get("itemDelta") if isinstance(metrics, dict) else None
        travel_delta = metrics.get("travelDelta") if isinstance(metrics, dict) else None

        assumption_line = f"Assumptions: Multi-store travel cost uses {travel.get('mode','driving')} mode via {travel.get('provider','google')} and is based on {travel.get('cost_model','distance')}."

        # if isinstance(recommended, dict):
        #     recommended.pop("route_polyline", None)

        # for s in stores:
        #     if isinstance(s, dict):
        #         s.pop("route_polyline", None)

        prompt = f"""
You are explaining a MULTI-STORE grocery plan to a non-technical user.
Be friendly and clear. Keep it short, but not robotic.

HARD RULES (must follow):
- Basket size is EXACTLY: {basket_size}. Never guess basket size from any prices or totals.
- Do NOT mention store catalog size.
- Do NOT invent missing items or quantities.
- Do NOT output curly braces like {{basket_size}}.

OUTPUT FORMAT (use these headings exactly without parentheses):

DECISION SUMMARY (2–3 short lines)
Compare the best single-store total and the multi-store total.
Explain which option is cheaper and by how much.

WHY THIS PLAN (3–5 sentences)
Explain the multi-store tradeoff in plain English:
- item savings vs extra travel
- whether the plan is better or worse than the best single-store
Mention how many stops it requires ({num_stops} stores).

KEY INSIGHTS (3 bullets, each 1–2 lines)
• Coverage: Explain whether the plan covers the full basket (based on basket_size and the plan items). If unknown, say "Coverage not provided".
• Extra travel impact: Explain the extra travel cost/time compared to best single-store using travelDelta when available.
• Net effect vs best single-store: Use netDelta (or savings_vs_best_single_store) to state better/worse and by how much.

ASSUMPTIONS (one sentence exactly)
{assumption_line}

DATA (use only these numbers):
- Travel settings: {travel}
- Basket: {basket}
- Plan: {plan}
- Baselines: {baselines}
- Metrics: {metrics}
- Savings vs best single-store: {savings_vs_best_single_store}
""".strip()

    else:
        travel = body.get("travel", {}) or {}
        recommended = body.get("recommended")
        stores = body.get("stores", [])
        nearest = body.get("nearest_baseline")
        savings = body.get("savings_info")
        basket = body.get("basket", {}) or {}

        basket = body.get("basket", {}) or {}
        basket_size = int(basket.get("basket_size") or 0)

        missing_items = (recommended.get("missing_items") or []) if isinstance(recommended, dict) else []
        coverage_found = max(0, basket_size - len(missing_items)) if basket_size else 0
        coverage_line = f"{coverage_found}/{basket_size}" if basket_size else "N/A"

        store_name = ""
        store_addr = ""
        if isinstance(recommended, dict):
            outlet = recommended.get("nearest_outlet") or {}
            store_name = outlet.get("name") or recommended.get("store") or "the recommended store"
            store_addr = outlet.get("address") or ""

        # prefer in-traffic if present
        dist_km = (recommended.get("distance_km") if isinstance(recommended, dict) else None)
        dur_min = None
        if isinstance(recommended, dict):
            dur_min = recommended.get("duration_min_in_traffic") or recommended.get("duration_min")

        save_amount = None
        save_pct = None
        second_store = None
        if isinstance(savings, dict):
            save_amount = savings.get("saveAmount")
            save_pct = savings.get("savePct")
            second_store = savings.get("secondStore")

        assumption_line = f"Assumptions: Travel cost uses {travel.get('mode','driving')} mode via {travel.get('provider','google')} and is based on {travel.get('cost_model','distance')}."

        if isinstance(recommended, dict):
            recommended.pop("route_polyline", None)

        for s in stores:
            if isinstance(s, dict):
                s.pop("route_polyline", None)

        prompt = f"""
You are explaining a grocery store recommendation to a non-technical user.
Be friendly and clear. Keep it short, but not robotic.

HARD RULES (must follow):
- Basket size is EXACTLY: {basket_size}. Never guess basket size from any prices or totals.
- Do NOT mention store catalog size.
- Do NOT invent missing items or quantities.
- Do NOT output curly braces like {{basket_size}}.
- Coverage MUST be based on missing_items and basket_size only.

OUTPUT FORMAT (use these headings exactly without parentheses):

WHY THIS STORE (3–4 sentences)
Explain in plain English why {store_name} was recommended, using coverage, travel impact, and savings.
If coverage is complete, mention it is a one-stop shop. If not, mention what is missing.

KEY INSIGHTS (3 bullets, each 1–2 lines)
• Coverage: Explain what {coverage_line} means (one-stop vs missing items). Missing: {missing_items}
• Travel impact: Use distance/time numbers below and describe whether the trip is short/moderate/long.
• Savings vs next best: If savings_info includes it, state the saving amount and percent vs {second_store}. If not provided, say "Not available".

ASSUMPTIONS (one sentence exactly)
{assumption_line}

DATA (use only these numbers):
- Travel settings: {travel}
- Recommended: store={store_name}, address={store_addr}, distance_km={dist_km}, duration_min={dur_min}
- Coverage: basket_size={basket_size}, missing_items={missing_items}
- Savings info: {savings}
- Nearest baseline: {nearest}
- Store breakdown: {stores}
""".strip()

    print(prompt)
    resp = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
        temperature=0.4,
    )

    return jsonify({"insights": resp.output_text})