from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime

from models.patient_profile import doc_to_dict
from database_models import PATIENT_PROFILES
from db import get_db

router = APIRouter(prefix="/api/patient", tags=["Patient Profile"])


class PatientProfileRequest(BaseModel):
    userId:     str
    age:        int
    gender:     str
    married:    str
    profession: str
    smoking:    str
    alcohol:    str


@router.post("/profile")
def save_patient_profile(body: PatientProfileRequest, db=Depends(get_db)):
    """Create or update patient basic profile."""
    try:
        coll = db[PATIENT_PROFILES]
        now = datetime.utcnow()
        user_id = str(body.userId)
        existing = coll.find_one({"user_id": user_id})

        if existing:
            coll.update_one(
                {"user_id": user_id},
                {"$set": {
                    "age": body.age,
                    "gender": body.gender,
                    "married": body.married,
                    "profession": body.profession,
                    "smoking": body.smoking,
                    "alcohol": body.alcohol,
                    "updated_at": now,
                }},
            )
            updated = coll.find_one({"user_id": user_id})
            print(f"✓ Profile UPDATED for user {user_id}")
            return {"success": True, "message": "Profile updated", "data": doc_to_dict(updated)}
        else:
            doc = {
                "user_id": user_id,
                "age": body.age,
                "gender": body.gender,
                "married": body.married,
                "profession": body.profession,
                "smoking": body.smoking,
                "alcohol": body.alcohol,
                "created_at": now,
                "updated_at": now,
            }
            coll.insert_one(doc)
            created = coll.find_one({"user_id": user_id})
            print(f"✓ Profile CREATED for user {user_id}")
            return {"success": True, "message": "Profile created", "data": doc_to_dict(created)}
    except Exception as e:
        print(f"Error saving profile: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/profile/{user_id}")
def get_patient_profile(user_id: str, db=Depends(get_db)):
    """Get patient profile by user ID."""
    try:
        coll = db[PATIENT_PROFILES]
        # profile = coll.find_one({"user_id": user_id})
        profile = coll.find_one({"user_id": user_id}) or coll.find_one({"user_id": int(user_id) if user_id.isdigit() else None})

        if not profile:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Profile not found"}
            )
        return {"success": True, "data": doc_to_dict(profile)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
