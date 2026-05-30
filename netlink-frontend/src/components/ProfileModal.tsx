import React, { useState } from 'react';
import { useNet } from '../context/NetContext';
import { FormInput } from './FormInput';
import { Button } from './Button';
import { X, Upload } from 'lucide-react';
import { apiRequest } from '../utils/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useNet();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(user?.cover_url || '');
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Avatar Builder states
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState('bottts');
  const [avatarSeed, setAvatarSeed] = useState(user?.username || 'netlink');
  const [avatarBgColor, setAvatarBgColor] = useState('transparent');

  const getUsernameCooldownDays = () => {
    if (!user || !user.last_username_change) return 0;
    const lastChange = new Date(user.last_username_change);
    const cooldownPeriod = 10 * 24 * 60 * 60 * 1000; // 10 days
    const diff = Date.now() - lastChange.getTime();
    if (diff < cooldownPeriod) {
      return Math.ceil((cooldownPeriod - diff) / (24 * 60 * 60 * 1000));
    }
    return 0;
  };

  const cooldownDays = getUsernameCooldownDays();

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = type === 'avatar' ? setUploadingAvatar : setUploadingCover;
    const setUrl = type === 'avatar' ? setAvatarUrl : setCoverUrl;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiRequest<{ url: string }>('/upload/', {
        method: 'POST',
        body: formData,
      });
      
      setUrl(response.url);
    } catch (err: any) {
      setError(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const updateData: any = {
      bio,
      avatar_url: avatarUrl || null,
      cover_url: coverUrl || null,
    };

    if (username.toLowerCase() !== user?.username) {
      if (cooldownDays > 0) {
        setError(`Username is on a cooldown. Try again in ${cooldownDays} days.`);
        setIsSaving(false);
        return;
      }
      updateData.username = username.toLowerCase();
    }

    try {
      await updateProfile(updateData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '28px',
          position: 'relative',
          boxShadow: 'var(--shadow-glow)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }} className="gradient-text">
          Edit Profile
        </h2>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(255, 78, 80, 0.1)', border: '1px solid rgba(255, 78, 80, 0.2)', borderRadius: 'var(--radius-sm)', color: '#ff4e50', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Username</label>
            <FormInput
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              disabled={cooldownDays > 0}
              style={{ marginBottom: '2px' }}
            />
            <span style={{ fontSize: '0.75rem', color: cooldownDays > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
              {cooldownDays > 0 
                ? `⚠️ Cooldown active: next change available in ${cooldownDays} days.` 
                : 'Info: You can change your username once every 10 days.'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the network about yourself..."
              maxLength={160}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'none',
                height: '80px',
                transition: 'var(--transition-smooth)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-cyan)';
                e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.target.style.backgroundColor = 'var(--bg-input)';
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {bio.length}/160 characters
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Avatar Image</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <FormInput
                type="text"
                placeholder="Avatar URL (or upload below)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <label
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'var(--transition-smooth)'
                }}
              >
                {uploadingAvatar ? '...' : <Upload size={16} />}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'avatar')}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            <button
              type="button"
              onClick={() => setShowAvatarBuilder(!showAvatarBuilder)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                padding: '4px 0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                width: 'fit-content'
              }}
            >
              🎨 {showAvatarBuilder ? 'Hide Custom Avatar Builder' : 'Design Custom Avatar Character'}
            </button>

            {showAvatarBuilder && (
              <div 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.06)', 
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginTop: '6px'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img
                    src={`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}${avatarBgColor !== 'transparent' ? `&backgroundColor=${avatarBgColor}` : ''}`}
                    alt="Character Design Preview"
                    style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%', 
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid var(--accent-cyan)',
                      padding: '2px'
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Character Seed</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={avatarSeed}
                        onChange={(e) => setAvatarSeed(e.target.value)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          color: '#fff',
                          fontSize: '0.85rem',
                          outline: 'none',
                          flex: 1
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                        style={{
                          background: 'rgba(6, 182, 212, 0.1)',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: 'var(--accent-cyan)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Dice 🎲
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Character Type</label>
                    <select
                      value={avatarStyle}
                      onChange={(e) => setAvatarStyle(e.target.value)}
                      style={{
                        background: '#090d16',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    >
                      <option value="bottts">Robots (Bottts)</option>
                      <option value="avataaars">Humans (Avataaars)</option>
                      <option value="lorelei">Cute Faces (Lorelei)</option>
                      <option value="pixel-art">Retro Pixel (Pixel Art)</option>
                      <option value="identicon">Abstract Shapes</option>
                      <option value="initials">Initials</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Background Fill</label>
                    <select
                      value={avatarBgColor}
                      onChange={(e) => setAvatarBgColor(e.target.value)}
                      style={{
                        background: '#090d16',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    >
                      <option value="transparent">Transparent</option>
                      <option value="b6e3f4">Sky Blue</option>
                      <option value="ffdfd3">Warm Peach</option>
                      <option value="d1c4e9">Soft Lavender</option>
                      <option value="c8e6c9">Mint Green</option>
                      <option value="ffcc80">Soft Orange</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const generatedUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}${avatarBgColor !== 'transparent' ? `&backgroundColor=${avatarBgColor}` : ''}`;
                    setAvatarUrl(generatedUrl);
                  }}
                  style={{
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  Apply Designed Avatar
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Cover Photo</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <FormInput
                type="text"
                placeholder="Cover URL (or upload below)"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <label
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'var(--transition-smooth)'
                }}
              >
                {uploadingCover ? '...' : <Upload size={16} />}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'cover')}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving || uploadingAvatar || uploadingCover}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
