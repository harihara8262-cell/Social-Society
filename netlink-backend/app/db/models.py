import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Follow(Base):
    __tablename__ = "follows"
    follower_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")

class PostTag(Base):
    __tablename__ = "post_tags"
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_username_change = Column(DateTime, nullable=True)

    # Relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    
    following = relationship("Follow", foreign_keys=[Follow.follower_id], back_populates="follower", cascade="all, delete-orphan")
    followers = relationship("Follow", foreign_keys=[Follow.following_id], back_populates="following", cascade="all, delete-orphan")

    notifications_received = relationship("Notification", foreign_keys="Notification.recipient_id", back_populates="recipient", cascade="all, delete-orphan")
    notifications_sent = relationship("Notification", foreign_keys="Notification.sender_id", back_populates="sender", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=generate_uuid)
    author_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    media_url = Column(String, nullable=True)
    media_type = Column(String, nullable=True) # "image" or "video"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    author = relationship("User", back_populates="posts")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    post_tags = relationship("PostTag", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="post", cascade="all, delete-orphan")

class Like(Base):
    __tablename__ = "likes"
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=generate_uuid)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], backref="replies")
    notifications = relationship("Notification", back_populates="comment", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    recipient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False) # "LIKE", "COMMENT", "FOLLOW"
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    comment_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="notifications_received")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="notifications_sent")
    post = relationship("Post", back_populates="notifications")
    comment = relationship("Comment", back_populates="notifications")
