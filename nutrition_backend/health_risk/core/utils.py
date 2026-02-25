import numpy as np


def make_json_safe(obj):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, np.generic):
        return obj.item()
    elif isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_safe(v) for v in obj]
    return obj