import os
from src.services.distance_provider import DistanceResult


def _float_env(name: str, default: float) -> float:
    v = os.getenv(name)
    if v is None:
        return default
    try:
        return float(v)
    except:
        return default


def resolve_cost_model(requested: str | None) -> str:
    default_model = (os.getenv("DEFAULT_COST_MODEL") or "distance").lower().strip()
    if requested:
        rm = requested.lower().strip()
        if rm in {"distance", "time"}:
            return rm
    return default_model


def compute_travel_cost(distance: DistanceResult, requested_model: str | None) -> float:
    model = resolve_cost_model(requested_model)

    cost_per_km = _float_env("DEFAULT_COST_PER_KM", 0.0)
    cost_per_min = _float_env("DEFAULT_COST_PER_MIN", 0.0)

    if model == "time":
        if distance.duration_min is not None:
            return float(distance.duration_min) * cost_per_min
        # fallback to distance if duration not available (haversine or fallback)
        return float(distance.distance_km) * cost_per_km

    # distance model
    return float(distance.distance_km) * cost_per_km