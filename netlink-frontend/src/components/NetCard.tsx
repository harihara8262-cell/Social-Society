import React, { useState } from 'react';
import { apiRequest } from '../utils/api';
import { useNet } from '../context/NetContext';
import { GlassCard } from './GlassCard';
import type { Comment } from './CommentTree';
import { CommentTree } from './CommentTree';
import { Heart, MessageCircle, Trash2, Video, Image as ImageIcon } from 'lucide-react';

export interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  tags: string[];
}

interface NetCardProps {
  post: Post;
  onDelete?: (id: string) => void;
  onTagClick?: (tag: string) => void;
  onUserClick?: (username: string) => void;
}

export const NetCard: React.FC<NetCardProps> = ({
  post: initialPost,
  onDelete,
  onTagClick,
  onUserClick,
}) => {
  const { user } = useNet();
  const [post, setPost] = useState<Post>(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [pulseHeart, setPulseHeart] = useState(false);

  const isOwner = user?.id === post.author.id;

  const handleLike = async () => {
    if (!user || isLiking) return;

    // Optimistic UI update
    const nextIsLiked = !post.is_liked;
    const nextLikesCount = nextIsLiked ? post.likes_count + 1 : post.likes_count - 1;
    
    setPost((prev) => ({
      ...prev,
      is_liked: nextIsLiked,
      likes_count: nextLikesCount,
    }));
    
    if (nextIsLiked) {
      setPulseHeart(true);
      setTimeout(() => setPulseHeart(false), 450);
    }

    setIsLiking(true);
    try {
      const response = await apiRequest<{ liked: boolean }>(`/posts/${post.id}/like`, {
        method: 'POST',
      });
      setPost((prev) => ({
        ...prev,
        is_liked: response.liked,
      }));
    } catch (error) {
      // Revert optimistic updates
      setPost((prev) => ({
        ...prev,
        is_liked: !nextIsLiked,
        likes_count: post.likes_count,
      }));
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);

    if (nextShow && comments.length === 0) {
      setLoadingComments(true);
      try {
        const response = await apiRequest<Comment[]>(`/posts/${post.id}/comments`);
        setComments(response);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await apiRequest(`/posts/${post.id}`, { method: 'DELETE' });
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (error) {
      alert('Failed to delete post.');
    }
  };

  const renderParsedContent = (content: string) => {
    const regex = /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g;
    const parts = content.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const tagName = part.substring(1);
        return (
          <span
            key={index}
            onClick={() => onTagClick?.(tagName)}
            style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {part}
          </span>
        );
      } else if (part.startsWith('@')) {
        const username = part.substring(1);
        return (
          <span
            key={index}
            onClick={() => onUserClick?.(username)}
            style={{ color: 'var(--accent-pink)', cursor: 'pointer', fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <GlassCard className="animate-fade-in" style={{ marginBottom: '20px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={post.author.avatar_url ? post.author.avatar_url : `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author.username}`}
            alt={post.author.username}
            onClick={() => onUserClick?.(post.author.username)}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          />
          <div>
            <h3 
              onClick={() => onUserClick?.(post.author.username)}
              style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              @{post.author.username}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={handleDelete}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-pink)';
              e.currentTarget.style.background = 'rgba(255, 78, 80, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
        {renderParsedContent(post.content)}
      </p>

      {post.media_url && (
        <div 
          style={{ 
            borderRadius: 'var(--radius-md)', 
            overflow: 'hidden', 
            position: 'relative', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)',
            marginBottom: '16px',
            maxHeight: '400px'
          }}
        >
          {mediaLoading && (
            <div 
              className="skeleton-loading" 
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {post.media_type === 'video' ? <Video size={36} color="var(--text-muted)" /> : <ImageIcon size={36} color="var(--text-muted)" />}
            </div>
          )}

          {post.media_type === 'video' ? (
            <video
              src={post.media_url}
              controls
              onLoadedData={() => setMediaLoading(false)}
              style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: mediaLoading ? 'none' : 'block' }}
            />
          ) : (
            <img
              src={post.media_url}
              alt="Uploaded attachment"
              onLoad={() => setMediaLoading(false)}
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: mediaLoading ? 'none' : 'block' }}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
        <button
          onClick={handleLike}
          disabled={!user}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: post.is_liked ? 'var(--accent-pink)' : 'var(--text-secondary)',
            cursor: user ? 'pointer' : 'default',
            fontSize: '0.9rem',
            fontWeight: 500,
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => {
            if (user && !post.is_liked) e.currentTarget.style.color = 'var(--accent-pink)';
          }}
          onMouseLeave={(e) => {
            if (user && !post.is_liked) e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Heart
            size={18}
            className={pulseHeart ? 'animate-pulse' : ''}
            fill={post.is_liked ? 'var(--accent-pink)' : 'none'}
            style={{ transition: 'fill 0.2s' }}
          />
          {post.likes_count}
        </button>

        <button
          onClick={handleToggleComments}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: showComments ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => {
            if (!showComments) e.currentTarget.style.color = 'var(--accent-color)';
          }}
          onMouseLeave={(e) => {
            if (!showComments) e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <MessageCircle size={18} />
          {post.comments_count}
        </button>
      </div>

      {showComments && (
        <>
          {loadingComments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <span className="skeleton-loading" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            </div>
          ) : (
            <CommentTree
              postId={post.id}
              initialComments={comments}
              onCommentCountChange={(newCount) => {
                setPost((prev) => ({ ...prev, comments_count: newCount }));
              }}
            />
          )}
        </>
      )}
    </GlassCard>
  );
};
