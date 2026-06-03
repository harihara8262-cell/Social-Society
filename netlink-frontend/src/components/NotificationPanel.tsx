import React from 'react';
import { useNet } from '../context/NetContext';
import { GlassCard } from './GlassCard';
import { Heart, MessageSquare, UserPlus, Bell, CheckCircle } from 'lucide-react';

export const ToastOverlay: React.FC = () => {
  const { toasts, removeToast } = useNet();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        width: '100%'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass-panel"
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fade-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            cursor: 'pointer'
          }}
          onClick={() => removeToast(toast.id)}
        >
          <div style={{
            background: 'rgba(0, 242, 254, 0.1)',
            borderRadius: '50%',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-color)'
          }}>
            {toast.type === 'LIKE' && <Heart size={16} fill="currentColor" />}
            {toast.type === 'COMMENT' && <MessageSquare size={16} />}
            {toast.type === 'FOLLOW' && <UserPlus size={16} />}
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>@{toast.username}</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const NotificationPanel: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNet();

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE':
        return <Heart size={16} color="var(--accent-pink)" fill="var(--accent-pink)" />;
      case 'COMMENT':
        return <MessageSquare size={16} color="var(--accent-color)" />;
      case 'FOLLOW':
        return <UserPlus size={16} color="#c084fc" />;
      default:
        return <Bell size={16} />;
    }
  };

  return (
    <GlassCard style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} className="gradient-text" />
          Notifications
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--primary-glow)',
              color: '#070a13',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              {unreadCount}
            </span>
          )}
        </h3>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCircle size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.85rem' }}>Your notification feed is empty.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                background: notif.is_read ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                border: '1px solid',
                borderColor: notif.is_read ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 242, 254, 0.1)',
                cursor: notif.is_read ? 'default' : 'pointer',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => {
                if (!notif.is_read) e.currentTarget.style.background = 'rgba(0, 242, 254, 0.03)';
              }}
              onMouseLeave={(e) => {
                if (!notif.is_read) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              }}
            >
              <img
                src={notif.sender.avatar_url ? notif.sender.avatar_url : `https://api.dicebear.com/7.x/bottts/svg?seed=${notif.sender.username}`}
                alt={notif.sender.username}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>@{notif.sender.username}</strong>{' '}
                  {notif.type === 'LIKE' && 'liked your post'}
                  {notif.type === 'COMMENT' && (notif.comment_id ? 'replied to your comment' : 'commented on your post')}
                  {notif.type === 'FOLLOW' && 'started following you'}
                </p>
                
                {notif.post && (
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '4px',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    "{notif.post.content}"
                  </p>
                )}

                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  {new Date(notif.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {getIcon(notif.type)}
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
};
