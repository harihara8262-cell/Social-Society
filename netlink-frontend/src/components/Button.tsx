import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
  isLoading?: boolean;
  width?: string | number;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  isLoading = false,
  style = {},
  width,
  ...props
}) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 24px',
      borderRadius: 'var(--radius-sm)',
      fontWeight: 600,
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'var(--transition-smooth)',
      border: 'none',
      outline: 'none',
      width: width || 'auto'
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          background: 'var(--primary-glow)',
          color: '#070a13',
          boxShadow: 'var(--shadow-glow)'
        };
      case 'secondary':
        return {
          ...base,
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-primary)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        };
      case 'danger':
        return {
          ...base,
          background: 'rgba(255, 78, 80, 0.15)',
          color: '#ff4e50',
          border: '1px solid rgba(255, 78, 80, 0.3)'
        };
      case 'ghost':
        return {
          ...base,
          background: 'transparent',
          color: 'var(--text-secondary)'
        };
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    if (props.disabled || isLoading) return;
    
    target.style.transform = 'translateY(-2px)';
    if (variant === 'primary') {
      target.style.boxShadow = '0 0 25px rgba(0, 242, 254, 0.3)';
    } else if (variant === 'secondary') {
      target.style.background = 'rgba(255, 255, 255, 0.08)';
      target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    } else if (variant === 'danger') {
      target.style.background = 'rgba(255, 78, 80, 0.25)';
      target.style.borderColor = 'rgba(255, 78, 80, 0.5)';
    } else if (variant === 'ghost') {
      target.style.color = 'var(--text-primary)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    target.style.transform = 'translateY(0)';
    if (variant === 'primary') {
      target.style.boxShadow = 'var(--shadow-glow)';
    } else if (variant === 'secondary') {
      target.style.background = 'rgba(255, 255, 255, 0.05)';
      target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    } else if (variant === 'danger') {
      target.style.background = 'rgba(255, 78, 80, 0.15)';
      target.style.borderColor = 'rgba(255, 78, 80, 0.3)';
    } else if (variant === 'ghost') {
      target.style.color = 'var(--text-secondary)';
    }
  };

  return (
    <button
      style={{ ...getStyles(), ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={props.disabled || isLoading}
      {...props}
    >
      {isLoading ? (
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
        children
      )}
    </button>
  );
};
