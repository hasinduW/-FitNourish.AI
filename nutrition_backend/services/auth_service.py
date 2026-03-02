"""User registration and login with JWT and password hashing."""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from pymongo.database import Database

from database_models import USERS

# Use a strong secret in production (env variable). Algorithm for JWT.
SECRET_KEY = "fitnourish-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bcrypt only uses the first 72 bytes of the password; longer inputs raise.
BCRYPT_MAX_BYTES = 72


def _truncate_password_for_bcrypt(password: str) -> str:
    """Return password truncated to 72 UTF-8 bytes so bcrypt never raises."""
    if not isinstance(password, str):
        password = str(password)
    encoded = password.encode("utf-8")
    if len(encoded) <= BCRYPT_MAX_BYTES:
        return password
    truncated = encoded[:BCRYPT_MAX_BYTES].decode("utf-8", errors="ignore")
    return truncated or password[:1]  # avoid empty string if all multibyte


def hash_password(password: str) -> str:
    return pwd_context.hash(_truncate_password_for_bcrypt(password))


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(_truncate_password_for_bcrypt(plain), hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def register_user(
    db: Database,
    username: str,
    password: str,
    first_name: str,
    last_name: str,
) -> dict:
    """Create a new user. Raises ValueError if username exists."""
    coll = db[USERS]
    username_lower = username.strip().lower()
    if coll.find_one({"username_lower": username_lower}):
        raise ValueError("Username already taken")
    doc = {
        "username": username.strip(),
        "username_lower": username_lower,
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "password_hash": hash_password(password),
        "created_at": datetime.utcnow(),
    }
    ins = coll.insert_one(doc)
    return {
        "_id": ins.inserted_id,
        "username": doc["username"],
        "first_name": doc["first_name"],
        "last_name": doc["last_name"],
    }


def authenticate_user(db: Database, username: str, password: str) -> Optional[dict]:
    """Return user doc (without password) if credentials are valid, else None."""
    coll = db[USERS]
    user = coll.find_one({"username_lower": username.strip().lower()})
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return {
        "_id": user["_id"],
        "username": user["username"],
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
    }
