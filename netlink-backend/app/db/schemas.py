from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=20, pattern="^[a-zA-Z0-9_]+$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=20, pattern="^[a-zA-Z0-9_]+$")
    bio: Optional[str] = Field(None, max_length=160)
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    last_username_change: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    followers_count: int
    following_count: int
    posts_count: int
    is_following: bool
    is_mutual_follow: bool

    class Config:
        from_attributes = True

class UserSearchResponse(BaseModel):
    id: str
    username: str
    avatar_url: Optional[Optional[str]] = None
    bio: Optional[Optional[str]] = None

    class Config:
        from_attributes = True

# --- POST SCHEMAS ---
class PostBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostAuthor(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class PostResponse(BaseModel):
    id: str
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    author: PostAuthor
    likes_count: int
    comments_count: int
    is_liked: bool
    tags: List[str]

    class Config:
        from_attributes = True

# --- COMMENT SCHEMAS ---
class CommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    parent_id: Optional[str] = None

class CommentCreate(CommentBase):
    pass

class CommentResponse(BaseModel):
    id: str
    post_id: str
    author_id: str
    parent_id: Optional[str] = None
    content: str
    created_at: datetime
    author: PostAuthor
    replies: List['CommentResponse'] = []

    class Config:
        from_attributes = True

# --- NOTIFICATION SCHEMAS ---
class NotificationPost(BaseModel):
    id: str
    content: str

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    sender_id: str
    type: str
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    is_read: bool
    created_at: datetime
    sender: PostAuthor
    post: Optional[NotificationPost] = None

    class Config:
        from_attributes = True
