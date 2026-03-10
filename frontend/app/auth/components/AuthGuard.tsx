//frontend/app/auth/components/AuthGuard.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { AuthForm } from './AuthForm';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Mli l'page kat-chargi, kanchoufou wach kayn l'token f localStorage
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Affichage mnin kaykoun l'composant ba9i kay-9leb 3la l'token
  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff7900', fontSize: '20px' }}>
        Chargement...
      </div>
    );
  }

  // Ila makanch token, kan-beynou lih form dyal l'auth
  if (!isAuthenticated) {
    return <AuthForm onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Ila kan token mriguel, kan-kheliwh ychouf l'application (children)
  return <>{children}</>;
};