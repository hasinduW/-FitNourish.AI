"""User config API: get and toggle per-user feature flags."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import get_current_user_id
from db import get_db
from database_models import CONFIGS

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigResponse(BaseModel):
    user_id: str
    validation_enabled: bool


@router.get("", response_model=ConfigResponse)
def get_config(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    """Return the config for the current user. Creates it with defaults if absent."""
    doc = db[CONFIGS].find_one({"user_id": user_id})
    if not doc:
        doc = {"user_id": user_id, "validation_enabled": False}
        db[CONFIGS].insert_one(doc)
    return ConfigResponse(user_id=user_id, validation_enabled=doc.get("validation_enabled", False))


@router.patch("/toggle-validation", response_model=ConfigResponse)
def toggle_validation(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    """Toggle validationEnabled for the current user and return the updated config."""
    doc = db[CONFIGS].find_one({"user_id": user_id})
    if not doc:
        new_value = False
        db[CONFIGS].insert_one({"user_id": user_id, "validation_enabled": new_value})
    else:
        new_value = not doc.get("validation_enabled", False)
        db[CONFIGS].update_one({"user_id": user_id}, {"$set": {"validation_enabled": new_value}})
    return ConfigResponse(user_id=user_id, validation_enabled=new_value)
