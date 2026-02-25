from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from models.patient_profile import PatientProfile
from db import get_db

router = APIRouter(prefix="/api/patient", tags=["Patient Profile"])


# ── Pydantic Schema ───────────────────────────────────────────────

class PatientProfileRequest(BaseModel):
    userId:     int
    age:        int
    gender:     str
    married:    str
    profession: str
    smoking:    str
    alcohol:    str


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/profile")
def save_patient_profile(body: PatientProfileRequest, db: Session = Depends(get_db)):
    """Create or update patient basic profile."""
    try:
        existing = db.query(PatientProfile).filter_by(user_id=body.userId).first()

        if existing:
            # Update
            existing.age        = body.age
            existing.gender     = body.gender
            existing.married    = body.married
            existing.profession = body.profession
            existing.smoking    = body.smoking
            existing.alcohol    = body.alcohol
            existing.updated_at = datetime.now()
            db.commit()
            db.refresh(existing)
            print(f"✓ Profile UPDATED for user {body.userId}")
            return {"success": True, "message": "Profile updated", "data": existing.to_dict()}

        else:
            # Create
            new_profile = PatientProfile(
                user_id    = body.userId,
                age        = body.age,
                gender     = body.gender,
                married    = body.married,
                profession = body.profession,
                smoking    = body.smoking,
                alcohol    = body.alcohol,
            )
            db.add(new_profile)
            db.commit()
            db.refresh(new_profile)
            print(f"✓ Profile CREATED for user {body.userId}")
            return {"success": True, "message": "Profile created", "data": new_profile.to_dict()}

    except Exception as e:
        db.rollback()
        print(f"Error saving profile: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/profile/{user_id}")
def get_patient_profile(user_id: int, db: Session = Depends(get_db)):
    """Get patient profile by user ID."""
    try:
        profile = db.query(PatientProfile).filter_by(user_id=user_id).first()

        if not profile:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Profile not found"}
            )

        return {"success": True, "data": profile.to_dict()}

    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})