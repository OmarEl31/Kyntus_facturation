import React from 'react';
import './auth-layouts.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2 className="auth-title">{title}</h2>
        <p className="auth-subtitle">{subtitle}</p>
        
        {/* L'contenu dyal l'formulaire ghadi yji hna */}
        {children}

      </div>
    </div>
  );
};