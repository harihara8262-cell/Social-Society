import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import jwt, JWTError

# DB imports
from app.db.database import engine, Base
from app.db.models import User

# Router imports
from app.api.v1.endpoints import auth, posts, links, comments, notifications, upload
from app.core.config import settings

# Service imports
from app.services.socket import socket_manager

# Initialize Database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Netlink Social API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware to append rate limit headers to responses
@app.middleware("http")
async def add_rate_limit_headers(request: Request, call_next):
    response = await call_next(request)
    if hasattr(request.state, "rate_limit_headers"):
        for header, value in request.state.rate_limit_headers.items():
            response.headers[header] = value
    return response

# Enforce uploads directory
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount Static Uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Mount Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(posts.router, prefix="/api/posts", tags=["Posts"])
app.include_router(links.router, prefix="/api/users", tags=["Users/Links"])
app.include_router(comments.router, prefix="/api", tags=["Comments"]) # /api/posts/{id}/comments and /api/comments/{id}
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(upload.router, prefix="/api/upload", tags=["Uploads"])

# --- WEBSOCKET HANDSHAKE ROUTE ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Retrieve token from cookie or query param
    token = websocket.cookies.get("session_token")
    if not token:
        # Fallback: query params
        token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=4001, reason="Unauthorized: Missing session token")
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("userId")
        if not user_id:
            await websocket.close(code=4001, reason="Unauthorized: Invalid token data")
            return
    except JWTError:
        await websocket.close(code=4002, reason="Unauthorized: Token expired")
        return

    # Connection accepted
    await socket_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # We can support ping/pong keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket, user_id)
    except Exception:
        socket_manager.disconnect(websocket, user_id)
