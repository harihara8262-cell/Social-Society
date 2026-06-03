import React, { useState } from 'react';
import { apiRequest } from '../utils/api';
import { useNet } from '../context/NetContext';
import { Button } from './Button';
import { MessageSquare, Trash2 } from 'lucide-react';

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  replies: Comment[];
}

interface CommentTreeProps {
  postId: string;
  initialComments: Comment[];
  onCommentCountChange: (count: number) => void;
}

export const CommentTree: React.FC<CommentTreeProps> = ({
  postId,
  initialComments,
  onCommentCountChange,
}) => {
  const { user } = useNet();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countTotalComments = (list: Comment[]): number => {
    let total = list.length;
    list.forEach((c) => {
      if (c.replies && c.replies.length > 0) {
        total += countTotalComments(c.replies);
      }
    });
    return total;
  };

  const handleAddRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newCommentText }),
      });

      const updatedComments = [...comments, response];
      setComments(updatedComments);
      setNewCommentText('');
      onCommentCountChange(countTotalComments(updatedComments));
    } catch (error) {
      alert('Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: replyText, parent_id: parentId }),
      });

      const insertReply = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), response],
            };
          } else if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: insertReply(c.replies),
            };
          }
          return c;
        });
      };

      const updatedComments = insertReply(comments);
      setComments(updatedComments);
      setReplyText('');
      setReplyTarget(null);
      onCommentCountChange(countTotalComments(updatedComments));
    } catch (error) {
      alert('Failed to post reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await apiRequest(`/comments/${commentId}`, { method: 'DELETE' });

      const filterComment = (list: Comment[]): Comment[] => {
        return list
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies ? filterComment(c.replies) : [],
          }));
      };

      const updatedComments = filterComment(comments);
      setComments(updatedComments);
      onCommentCountChange(countTotalComments(updatedComments));
    } catch (error) {
      alert('Failed to delete comment.');
    }
  };

  const CommentNode: React.FC<{ comment: Comment; depth: number }> = ({ comment, depth }) => {
    const isOwner = user?.id === comment.author_id;
    const isReplying = replyTarget === comment.id;

    return (
      <div 
        style={{
          marginTop: '12px',
          borderLeft: depth > 0 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          paddingLeft: depth > 0 ? '14px' : '0',
          position: 'relative'
        }}
      >
        <div 
          style={{ 
            background: 'rgba(255, 255, 255, 0.01)', 
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={comment.author.avatar_url ? comment.author.avatar_url : `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.author.username}`}
                alt={comment.author.username}
                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                @{comment.author.username}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            {isOwner && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ff4e50'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '4px 0' }}>
            {comment.content}
          </p>

          {user && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <button
                onClick={() => {
                  setReplyTarget(isReplying ? null : comment.id);
                  setReplyText('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <MessageSquare size={12} />
                Reply
              </button>
            </div>
          )}

          {isReplying && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                placeholder={`Reply to @${comment.author.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <Button 
                variant="primary" 
                onClick={() => handleAddReply(comment.id)} 
                disabled={!replyText.trim()}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Send
              </Button>
            </div>
          )}
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginLeft: '8px' }}>
            {comment.replies.map((reply) => (
              <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
      <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <MessageSquare size={16} />
        Comments ({countTotalComments(comments)})
      </h4>

      {user ? (
        <form onSubmit={handleAddRootComment} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Write a comment..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 16px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <Button type="submit" variant="primary" disabled={!newCommentText.trim() || isSubmitting}>
            Post
          </Button>
        </form>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Please log in to leave a comment.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {comments.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
            No comments yet. Be the first to join the conversation!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentNode key={comment.id} comment={comment} depth={0} />
          ))
        )}
      </div>
    </div>
  );
};
