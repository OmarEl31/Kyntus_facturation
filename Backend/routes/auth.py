# Backend/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError

from database.connection import get_db
from models.user import User
from schemas.user import UserCreate, UserOut, Token, TokenData
from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Swagger UI: endpoint de login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Middleware d'auth:
    - Décode le JWT
    - Récupère l'utilisateur (priorité: user_id, fallback: sub=email)
    - Retourne l'objet User SQLAlchemy
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # ✅ Nouveau: support user_id (prioritaire)
        user_id = payload.get("user_id")

        # ✅ Ancien support: sub=email (fallback) pour ne rien casser
        email = payload.get("sub")

    except InvalidTokenError:
        raise credentials_exception

    user: User | None = None

    # 1) Priorité: lookup par user_id (plus robuste)
    if user_id is not None:
        try:
            uid = int(user_id)
        except Exception:
            # token mal formé
            raise credentials_exception

        user = db.query(User).filter(User.id == uid).first()

    # 2) Fallback: lookup par email (anciens tokens)
    if user is None and email:
        token_data = TokenData(email=email)
        user = db.query(User).filter(User.email == token_data.email).first()

    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Vérifie que l'utilisateur est actif.
    À utiliser pour les routes qui nécessitent un compte actif.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Utilisateur inactif")
    return current_user


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Vérifie que l'utilisateur est administrateur.
    À utiliser pour les routes d'administration.
    """
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Vérifier si email existe déjà
    user_exists = db.query(User).filter(User.email == user_in.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        role="agent",
        is_active=True,  # Par défaut, un nouvel utilisateur est actif
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Chercher user par email
    user = db.query(User).filter(User.email == form_data.username).first()

    # Vérifier password
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ✅ Token: on garde sub=email + on ajoute user_id
    access_token = create_access_token(
        data={
            "sub": user.email,     # rétro-compatible
            "user_id": user.id,    # ✅ nouveau pour tes routes imports/dossiers
            "role": user.role,
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Récupère les informations de l'utilisateur connecté.
    Nécessite un compte actif.
    """
    return current_user


@router.get("/admin-only", response_model=dict)
def admin_only(current_user: User = Depends(require_admin)):
    """
    Route test réservée aux administrateurs.
    """
    return {"message": "Bienvenue administrateur", "user": current_user.email}