import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({ label, ...props }) => {
  return (
    <div style={{ marginBottom: '15px', width: '100%' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
        {label}
      </label>
      <input
        {...props}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #ccc',
          fontSize: '16px',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
};