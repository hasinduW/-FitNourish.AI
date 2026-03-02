"""User model and auth request/response shapes for MongoDB and API."""

from pydantic import BaseModel, Field, field_validator

# Bcrypt limit; truncate at API boundary so backend never sees > 72 bytes
BCRYPT_MAX_BYTES = 72


def _truncate_password(v: str) -> str:
    if not isinstance(v, str):
        v = str(v)
    raw = v.encode("utf-8")
    if len(raw) <= BCRYPT_MAX_BYTES:
        return v
    return raw[:BCRYPT_MAX_BYTES].decode("utf-8", errors="ignore") or v[:1]


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1)

    @field_validator("password", mode="before")
    @classmethod
    def normalize_password(cls, v: object) -> str:
        return _truncate_password(v if isinstance(v, str) else str(v))


class SignupRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=64)
    last_name: str = Field(..., min_length=1, max_length=64)
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=6)

    @field_validator("password", mode="before")
    @classmethod
    def normalize_password(cls, v: object) -> str:
        return _truncate_password(v if isinstance(v, str) else str(v))


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
