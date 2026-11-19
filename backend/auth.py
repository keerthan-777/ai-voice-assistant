
import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).with_name(".env")
load_dotenv(dotenv_path=env_path, override=True)

password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
