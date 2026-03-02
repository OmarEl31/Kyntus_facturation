# Backend/core/security.py
from datetime import datetime, timedelta
from typing import Optional
import jwt
import bcrypt # <-- Bdelna passlib b bcrypt

# Configuration JWT
SECRET_KEY = "kyntus_super_secret_key_orange_facturation_2026_auth"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 yyam

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt kay7taj les passwords ykounou f format bytes (encode('utf-8'))
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)

def get_password_hash(password: str) -> str:
    # bcrypt kay-generer l'salt w kay-hachi l'password f format bytes, hna kan-rej3ouh string
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt