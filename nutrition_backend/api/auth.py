"""Auth API: signup, login, and optional me (JWT)."""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import get_db
from database_models import USERS, CONFIGS
from models.user import LoginRequest, SignupRequest, TokenResponse, UserResponse
from services.auth_service import (
    authenticate_user,
    create_access_token,
    decode_token,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


@router.post("/signup", response_model=TokenResponse)
def signup(data: SignupRequest, db=Depends(get_db)):
    """Register a new user and return JWT."""
    try:
        user = register_user(
            db,
            data.username,
            data.password,
            data.first_name,
            data.last_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    user_id = str(user["_id"])

    # Create default config for the new user
    db[CONFIGS].insert_one({"user_id": user_id, "validation_enabled": False})

    token = create_access_token(data={"sub": user_id, "username": user["username"]})
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        username=user["username"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db=Depends(get_db)):
    """Authenticate with username/password and return JWT."""
    user = authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user_id = str(user["_id"])
    token = create_access_token(data={"sub": user_id, "username": user["username"]})
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        username=user["username"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
    )


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)) -> str:
    """Dependency: require valid JWT and return user_id. Use for protected routes."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["sub"]


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_db),
) -> UserResponse:
    """Dependency: require valid JWT and return the current user. Use when route needs full user."""
    coll = db[USERS]
    doc = coll.find_one(
        {"_id": ObjectId(user_id)},
        projection={"username": 1, "first_name": 1, "last_name": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user_id,
        username=doc["username"],
        first_name=doc.get("first_name"),
        last_name=doc.get("last_name"),
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: UserResponse = Depends(get_current_user)):
    """Return current user from JWT."""
    return current_user
