import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginBottom: '14px' }}>
      {label && (
        <label 
          style={{ 
            fontSize: '0.85rem', 
            fontWeight: 500, 
            color: 'var(--text-secondary)',
            letterSpacing: '0.02em'
          }}
        >
          {label}
        </label>
      )}
      <input
        className={className}
        style={{
          backgroundColor: 'var(--bg-input)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          outline: 'none',
          transition: 'var(--transition-smooth)',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
          width: '100%'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent-cyan)';
          e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
          e.target.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          e.target.style.backgroundColor = 'var(--bg-input)';
          e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ff4e50', marginTop: '2px', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
};
