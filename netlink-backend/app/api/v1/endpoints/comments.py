from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import Comment, Post, User
from app.db.schemas import CommentCreate, CommentResponse
from app.core.security import get_current_user, rate_limit
from app.services.socket import create_and_send_notification

router = APIRouter()

# Rate limit comments: max 30, refill 1 every 2 seconds (0.5/s)
comment_limiter = rate_limit(capacity=30, refill_rate=0.5, label="comments")

@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(comment_limiter)])
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    if comment_data.parent_id:
        parent_comment = db.query(Comment).filter(Comment.id == comment_data.parent_id, Comment.post_id == post_id).first()
        if not parent_comment:
            raise HTTPException(status_code=400, detail="Parent comment not found on this post.")

    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=comment_data.parent_id,
        content=comment_data.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Dispatch Notifications
    # Scenario A: Reply to another comment
    if comment_data.parent_id:
        parent_comment = db.query(Comment).filter(Comment.id == comment_data.parent_id).first()
        if parent_comment and parent_comment.author_id != current_user.id:
            await create_and_send_notification(
                db=db,
                recipient_id=parent_comment.author_id,
                sender_id=current_user.id,
                notification_type="COMMENT",
                post_id=post_id,
                comment_id=comment.id
            )
            
    # Scenario B: Direct post comment
    elif post.author_id != current_user.id:
        await create_and_send_notification(
            db=db,
            recipient_id=post.author_id,
            sender_id=current_user.id,
            notification_type="COMMENT",
            post_id=post_id,
            comment_id=comment.id
        )

    # Formatting response author details
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "parent_id": comment.parent_id,
        "content": comment.content,
        "created_at": comment.created_at,
        "author": current_user,
        "replies": []
    }

@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(post_id: str, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).all()

    # Build recursive hierarchy tree in Python
    comment_map = {}
    root_comments = []

    # Map database outputs to dictionary schemas
    for c in comments:
        comment_dict = {
            "id": c.id,
            "post_id": c.post_id,
            "author_id": c.author_id,
            "parent_id": c.parent_id,
            "content": c.content,
            "created_at": c.created_at,
            "author": {
                "id": c.author.id,
                "username": c.author.username,
                "avatar_url": c.author.avatar_url
            },
            "replies": []
        }
        comment_map[c.id] = comment_dict

    # Construct the tree
    for c_id, c_dict in comment_map.items():
        p_id = c_dict["parent_id"]
        if p_id:
            parent = comment_map.get(p_id)
            if parent:
                parent["replies"].append(c_dict)
            else:
                root_comments.append(c_dict)
        else:
            root_comments.append(c_dict)

    return root_comments

@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    is_comment_owner = comment.author_id == current_user.id
    is_post_owner = comment.post.author_id == current_user.id

    if not is_comment_owner and not is_post_owner:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this comment.")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully."}
