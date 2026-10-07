from fastapi import APIRouter, Depends
from app.schemas import UserResponse
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user
