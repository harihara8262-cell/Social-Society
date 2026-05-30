import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useNet } from '../context/NetContext';
import type { Post } from './NetCard';
import { NetCard } from './NetCard';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { ProfileModal } from './ProfileModal';
import { Edit3, UserCheck, UserPlus, Grid, Calendar } from 'lucide-react';

interface ProfileUser {
  id: string;
  username: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  is_mutual_follow: boolean;
}

interface ProfileGlassProps {
  username: string;
  onTagClick: (tag: string) => void;
  onUserClick: (username: string) => void;
}

export const ProfileGlass: React.FC<ProfileGlassProps> = ({
  username,
  onTagClick,
  onUserClick,
}) => {
  const { user: currentUser } = useNet();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowMutating, setIsFollowMutating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isSelf = currentUser?.username === username.toLowerCase();

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await apiRequest<ProfileUser>(`/users/profile/${username}`);
      setProfile(data);
      setIsFollowingState(data.is_following);
      setFollowersCount(data.followers_count);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await apiRequest<Post[]>(`/posts?author=${username}`);
      setPosts(data);
    } catch (error) {
      console.error('Failed to load user posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, [username, currentUser]);

  const handleFollow = async () => {
    if (!profile || !currentUser || isFollowMutating) return;

    // Optimistic UI update
    const nextIsFollowing = !isFollowingState;
    const nextFollowersCount = nextIsFollowing ? followersCount + 1 : followersCount - 1;
    
    setIsFollowingState(nextIsFollowing);
    setFollowersCount(nextFollowersCount);
    setIsFollowMutating(true);

    try {
      const response = await apiRequest<{ following: boolean }>(`/users/${profile.id}/follow`, {
        method: 'POST',
      });
      setIsFollowingState(response.following);
    } catch (error) {
      // Revert optimistic updates
      setIsFollowingState(!nextIsFollowing);
      setFollowersCount(followersCount);
    } finally {
      setIsFollowMutating(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <GlassCard>
          <div className="skeleton-loading" style={{ height: '160px', width: '100%', borderRadius: 'var(--radius-sm)', marginBottom: '40px' }} />
          <div style={{ padding: '0 20px 20px 20px' }}>
            <div className="skeleton-loading" style={{ width: '80px', height: '80px', borderRadius: '50%', marginTop: '-80px', border: '4px solid var(--bg-secondary)', marginBottom: '16px' }} />
            <div className="skeleton-loading" style={{ height: '20px', width: '40%', borderRadius: '4px', marginBottom: '8px' }} />
            <div className="skeleton-loading" style={{ height: '12px', width: '20%', borderRadius: '4px', marginBottom: '16px' }} />
            <div className="skeleton-loading" style={{ height: '40px', width: '100%', borderRadius: '4px' }} />
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!profile) {
    return (
      <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
        <h3 style={{ color: '#ff4e50' }}>Profile Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The user @{username} does not exist in the network.</p>
      </GlassCard>
    );
  }

  const coverStyle: React.CSSProperties = {
    height: '160px',
    width: '100%',
    backgroundImage: profile.cover_url 
      ? `url(http://localhost:5000${profile.cover_url})`
      : 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
    position: 'relative'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={coverStyle}>
          {profile.is_mutual_follow && (
            <span style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0, 242, 254, 0.15)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: 'var(--accent-color)',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '20px',
              backdropFilter: 'blur(4px)'
            }}>
              Mutual Connection
            </span>
          )}
        </div>

        <div style={{ padding: '0 24px 24px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-45px', marginBottom: '16px' }}>
            <img
              src={profile.avatar_url ? `http://localhost:5000${profile.avatar_url}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
              alt={profile.username}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--bg-secondary)',
                boxShadow: 'var(--shadow-card)',
                background: 'var(--bg-secondary)'
              }}
            />

            {isSelf ? (
              <Button variant="secondary" onClick={() => setIsEditOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={16} />
                Edit Profile
              </Button>
            ) : (
              currentUser && (
                <Button
                  variant={isFollowingState ? 'secondary' : 'primary'}
                  onClick={handleFollow}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isFollowingState ? (
                    <>
                      <UserCheck size={16} />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Follow
                    </>
                  )}
                </Button>
              )
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>@{profile.username}</h2>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>

            {profile.bio ? (
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                {profile.bio}
              </p>
            ) : (
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '16px' }}>
                No bio provided yet.
              </p>
            )}

            <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{profile.posts_count}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px' }}>posts</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{followersCount}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px' }}>followers</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{profile.following_count}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px' }}>following</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Grid size={18} />
          User Posts
        </h3>

        {loadingPosts ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[1, 2].map((n) => (
              <GlassCard key={n} style={{ padding: '24px' }}>
                <div className="skeleton-loading" style={{ height: '14px', width: '30%', borderRadius: '4px', marginBottom: '8px' }} />
                <div className="skeleton-loading" style={{ height: '10px', width: '15%', borderRadius: '4px', marginBottom: '16px' }} />
                <div className="skeleton-loading" style={{ height: '120px', width: '100%', borderRadius: 'var(--radius-sm)' }} />
              </GlassCard>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <GlassCard style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No posts shared by this user yet.
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

      <ProfileModal isOpen={isEditOpen} onClose={() => {
        setIsEditOpen(false);
        fetchProfile(); // reload metrics
      }} />

    </div>
  );
};
