"""Food image validation using Google Cloud Vision API."""

import imghdr
import os

from google.cloud import vision
from google.oauth2 import service_account

_MIME_MAP = {"png": "image/png", "jpeg": "image/jpeg", "jpg": "image/jpeg", "webp": "image/webp"}

# Labels from Vision API that indicate food content
_FOOD_LABELS = {
    "food", "dish", "meal", "cuisine", "ingredient", "recipe",
    "breakfast", "lunch", "dinner", "snack", "dessert", "drink", "beverage",
    "fruit", "vegetable", "meat", "seafood", "bread", "rice", "pasta",
    "soup", "salad", "sandwich", "pizza", "burger", "sushi", "cake",
    "baking", "cooking", "fast food", "street food", "comfort food",
}

# Minimum Vision API label confidence to count as food (0–1)
_FOOD_CONFIDENCE_THRESHOLD = 0.65


def _detect_mime(image_bytes: bytes) -> str:
    fmt = imghdr.what(None, h=image_bytes)
    return _MIME_MAP.get(fmt or "", "image/jpeg")


def _get_client() -> vision.ImageAnnotatorClient:
    key_path = os.environ.get("GOOGLE_VISION_KEY_PATH")
    if not key_path:
        raise RuntimeError("GOOGLE_VISION_KEY_PATH not set in environment")
    credentials = service_account.Credentials.from_service_account_file(
        key_path,
        scopes=["https://www.googleapis.com/auth/cloud-vision"],
    )
    return vision.ImageAnnotatorClient(credentials=credentials)


def is_food_image(image_bytes: bytes) -> tuple[bool, str]:
    """
    Use Google Cloud Vision label detection to check whether the image contains food.
    Returns (is_food, reason_message).
    """
    mime_type = _detect_mime(image_bytes)
    print(f"[image_validation] detected mime={mime_type}  bytes={len(image_bytes)}")

    client = _get_client()
    image = vision.Image(content=image_bytes)

    response = client.label_detection(image=image, max_results=20)

    if response.error.message:
        print(f"[image_validation] Vision API error: {response.error.message}")
        return True, "Validation service unavailable, proceeding."

    labels = response.label_annotations
    print(f"[image_validation] labels: {[(l.description, round(l.score, 2)) for l in labels]}")

    for label in labels:
        if label.score >= _FOOD_CONFIDENCE_THRESHOLD:
            if label.description.lower() in _FOOD_LABELS:
                print(f"[image_validation] food label matched: {label.description!r} score={label.score:.2f}")
                return True, "Image contains food."

    print("[image_validation] no food labels found above threshold")
    return False, "The uploaded image does not appear to contain food. Please upload a food or meal image."
