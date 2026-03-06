import os
from math import radians, sin, cos, sqrt, atan2
from dataclasses import dataclass
import requests


@dataclass
class DistanceResult:
    distance_km: float
    duration_min: float | None
    provider_used: str
    duration_min_no_traffic: float | None = None
    duration_min_in_traffic: float | None = None


class DistanceProviderError(RuntimeError):
    pass


def _bool_env(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "y", "on"}


def _normalize_mode(mode: str | None) -> str:
    """
    Google Distance Matrix supports: driving, walking, bicycling, transit.
    We normalize unknown values to driving.
    """
    m = (mode or "driving").lower().strip()
    if m not in {"driving", "walking", "bicycling", "transit"}:
        return "driving"
    return m


class HaversineProvider:
    @staticmethod
    def distance(origin_lat, origin_lng, dest_lat, dest_lng, mode: str) -> DistanceResult:
        """
        Haversine gives only distance. duration_min can be optionally estimated.
        """
        R = 6371.0
        lat1 = radians(float(origin_lat))
        lng1 = radians(float(origin_lng))
        lat2 = radians(float(dest_lat))
        lng2 = radians(float(dest_lng))

        dlat = lat2 - lat1
        dlng = lng2 - lng1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        dist_km = R * c

        return DistanceResult(distance_km=dist_km, duration_min=None, provider_used="haversine")

    @staticmethod
    def estimate_duration_min(distance_km: float, mode: str) -> float:
        """
        Rough fallback duration estimate for time-cost model when Google fails.
        Speeds (km/h) can be tuned via env.
        """
        m = _normalize_mode(mode)
        # Defaults:
        # driving 30km/h (city)
        # walking 4.5km/h
        # bicycling 12km/h
        # transit 20km/h
        speed_defaults = {
            "driving": float(os.getenv("HAVERSINE_SPEED_KMH_DRIVING", "30")),
            "walking": float(os.getenv("HAVERSINE_SPEED_KMH_WALKING", "4.5")),
            "bicycling": float(os.getenv("HAVERSINE_SPEED_KMH_BICYCLING", "12")),
            "transit": float(os.getenv("HAVERSINE_SPEED_KMH_TRANSIT", "20")),
        }
        kmh = max(speed_defaults.get(m, 30.0), 1.0)
        hours = distance_km / kmh
        return hours * 60.0


class GoogleDistanceMatrixProvider:
    def __init__(self, api_key: str):
        if not api_key:
            raise DistanceProviderError("GOOGLE_MAPS_API_KEY missing")
        self.api_key = api_key

    def distance(self, origin_lat, origin_lng, dest_lat, dest_lng, mode: str) -> DistanceResult:
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        m = _normalize_mode(mode)

        params = {
            "origins": f"{origin_lat},{origin_lng}",
            "destinations": f"{dest_lat},{dest_lng}",
            "mode": m,
            "key": self.api_key,
        }

        # request live traffic when driving
        if m == "driving":
            params["departure_time"] = "now"
        try:
            resp = requests.get(url, params=params, timeout=12)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise DistanceProviderError(f"Google Distance Matrix request failed: {e}")

        rows = data.get("rows", [])
        if not rows or not rows[0].get("elements"):
            raise DistanceProviderError(f"Google response missing rows/elements: {data}")

        el = rows[0]["elements"][0]
        status = el.get("status")
        if status != "OK":
            # ZERO_RESULTS happens if there is no route for that mode/region.
            raise DistanceProviderError(f"Google element status not OK: {el}")

        # Defensive parsing
        if "distance" not in el or "value" not in el["distance"]:
            raise DistanceProviderError(f"Google element missing distance: {el}")
        if "duration" not in el or "value" not in el["duration"]:
            raise DistanceProviderError(f"Google element missing duration: {el}")

        distance_m = el["distance"]["value"]

        # parse both durations
        duration_no_traffic_s = el["duration"]["value"]

        duration_in_traffic_s = None
        if "duration_in_traffic" in el and "value" in el["duration_in_traffic"]:
            duration_in_traffic_s = el["duration_in_traffic"]["value"]

        # choose which one to use for optimization
        chosen_s = duration_in_traffic_s or duration_no_traffic_s

        return DistanceResult(
            distance_km=float(distance_m) / 1000.0,
            duration_min=float(chosen_s) / 60.0,
            provider_used="google",
            duration_min_no_traffic=float(duration_no_traffic_s) / 60.0,
            duration_min_in_traffic=(float(duration_in_traffic_s) / 60.0) if duration_in_traffic_s else None,
        )


def resolve_provider(requested_provider: str | None) -> str:
    default_provider = (os.getenv("DISTANCE_PROVIDER_DEFAULT") or "haversine").lower().strip()
    allow_override = _bool_env("ALLOW_DISTANCE_PROVIDER_OVERRIDE", True)

    if requested_provider and allow_override:
        rp = requested_provider.lower().strip()
        if rp in {"google", "haversine"}:
            return rp

    return default_provider if default_provider in {"google", "haversine"} else "haversine"


# (minor perf) keep a singleton provider when possible
_GOOGLE_PROVIDER: GoogleDistanceMatrixProvider | None = None


def get_distance_result(
    origin_lat,
    origin_lng,
    dest_lat,
    dest_lng,
    mode: str,
    requested_provider: str | None,
) -> DistanceResult:

    print("Google distance call:", origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        mode,
        requested_provider)
    """
    Returns DistanceResult. Uses requested provider if allowed, otherwise default.
    Falls back to haversine if enabled and google fails.

    Enhancement:
    - On fallback, we ALSO estimate duration_min for time-cost model usefulness.
    """
    provider = resolve_provider(requested_provider)
    fallback_enabled = _bool_env("FALLBACK_TO_HAVERSINE", True)

    m = _normalize_mode(mode)

    if provider == "google":
        try:
            global _GOOGLE_PROVIDER
            if _GOOGLE_PROVIDER is None:
                _GOOGLE_PROVIDER = GoogleDistanceMatrixProvider(os.getenv("GOOGLE_MAPS_API_KEY") or "")
            return _GOOGLE_PROVIDER.distance(origin_lat, origin_lng, dest_lat, dest_lng, m)
        except Exception as e:
            print("⚠️ Google distance failed:", str(e))
            if fallback_enabled:
                res = HaversineProvider.distance(origin_lat, origin_lng, dest_lat, dest_lng, m)
                # estimate duration for better time-cost fallback
                est_min = HaversineProvider.estimate_duration_min(res.distance_km, m)
                return DistanceResult(
                    distance_km=res.distance_km,
                    duration_min=est_min,
                    provider_used="haversine_fallback",
                )
            raise

    # haversine
    res = HaversineProvider.distance(origin_lat, origin_lng, dest_lat, dest_lng, m)
    # if you want duration estimate even in pure haversine mode:
    if _bool_env("HAVERSINE_ESTIMATE_DURATION", True):
        res.duration_min = HaversineProvider.estimate_duration_min(res.distance_km, m)
    return res