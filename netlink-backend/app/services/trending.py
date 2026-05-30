import re
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Post, PostTag, Tag

# In-memory Cache for trending hashtags
# { "data": [...], "expiry": float }
_trending_cache: Dict[str, Any] = {"data": None, "expiry": 0.0}
CACHE_TTL = 900.0  # 15 minutes

def parse_hashtags(content: str) -> List[str]:
    matches = re.findall(r"#([a-zA-Z0-9_]+)", content)
    # Deduplicate and lowercase
    return list(set(tag.lower() for tag in matches))

def parse_mentions(content: str) -> List[str]:
    matches = re.findall(r"@([a-zA-Z0-9_]+)", content)
    # Deduplicate
    return list(set(matches))

def calculate_trending(db: Session) -> List[Dict[str, Any]]:
    global _trending_cache
    now_ts = time.time()
    
    # Return cache if valid
    if _trending_cache["data"] is not None and now_ts < _trending_cache["expiry"]:
        return _trending_cache["data"]
        
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    
    # Query posts in the last 24 hours
    posts = db.query(Post).filter(Post.created_at >= twenty_four_hours_ago).all()
    
    tag_scores: Dict[str, Dict[str, Any]] = {}
    now_dt = datetime.utcnow()
    
    for post in posts:
        # Calculate time age in hours
        age_hours = (now_dt - post.created_at).total_seconds() / 3600.0
        # Time-decay score formula
        score = 1.0 / ((age_hours + 2.0) ** 1.8)
        
        # Resolve associated tags
        # Using SQLAlchemy relationship lookup
        post_tags = db.query(PostTag).filter(PostTag.post_id == post.id).all()
        for pt in post_tags:
            tag = db.query(Tag).filter(Tag.id == pt.tag_id).first()
            if not tag:
                continue
            if tag.name not in tag_scores:
                tag_scores[tag.name] = {"score": 0.0, "count": 0}
            tag_scores[tag.name]["score"] += score
            tag_scores[tag.name]["count"] += 1
            
    # Format and sort
    trending_list = [
        {"name": name, "score": stats["score"], "count": stats["count"]}
        for name, stats in tag_scores.items()
    ]
    trending_list.sort(key=lambda x: x["score"], reverse=True)
    trending_list = trending_list[:10]  # top 10
    
    # Update cache
    _trending_cache["data"] = trending_list
    _trending_cache["expiry"] = now_ts + CACHE_TTL
    
    return trending_list
