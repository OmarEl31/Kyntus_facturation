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
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch('http://127.0.0.1:8100/api/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff7900', fontSize: '20px' }}>
        Chargement...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <>{children}</>;
};