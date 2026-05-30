import React, { useState, useEffect } from 'react';
import { useNet } from './context/NetContext';
import { LinkFeed } from './components/LinkFeed';
import { ProfileGlass } from './components/ProfileGlass';
import { RightSidebar } from './components/RightSidebar';
import { NotificationPanel, ToastOverlay } from './components/NotificationPanel';
import { GlassCard } from './components/GlassCard';
import { Button } from './components/Button';
import { AuthGate } from './components/AuthGate';
import { Home, User, Bell, LogOut } from 'lucide-react';
import { apiRequest } from './utils/api';

const AppContent: React.FC = () => {
  const { user, logout, unreadCount } = useNet();
  
  // Navigation states
  const [view, setView] = useState<'home' | 'profile'>('home');
  const [activeUser, setActiveUser] = useState<string | null>(null);
  
  // Feed filters
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showRightNotifs, setShowRightNotifs] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  // Search debounce effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiRequest<any[]>(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleGoHome = () => {
    setView('home');
    setActiveUser(null);
    setActiveTag(null);
  };

  const handleViewProfile = (username: string) => {
    setActiveUser(username);
    setView('profile');
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    setView('home');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <ToastOverlay />

      {/* ================= FIXED TOP NAVBAR ================= */}
      <nav className="navbar">
        <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); handleGoHome(); }}>
          net<span>link</span>
        </a>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="search-bar"
            placeholder="Search network users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.trim() && (
            <div style={{
              position: 'absolute',
              top: '48px',
              left: 0,
              right: 0,
              background: 'rgba(9, 13, 22, 0.95)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '8px',
              zIndex: 1001,
              backdropFilter: 'var(--glass-blur)'
            }}>
              {searching ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>Searching...</p>
              ) : searchResults.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>No users found</p>
              ) : (
                searchResults.map((usr) => (
                  <div
                    key={usr.id}
                    onClick={() => {
                      handleViewProfile(usr.username);
                      setSearchQuery('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <img
                      src={usr.avatar_url ? `http://localhost:5000${usr.avatar_url}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${usr.username}`}
                      alt={usr.username}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>@{usr.username}</h4>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="nav-links">
          <a href="#" className={view === 'home' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleGoHome(); }}>Feed</a>
          {user && (
            <a href="#" className={view === 'profile' && activeUser === user.username ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleViewProfile(user.username); }}>
              Profile
            </a>
          )}
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Logout</a>
        </div>
      </nav>

      <div className="app-container">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '94px', height: 'fit-content' }}>
          <GlassCard style={{ padding: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              
              <button
                onClick={handleGoHome}
                style={{
                  background: view === 'home' ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: 'none',
                  color: view === 'home' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Home size={18} />
                Network Feed
              </button>

              {user && (
                <button
                  onClick={() => handleViewProfile(user.username)}
                  style={{
                    background: view === 'profile' && activeUser === user.username ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none',
                    color: view === 'profile' && activeUser === user.username ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textAlign: 'left',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <User size={18} />
                  My Profile
                </button>
              )}

              <button
                onClick={() => setShowRightNotifs(!showRightNotifs)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: showRightNotifs ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'red'
                    }} />
                  )}
                </div>
                Alerts Center
              </button>
            </div>
          </GlassCard>

          {user && (
            <GlassCard style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <img
                  src={user.avatar_url ? `http://localhost:5000${user.avatar_url}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.username}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{user.username}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                </div>
              </div>
              <Button
                variant="danger"
                onClick={logout}
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LogOut size={14} />
                Logout Session
              </Button>
            </GlassCard>
          )}
        </div>

        {/* ================= CENTER STREAM ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {view === 'home' ? (
            <LinkFeed
              activeTag={activeTag}
              onTagClear={() => setActiveTag(null)}
              onTagClick={handleTagClick}
              onUserClick={handleViewProfile}
            />
          ) : (
            activeUser && (
              <ProfileGlass
                username={activeUser}
                onTagClick={handleTagClick}
                onUserClick={handleViewProfile}
              />
            )
          )}
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <div className="app-sidebar-right" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '94px', height: 'fit-content' }}>
          <RightSidebar
            onTagClick={handleTagClick}
          />

          {user && showRightNotifs && (
            <div className="animate-fade-in">
              <NotificationPanel />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useNet();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#070a13',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--accent-color)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'shimmer 1.2s linear infinite'
        }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Accessing Netlink ecosystem...</p>
      </div>
    );
  }

  return isAuthenticated ? <AppContent /> : <AuthGate />;
};
export default App;
