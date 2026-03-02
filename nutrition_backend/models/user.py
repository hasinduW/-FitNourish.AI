"""User model and auth request/response shapes for MongoDB and API."""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1)


class SignupRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=64)
    last_name: str = Field(..., min_length=1, max_length=64)
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    first_name: str | None = None
    last_name: str | None = None


class UserResponse(BaseModel):
    id: str
    username: str
    first_name: str | None = None
    last_name: str | None = None


def doc_to_dict(doc: dict) -> dict | None:
    """Convert a MongoDB users document to API response shape (no password)."""
    if not doc:
        return None
    return {
        "id": str(doc.get("_id")),
        "username": doc.get("username"),
        "first_name": doc.get("first_name"),
        "last_name": doc.get("last_name"),
    }
