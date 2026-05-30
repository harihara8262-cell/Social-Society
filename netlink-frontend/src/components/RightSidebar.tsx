import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { GlassCard } from './GlassCard';
import { TrendingUp } from 'lucide-react';

interface RightSidebarProps {
  onTagClick: (tag: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  onTagClick,
}) => {
  const [trending, setTrending] = useState<{ name: string; count: number }[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await apiRequest<{ trending: { name: string; count: number }[] }>('/posts/trending');
        setTrending(response.trending);
      } catch (error) {
        console.error('Failed to fetch trending tags:', error);
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GlassCard style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} className="gradient-text" />
          Trending Topics
        </h3>

        {loadingTrending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((n) => (
              <div key={n}>
                <div className="skeleton-loading" style={{ height: '14px', width: '60%', borderRadius: '4px', marginBottom: '4px' }} />
                <div className="skeleton-loading" style={{ height: '10px', width: '25%', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No topics trending today.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {trending.map((tag) => (
              <div
                key={tag.name}
                onClick={() => onTagClick(tag.name)}
                style={{ cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                onMouseEnter={(e) => {
                  const title = e.currentTarget.querySelector('h4') as HTMLElement;
                  if (title) title.style.color = 'var(--accent-color)';
                }}
                onMouseLeave={(e) => {
                  const title = e.currentTarget.querySelector('h4') as HTMLElement;
                  if (title) title.style.color = 'var(--text-primary)';
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  #{tag.name}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {tag.count} posts in 24h
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

    </div>
  );
};
