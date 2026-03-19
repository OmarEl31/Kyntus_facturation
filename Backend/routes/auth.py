# Backend/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError

from database.connection import get_db
from models.user import User
from schemas.user import UserOut, Token, TokenData
from core.security import (
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        email = payload.get("sub")
    except InvalidTokenError:
        raise credentials_exception

    user = None

    if user_id is not None:
        try:
            uid = int(user_id)
        except Exception:
            raise credentials_exception

        user = db.query(User).filter(User.id == uid).first()

    if user is None and email:
        token_data = TokenData(email=email)
        user = db.query(User).filter(User.email == token_data.email).first()

    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Utilisateur inactif")
    return current_user


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user


@router.post("/register")
def register_disabled():
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="L'inscription publique est désactivée. Veuillez contacter un administrateur."
    )


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte inactif. Veuillez contacter un administrateur."
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.get("/admin-only", response_model=dict)
def admin_only(current_user: User = Depends(require_admin)):
    return {"message": "Bienvenue administrateur", "user": current_user.email}