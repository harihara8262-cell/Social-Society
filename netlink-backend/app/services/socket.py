from typing import Dict, List, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.db.models import Notification, User, Post

class ConnectionManager:
    def __init__(self):
        # Map user_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        # Send confirmation
        await websocket.send_json({"type": "CONNECTED", "message": "WebSocket connection established."})

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Connection might be dead, handled by disconnect
                    pass

socket_manager = ConnectionManager()

async def create_and_send_notification(
    db: Session,
    recipient_id: str,
    sender_id: str,
    notification_type: str, # "LIKE", "COMMENT", "FOLLOW"
    post_id: Optional[str] = None,
    comment_id: Optional[str] = None
):
    # Prevent self-notification
    if recipient_id == sender_id:
        return None

    # 1. Save to DB
    notif = Notification(
        recipient_id=recipient_id,
        sender_id=sender_id,
        type=notification_type,
        post_id=post_id,
        comment_id=comment_id
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # 2. Enrich response details for client rendering
    sender = db.query(User).filter(User.id == sender_id).first()
    post = db.query(Post).filter(Post.id == post_id).first() if post_id else None

    sender_data = {
        "id": sender.id if sender else "",
        "username": sender.username if sender else "anonymous",
        "avatar_url": sender.avatar_url if sender else None
    }

    post_data = {
        "id": post.id,
        "content": post.content
    } if post else None

    notif_payload = {
        "id": notif.id,
        "recipient_id": notif.recipient_id,
        "sender_id": notif.sender_id,
        "type": notif.type,
        "post_id": notif.post_id,
        "comment_id": notif.comment_id,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() + "Z",
        "sender": sender_data,
        "post": post_data
    }

    # 3. Dispatch in real-time
    await socket_manager.send_personal_message(
        {
            "type": "NOTIFICATION_RECEIVED",
            "data": notif_payload
        },
        recipient_id
    )

    return notif
