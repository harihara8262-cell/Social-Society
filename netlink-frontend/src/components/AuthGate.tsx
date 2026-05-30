import React, { useState } from 'react';
import { useNet } from '../context/NetContext';
import { Shield, Sparkles, User, Mail, Lock } from 'lucide-react';

export const AuthGate: React.FC = () => {
  const { login, register } = useNet();
  const [isLogin, setIsLogin] = useState(true);
  
  // Registration States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: '#ff4e50' };
    if (score <= 4) return { score, label: 'Medium', color: '#f59e0b' };
    return { score, label: 'Strong', color: '#06b6d4' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        background: 'radial-gradient(circle at 50% 50%, #0c1020 0%, #05070d 100%)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '28px', textAlign: 'center' }}>
        <div style={{
          background: 'var(--primary-glow)',
          borderRadius: '50%',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#070a13',
          boxShadow: 'var(--shadow-glow)',
          width: '56px',
          height: '56px',
          marginBottom: '8px'
        }}>
          <Sparkles size={28} />
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'var(--font-heading)' }}>
          net<span className="gradient-text">link</span>
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
          Connect securely on a premium asynchronous ecosystem
        </p>
      </div>

      <div 
        className="auth-card"
        style={{ 
          maxWidth: '420px', 
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '24px', paddingBottom: '2px' }}>
          <button
            onClick={() => { setIsLogin(true); setError(null); setPassword(''); setConfirmPassword(''); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: isLogin ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '1rem',
              fontWeight: 600,
              padding: '10px 0',
              cursor: 'pointer',
              position: 'relative',
              transition: 'var(--transition-smooth)'
            }}
          >
            Sign In
            {isLogin && <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '2px', background: 'var(--primary-glow)' }} />}
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); setPassword(''); setConfirmPassword(''); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: !isLogin ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '1rem',
              fontWeight: 600,
              padding: '10px 0',
              cursor: 'pointer',
              position: 'relative',
              transition: 'var(--transition-smooth)'
            }}
          >
            Create Account
            {!isLogin && <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '2px', background: 'var(--primary-glow)' }} />}
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(255, 78, 80, 0.1)',
            border: '1px solid rgba(255, 78, 80, 0.2)',
            borderRadius: 'var(--radius-sm)',
            color: '#ff4e50',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Shield size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Username
              </label>
              <div className="auth-input-container">
                <User size={18} color="#64748b" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="choose_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <div className="auth-input-container">
              <Mail size={18} color="#64748b" style={{ marginRight: '12px', flexShrink: 0 }} />
              <input
                type="email"
                className="auth-input"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="auth-input-container">
              <Lock size={18} color="#64748b" style={{ marginRight: '12px', flexShrink: 0 }} />
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {!isLogin && password.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '-10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Password Strength:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strength.color }}>{strength.label}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(strength.score / 5) * 100}%`,
                  background: strength.color,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Confirm Password
              </label>
              <div className="auth-input-container">
                <Lock size={18} color="#64748b" style={{ marginRight: '12px', flexShrink: 0 }} />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'shimmer 1s linear infinite'
                }}
              />
            ) : (
              isLogin ? 'Sign In' : 'Register Profile'
            )}
          </button>
        </form>
      </div>
      
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Shield size={12} />
        Secured end-to-end sessions (cookie JWT)
      </p>
    </div>
  );
};
