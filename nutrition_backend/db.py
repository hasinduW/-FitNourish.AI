"""
MongoDB connection for FitNourish.AI backend.
Uses MongoDB Atlas. For production, move the connection string to an env variable.
"""
from pymongo import MongoClient
from pymongo.database import Database

# MongoDB Atlas connection string (use env in production)
MONGODB_URI = (
    "mongodb+srv://root:RwCFOMO855XlnMuu@cluster0.s3lzr7.mongodb.net/fitnourish-ai"
    "?retryWrites=true&w=majority"
)
DB_NAME = "fitnourish-ai"

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client


def get_database() -> Database:
    return get_client()[DB_NAME]


def get_db():
    """Yield the MongoDB database for dependency injection (FastAPI Depends(get_db))."""
    db = get_database()
    try:
        yield db
    finally:
        pass  # Connection is managed by the client; no per-request close needed


def init_db():
    """Create indexes for MongoDB collections. Collections are created on first insert."""
    from database_models import (
        PREDICTIONS,
        MEAL_PLANS,
        PATIENT_PROFILES,
        DIET_PRINCIPLES,
        HEALTH_ASSESSMENTS,
        USERS,
    )
    db = get_database()
    db[PREDICTIONS].create_index([("user_id", 1), ("created_at", -1)])
    db[MEAL_PLANS].create_index([("created_at", -1)])
    db[PATIENT_PROFILES].create_index("user_id", unique=True)
    db[DIET_PRINCIPLES].create_index([("user_id", 1), ("date", -1)])
    db[HEALTH_ASSESSMENTS].create_index([("user_id", 1), ("date", 1)], unique=True)
    db[USERS].create_index("username_lower", unique=True)
    print("MongoDB indexes ensured.")
