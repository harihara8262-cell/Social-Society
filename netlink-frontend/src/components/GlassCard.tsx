import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  glow = false,
  ...props 
}) => {
  const glowStyle = glow ? { boxShadow: 'var(--shadow-glow)', border: '1px solid var(--border-glow)' } : {};

  return (
    <div 
      className={`glass-panel ${className}`} 
      style={{
        padding: '20px',
        ...glowStyle
      }}
      {...props}
    >
      {children}
    </div>
  );
};
