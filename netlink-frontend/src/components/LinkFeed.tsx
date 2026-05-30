import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useNet } from '../context/NetContext';
import type { Post } from './NetCard';
import { NetCard } from './NetCard';
import { Button } from './Button';
import { GlassCard } from './GlassCard';
import { Image, Film, ArrowRight, X, Clock, Flame } from 'lucide-react';

interface LinkFeedProps {
  activeTag: string | null;
  onTagClear: () => void;
  onTagClick: (tag: string) => void;
  onUserClick: (username: string) => void;
}

export const LinkFeed: React.FC<LinkFeedProps> = ({
  activeTag,
  onTagClear,
  onTagClick,
  onUserClick,
}) => {
  const { user } = useNet();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState<'latest' | 'popular'>('latest');
  
  // Post Composer State
  const [composerText, setComposerText] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let endpoint = `/posts?sort=${sortType}`;
      if (activeTag) {
        endpoint += `&tag=${encodeURIComponent(activeTag)}`;
      }
      const response = await apiRequest<Post[]>(endpoint);
      setPosts(response);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [sortType, activeTag]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiRequest<{ url: string; mediaType: 'image' | 'video' }>('/upload/', {
        method: 'POST',
        body: formData,
      });

      setMediaUrl(response.url);
      setMediaType(response.mediaType);
    } catch (error: any) {
      alert(error.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest<{ post: Post }>('/posts/', {
        method: 'POST',
        body: JSON.stringify({
          content: composerText,
          media_url: mediaUrl,
          media_type: mediaType,
        }),
      });

      // Prepend the new post directly
      // In FastAPI we formatted the create response matching the PostResponse schema directly
      // but under key/root. Let's merge properly.
      const newPost = (response as any).post || response;
      setPosts((prev) => [newPost, ...prev]);
      
      setComposerText('');
      setMediaUrl(null);
      setMediaType(null);
    } catch (error: any) {
      alert(error.message || 'Failed to create post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const removeMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {user && (
        <GlassCard style={{ padding: '24px' }}>
          <form onSubmit={handleCreatePost}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <img
                src={user.avatar_url ? `http://localhost:5000${user.avatar_url}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.username}
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Share something with the network... use #hashtags or @mentions"
                  maxLength={1000}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '1.05rem',
                    resize: 'none',
                    minHeight: '80px',
                    lineHeight: '1.5'
                  }}
                />
                
                {mediaUrl && (
                  <div style={{ position: 'relative', marginTop: '12px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', maxWidth: '300px' }}>
                    <button
                      type="button"
                      onClick={removeMedia}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}
                    >
                      <X size={14} />
                    </button>
                    {mediaType === 'video' ? (
                      <video src={`http://localhost:5000${mediaUrl}`} style={{ width: '100%', display: 'block' }} />
                    ) : (
                      <img src={`http://localhost:5000${mediaUrl}`} alt="Composer Attachment" style={{ width: '100%', display: 'block' }} />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <Image size={16} color="var(--accent-color)" />
                  Photo
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', transition: 'var(--transition-smooth)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <Film size={16} color="var(--accent-pink)" />
                  Video
                  <input type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              <Button type="submit" variant="primary" disabled={!composerText.trim() || isSubmitting || uploading}>
                {uploading ? 'Uploading...' : 'Publish'}
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '30px', padding: '4px' }}>
          <button
            onClick={() => setSortType('latest')}
            style={{
              background: sortType === 'latest' ? 'var(--primary-glow)' : 'transparent',
              color: sortType === 'latest' ? '#070a13' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'var(--transition-smooth)'
            }}
          >
            <Clock size={14} />
            Latest
          </button>
          <button
            onClick={() => setSortType('popular')}
            style={{
              background: sortType === 'popular' ? 'var(--primary-glow)' : 'transparent',
              color: sortType === 'popular' ? '#070a13' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'var(--transition-smooth)'
            }}
          >
            <Flame size={14} />
            Popular
          </button>
        </div>

        {activeTag && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '6px 14px', borderRadius: '30px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>#{activeTag}</span>
            <button onClick={onTagClear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[1, 2, 3].map((n) => (
            <GlassCard key={n} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                <div className="skeleton-loading" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-loading" style={{ height: '14px', width: '30%', borderRadius: '4px', marginBottom: '6px' }} />
                  <div className="skeleton-loading" style={{ height: '10px', width: '15%', borderRadius: '4px' }} />
                </div>
              </div>
              <div className="skeleton-loading" style={{ height: '16px', width: '90%', borderRadius: '4px', marginBottom: '8px' }} />
              <div className="skeleton-loading" style={{ height: '16px', width: '70%', borderRadius: '4px', marginBottom: '16px' }} />
              <div className="skeleton-loading" style={{ height: '200px', width: '100%', borderRadius: 'var(--radius-md)' }} />
            </GlassCard>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <GlassCard style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No posts found in the stream.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>Be the first to publish your thoughts!</p>
        </GlassCard>
      ) : (
        posts.map((post) => (
          <NetCard
            key={post.id}
            post={post}
            onDelete={handleDeletePost}
            onTagClick={onTagClick}
            onUserClick={onUserClick}
          />
        ))
      )}
    </div>
  );
};
