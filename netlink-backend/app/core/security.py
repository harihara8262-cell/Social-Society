import time
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import APIKeyCookie
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.database import get_db
from app.db.models import User

# FastAPI Cookie-based JWT retrieval
cookie_sec = APIKeyCookie(name="session_token", auto_error=False)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

# --- USER IDENTIFICATION DEPENDENCIES ---

def get_current_user(
    request: Request,
    session_token: Optional[str] = Depends(cookie_sec),
    db: Session = Depends(get_db)
) -> User:
    token = session_token
    
    # Header fallback (Bearer)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token is missing. Please log in."
        )
        
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("userId")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload."
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token is invalid or has expired."
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token does not exist."
        )
        
    return user

def get_optional_user(
    request: Request,
    session_token: Optional[str] = Depends(cookie_sec),
    db: Session = Depends(get_db)
) -> Optional[User]:
    token = session_token
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        return None
        
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("userId")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None

# --- IN-MEMORY TOKEN-BUCKET RATE LIMITER ---

class RateLimiter:
    def __init__(self):
        # Maps key -> { "tokens": float, "last_refill": float }
        self.buckets: Dict[str, Tuple[float, float]] = {}

    def is_allowed(self, key: str, capacity: int, refill_rate: float) -> Tuple[bool, int, int]:
        now = time.time()
        bucket = self.buckets.get(key)

        if not bucket:
            tokens = float(capacity)
            last_refill = now
        else:
            tokens, last_refill = bucket
            elapsed = now - last_refill
            tokens = min(float(capacity), tokens + (elapsed * refill_rate))
            last_refill = now

        allowed = False
        if tokens >= 1.0:
            tokens -= 1.0
            allowed = True

        self.buckets[key] = (tokens, last_refill)
        
        remaining = int(tokens)
        reset = int((capacity - tokens) / refill_rate) if refill_rate > 0 else 0
        return allowed, remaining, reset

rate_limiter = RateLimiter()

def rate_limit(capacity: int, refill_rate: float, label: str):
    """
    FastAPI Dependency builder for Token Bucket rate limiting
    """
    def dependency(request: Request, current_user: Optional[User] = Depends(get_optional_user)):
        identifier = current_user.id if current_user else request.client.host
        key = f"{label}:{identifier}"
        
        allowed, remaining, reset = rate_limiter.is_allowed(key, capacity, refill_rate)
        
        # We can append rate limit values to request state to send in response headers via middleware
        request.state.rate_limit_headers = {
            "X-RateLimit-Limit": str(capacity),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset)
        }
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {label}. Please try again in {reset} seconds."
            )
            
    return dependency
