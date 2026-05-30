from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import Notification, User
from app.db.schemas import NotificationResponse
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    
    # Format response payloads
    formatted = []
    for n in notifications:
        sender_data = {
            "id": n.sender.id,
            "username": n.sender.username,
            "avatar_url": n.sender.avatar_url
        }
        post_data = {
            "id": n.post.id,
            "content": n.post.content
        } if n.post else None

        formatted.append({
            "id": n.id,
            "recipient_id": n.recipient_id,
            "sender_id": n.sender_id,
            "type": n.type,
            "post_id": n.post_id,
            "comment_id": n.comment_id,
            "is_read": n.is_read,
            "created_at": n.created_at,
            "sender": sender_data,
            "post": post_data
        })
    return formatted

@router.patch("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read."}

@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    if notif.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this notification.")

    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read."}
