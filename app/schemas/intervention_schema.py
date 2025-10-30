from pydantic import BaseModel

class PingOut(BaseModel):
    id: int
    label: str

    class Config:
        from_attributes = True
