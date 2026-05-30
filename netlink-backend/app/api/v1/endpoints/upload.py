import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.core.security import get_current_user
from app.db.models import User

router = APIRouter()

# Enforce uploads directory
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

# Magic bytes dictionary mappings
MAGIC_SIGNATURES = {
    "image/jpeg": "ffd8ff",
    "image/png": "89504e47",
    "image/gif": "47494638",
    "image/webp": "52494646",  # RIFF
    "video/mp4": "66747970",   # ftyp
    "video/webm": "1a45dfa3"   # EBML
}

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    content_type = file.content_type or ""
    is_image = content_type.startswith("image/")
    is_video = content_type.startswith("video/")

    if not is_image and not is_video:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only standard images and videos are allowed."
        )

    # 1. Read first 12 bytes for Magic Numbers check
    header_bytes = await file.read(12)
    # Reset stream cursor for saving
    await file.seek(0)
    
    hex_sig = header_bytes.hex()
    is_valid = False
    
    # Check signature matches
    expected_sig = MAGIC_SIGNATURES.get(content_type)
    if expected_sig:
        is_valid = hex_sig.startswith(expected_sig) or expected_sig in hex_sig
        
    # General fallback verification checks
    if not is_valid:
        if is_image:
            is_valid = hex_sig.startswith("ffd8ff") or hex_sig.startswith("89504e47")
        elif is_video:
            is_valid = "66747970" in hex_sig or hex_sig.startswith("1a45dfa3")

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Alert: File type mismatch. The uploaded file contents do not match its extension."
        )

    # 2. Check Size constraints (Read file contents to check size)
    # Note: Spooling to temporary file is done automatically by FastAPI, but we can verify size
    # by reading or checking headers if available, or reading in chunks.
    # To do this safely:
    size = 0
    max_size = (5 * 1024 * 1024) if is_image else (50 * 1024 * 1024) # 5MB vs 50MB
    
    chunk_size = 1024 * 1024 # 1MB chunks
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        size += len(chunk)
        if size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is too large. Maximum is {'5MB' if is_image else '50MB'}."
            )
            
    # Reset seek cursor
    await file.seek(0)

    # 3. Save File to local disk
    ext = os.path.splitext(file.filename or "")[1]
    unique_filename = f"upload-{uuid.uuid4()}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    media_type = "video" if is_video else "image"
    file_url = f"/uploads/{unique_filename}"

    return {
        "message": "File uploaded successfully.",
        "url": file_url,
        "mediaType": media_type
    }
