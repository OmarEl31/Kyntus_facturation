# Backend/schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["admin", "agent"] = "agent"
    is_active: bool = True

class UserRoleUpdate(BaseModel):
    role: Literal["admin", "agent"]

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None