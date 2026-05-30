from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.db.database import get_db
from app.db.models import User, Follow, Post
from app.db.schemas import UserUpdate, UserProfileResponse, UserSearchResponse, UserResponse
from app.core.security import get_current_user, get_optional_user
from app.services.socket import create_and_send_notification

router = APIRouter()

@router.get("/search", response_model=List[UserSearchResponse])
def search_users(q: str, db: Session = Depends(get_db)):
    if not q:
        return []
    users = db.query(User).filter(User.username.contains(q.lower())).limit(10).all()
    return users

@router.get("/profile/{username}", response_model=UserProfileResponse)
def get_user_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    profile_user = db.query(User).filter(User.username == username.lower()).first()
    if not profile_user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    # Calculate metrics
    followers_count = db.query(Follow).filter(Follow.following_id == profile_user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == profile_user.id).count()
    posts_count = db.query(Post).filter(Post.author_id == profile_user.id).count()

    is_following = False
    is_mutual_follow = False

    if current_user and current_user.id != profile_user.id:
        # Check standard follow
        follow_check = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == profile_user.id
        ).first()
        is_following = bool(follow_check)

        # Check reverse follow
        reverse_check = db.query(Follow).filter(
            Follow.follower_id == profile_user.id,
            Follow.following_id == current_user.id
        ).first()
        is_mutual_follow = is_following and bool(reverse_check)

    return {
        "id": profile_user.id,
        "username": profile_user.username,
        "avatar_url": profile_user.avatar_url,
        "cover_url": profile_user.cover_url,
        "bio": profile_user.bio,
        "created_at": profile_user.created_at,
        "followers_count": followers_count,
        "following_count": following_count,
        "posts_count": posts_count,
        "is_following": is_following,
        "is_mutual_follow": is_mutual_follow
    }

@router.patch("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if profile_data.username is not None and profile_data.username.lower() != current_user.username:
        # Check cooldown
        if current_user.last_username_change:
            cooldown_until = current_user.last_username_change + timedelta(days=10)
            if datetime.utcnow() < cooldown_until:
                days_left = (cooldown_until - datetime.utcnow()).days + 1
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You can only change your username once every 10 days. Try again in {days_left} days."
                )
        
        # Check uniqueness
        existing_user = db.query(User).filter(User.username == profile_data.username.lower()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken."
            )
        
        current_user.username = profile_data.username.lower()
        current_user.last_username_change = datetime.utcnow()

    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    if profile_data.cover_url is not None:
        current_user.cover_url = profile_data.cover_url

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/{following_id}/follow")
async def follow_user(
    following_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id == following_id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")

    target_user = db.query(User).filter(User.id == following_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    # Toggle follow
    existing_follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == following_id
    ).first()

    if existing_follow:
        db.delete(existing_follow)
        db.commit()
        return {"following": False, "message": "Unfollowed user successfully."}

    follow = Follow(follower_id=current_user.id, following_id=following_id)
    db.add(follow)
    db.commit()

    # Notify target user
    await create_and_send_notification(
        db=db,
        recipient_id=following_id,
        sender_id=current_user.id,
        notification_type="FOLLOW"
    )

    return {"following": True, "message": "Followed user successfully."}
