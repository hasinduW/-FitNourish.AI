from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from datetime import datetime, date

from models.diet_principles import doc_to_dict
from database_models import DIET_PRINCIPLES
from db import get_db

router = APIRouter(prefix="/api/diet-principles", tags=["Diet Principles"])


class SavePrinciplesRequest(BaseModel):
    userId:     str
    dietName:   str
    principles: List[str]


@router.post("/save")
def save_diet_principles(body: SavePrinciplesRequest, db=Depends(get_db)):
    """Save or update today's latest diet principles for a user."""
    try:
        # today = date.today()
        today = datetime.combine(date.today(), datetime.min.time())
        principles = (body.principles + [None, None, None, None])[:4]
        coll = db[DIET_PRINCIPLES]
        now = datetime.utcnow()

        existing = coll.find_one({"user_id": body.userId, "date": today})

        if existing:
            coll.update_one(
                {"user_id": body.userId, "date": today},
                {"$set": {
                    "diet_name": body.dietName,
                    "principle_1": principles[0],
                    "principle_2": principles[1],
                    "principle_3": principles[2],
                    "principle_4": principles[3],
                    "updated_at": now,
                }},
            )
            updated = coll.find_one({"user_id": body.userId, "date": today})
            print(f"✓ Diet principles UPDATED for user {body.userId}")
            return {"success": True, "message": "Principles updated", "data": doc_to_dict(updated)}
        else:
            doc = {
                "user_id": body.userId,
                "date": today,
                "diet_name": body.dietName,
                "principle_1": principles[0],
                "principle_2": principles[1],
                "principle_3": principles[2],
                "principle_4": principles[3],
                "updated_at": now,
            }
            coll.insert_one(doc)
            created = coll.find_one({"user_id": body.userId, "date": today})
            print(f"✓ Diet principles CREATED for user {body.userId}")
            return {"success": True, "message": "Principles saved", "data": doc_to_dict(created)}
    except Exception as e:
        print(f"Error saving diet principles: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/today/{user_id}")
def get_todays_principles(user_id: str, db=Depends(get_db)):
    """Get today's latest diet principles."""
    try:
        today = date.today()
        coll = db[DIET_PRINCIPLES]
        record = coll.find_one({"user_id": user_id, "date": today})

        if not record:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "No principles found for today"}
            )
        return {"success": True, "data": doc_to_dict(record)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/history/{user_id}")
def get_principles_history(user_id: str, db=Depends(get_db)):
    """Get all past diet principles for a user."""
    try:
        coll = db[DIET_PRINCIPLES]
        records = list(coll.find({"user_id": user_id}).sort("date", -1))
        return {"success": True, "data": [doc_to_dict(r) for r in records]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
