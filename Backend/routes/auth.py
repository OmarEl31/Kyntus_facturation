# Backend/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError

from database.connection import get_db
from models.user import User
from schemas.user import UserCreate, UserOut, Token, TokenData
from core.security import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Hada kaywerri l'Swagger UI fin ymchi ydir login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Hada houwa l'middleware li kay-protegi les routes.
    Kay-vérifier l'token w kay-reje3 l'User li m-connecté db.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except InvalidTokenError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # N-vérifiou wach l'email kayn deja
    user_exists = db.query(User).filter(User.email == user_in.email).first()
    if user_exists:
        raise HTTPException(
            status_code=400,
            detail="Cet email est déjà utilisé."
        )
    
    # N-cryptiw l'password w n-sauviw l'user
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # N-9elbou 3la l'user
    user = db.query(User).filter(User.email == form_data.username).first()
    # N-vérifiou l'password
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # N-génériw l'token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}