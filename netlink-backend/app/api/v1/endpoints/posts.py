from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db
from app.db.models import Post, User, Like, Comment, Tag, PostTag
from app.db.schemas import PostCreate, PostResponse
from app.core.security import get_current_user, get_optional_user, rate_limit
from app.services.trending import parse_hashtags, parse_mentions, calculate_trending
from app.services.socket import create_and_send_notification

router = APIRouter()

# Rate limiting posts: max 20, refill 1 every 5s (0.2/s)
post_limiter = rate_limit(capacity=20, refill_rate=0.2, label="posts")

@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(post_limiter)])
async def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Create Post
    post = Post(
        content=post_data.content,
        media_url=post_data.media_url,
        media_type=post_data.media_type,
        author_id=current_user.id
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # 2. Parse and save hashtags
    tags_list = parse_hashtags(post_data.content)
    for tag_name in tags_list:
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
            db.commit()
            db.refresh(tag)
        
        post_tag = PostTag(post_id=post.id, tag_id=tag.id)
        db.add(post_tag)
        db.commit()

    # 3. Parse mentions and dispatch notifications
    mentions_list = parse_mentions(post_data.content)
    for username in mentions_list:
        mentioned_user = db.query(User).filter(User.username == username.lower()).first()
        if mentioned_user and mentioned_user.id != current_user.id:
            await create_and_send_notification(
                db=db,
                recipient_id=mentioned_user.id,
                sender_id=current_user.id,
                notification_type="COMMENT", # COMMENT type serves for mention triggers
                post_id=post.id
            )

    # Response formatting
    return {
        "id": post.id,
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "author": current_user,
        "likes_count": 0,
        "comments_count": 0,
        "is_liked": False,
        "tags": tags_list
    }

@router.get("/", response_model=List[PostResponse])
def get_posts(
    sort: Optional[str] = "latest",
    tag: Optional[str] = None,
    author: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    query = db.query(Post)

    # Apply tag filter
    if tag:
        query = query.join(PostTag).join(Tag).filter(Tag.name == tag.lower())

    # Apply author filter
    if author:
        query = query.join(User).filter(User.username == author.lower())

    # Default sort chronological desc
    raw_posts = query.order_by(Post.created_at.desc()).all()

    formatted_posts = []
    for post in raw_posts:
        # Check if liked by current viewer
        is_liked = False
        if current_user:
            like_check = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user.id).first()
            is_liked = bool(like_check)

        likes_count = db.query(Like).filter(Like.post_id == post.id).count()
        comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()
        
        # Tags extract
        post_tags = db.query(Tag).join(PostTag).filter(PostTag.post_id == post.id).all()
        tags = [t.name for t in post_tags]

        formatted_posts.append({
            "id": post.id,
            "content": post.content,
            "media_url": post.media_url,
            "media_type": post.media_type,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
            "author": post.author,
            "likes_count": likes_count,
            "comments_count": comments_count,
            "is_liked": is_liked,
            "tags": tags
        })

    # Engagement-weighted sort
    if sort == "popular":
        now = datetime.utcnow()
        def get_score(p):
            age_hours = (now - p["created_at"]).total_seconds() / 3600.0
            return (p["likes_count"] * 2.0 + p["comments_count"] * 3.0) / ((age_hours + 2.0) ** 1.5)
        
        formatted_posts.sort(key=get_score, reverse=True)

    return formatted_posts

@router.get("/trending")
def get_trending(db: Session = Depends(get_db)):
    trending = calculate_trending(db)
    return {"trending": trending}

@router.get("/{post_id}", response_model=PostResponse)
def get_post_details(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    is_liked = False
    if current_user:
        like_check = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user.id).first()
        is_liked = bool(like_check)

    likes_count = db.query(Like).filter(Like.post_id == post.id).count()
    comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()

    post_tags = db.query(Tag).join(PostTag).filter(PostTag.post_id == post.id).all()
    tags = [t.name for t in post_tags]

    return {
        "id": post.id,
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "author": post.author,
        "likes_count": likes_count,
        "comments_count": comments_count,
        "is_liked": is_liked,
        "tags": tags
    }

@router.post("/{post_id}/like")
async def like_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    # Toggle like
    existing_like = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user.id).first()
    if existing_like:
        db.delete(existing_like)
        db.commit()
        return {"liked": False, "message": "Post unliked successfully."}

    like = Like(post_id=post.id, user_id=current_user.id)
    db.add(like)
    db.commit()

    # Send Notification if someone else liked the post
    if post.author_id != current_user.id:
        await create_and_send_notification(
            db=db,
            recipient_id=post.author_id,
            sender_id=current_user.id,
            notification_type="LIKE",
            post_id=post.id
        )

    return {"liked": True, "message": "Post liked successfully."}

@router.delete("/{post_id}")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this post.")

    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully."}
