from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import UserCreate, UserLogin, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, get_current_user, rate_limit
from app.core.config import settings

router = APIRouter()

# Authentication Rate Limiting: max 10 attempts per minute (1 token refilled every 6 seconds)
auth_limiter = rate_limit(capacity=10, refill_rate=0.166, label="auth")

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_limiter)])
def register(user_data: UserCreate, response: Response, db: Session = Depends(get_db)):
    # Check if username exists
    existing_username = db.query(User).filter(User.username == user_data.username.lower()).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username is already taken.")

    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # Hash password & create user
    hashed = hash_password(user_data.password)
    user = User(
        username=user_data.username.lower(),
        email=user_data.email.lower(),
        password_hash=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Set Cookie session JWT
    token = create_access_token(data={"userId": user.id})
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="strict",
        max_age=604800,  # 7 days
        secure=settings.NODE_ENV == "production"
    )

    return user

@router.post("/login", response_model=UserResponse, dependencies=[Depends(auth_limiter)])
def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    # Set Cookie session JWT
    token = create_access_token(data={"userId": user.id})
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="strict",
        max_age=604800,  # 7 days
        secure=settings.NODE_ENV == "production"
    )

    return user

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="session_token",
        httponly=True,
        samesite="strict",
        secure=settings.NODE_ENV == "production"
    )
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
