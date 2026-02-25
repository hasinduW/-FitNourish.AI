from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date

from models.diet_principles import DietPrinciples
from db import get_db

router = APIRouter(prefix="/api/diet-principles", tags=["Diet Principles"])


# ── Schema ────────────────────────────────────────────────────────

class SavePrinciplesRequest(BaseModel):
    userId:     int
    dietName:   str
    principles: List[str]   # 3 or 4 items


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/save")
def save_diet_principles(body: SavePrinciplesRequest, db: Session = Depends(get_db)):
    """
    Save or update today's latest diet principles for a user.
    Called every time user gets an assessment — always overwrites today's record.
    """
    try:
        today = date.today()

        # Pad principles list to always have 4 slots
        principles = (body.principles + [None, None, None, None])[:4]

        existing = db.query(DietPrinciples).filter_by(
            user_id=body.userId,
            date=today,
        ).first()

        if existing:
            # ✅ Overwrite with latest assessment result
            existing.diet_name    = body.dietName
            existing.principle_1  = principles[0]
            existing.principle_2  = principles[1]
            existing.principle_3  = principles[2]
            existing.principle_4  = principles[3]
            existing.updated_at   = datetime.now()
            db.commit()
            db.refresh(existing)
            print(f"✓ Diet principles UPDATED for user {body.userId}")
            return {"success": True, "message": "Principles updated", "data": existing.to_dict()}

        else:
            new_record = DietPrinciples(
                user_id     = body.userId,
                date        = today,
                diet_name   = body.dietName,
                principle_1 = principles[0],
                principle_2 = principles[1],
                principle_3 = principles[2],
                principle_4 = principles[3],
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)
            print(f"✓ Diet principles CREATED for user {body.userId}")
            return {"success": True, "message": "Principles saved", "data": new_record.to_dict()}

    except Exception as e:
        db.rollback()
        print(f"Error saving diet principles: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/today/{user_id}")
def get_todays_principles(user_id: int, db: Session = Depends(get_db)):
    """Get today's latest diet principles for notification service."""
    try:
        today = date.today()
        record = db.query(DietPrinciples).filter_by(
            user_id=user_id,
            date=today,
        ).first()

        if not record:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "No principles found for today"}
            )

        return {"success": True, "data": record.to_dict()}

    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/history/{user_id}")
def get_principles_history(user_id: int, db: Session = Depends(get_db)):
    """Get all past diet principles for a user."""
    try:
        records = db.query(DietPrinciples).filter_by(
            user_id=user_id,
        ).order_by(DietPrinciples.date.desc()).all()

        return {"success": True, "data": [r.to_dict() for r in records]}

    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})