//frontend/app/auth/components/AuthForm.tsx
"use client";
import React, { useState } from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { AuthInput } from '../ui/AuthInput';

interface AuthFormProps {
  onLoginSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const url = `http://127.0.0.1:8100${endpoint}`;

      let options: RequestInit = {};

      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        };
      } else {
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        };
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la requête');
      }

      if (isLogin) {
        localStorage.setItem('token', data.access_token);
        onLoginSuccess(); // Hna kangoulou l'AuthGuard ra siyed t-logga b naja7
      } else {
        alert('Compte créé avec succès ! Connectez-vous maintenant.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title={isLogin ? "Bienvenue sur Kyntus" : "Créer un compte"} 
      subtitle={isLogin ? "Connectez-vous pour accéder à vos imports" : "Rejoignez-nous pour gérer vos factures"}
    >
      <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
        <AuthInput 
          label="Email" 
          type="email" 
          placeholder="exemple@kyntus.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <AuthInput 
          label="Mot de passe" 
          type="password" 
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center', marginTop: '10px' }}>{error}</p>}

        <button 
          type="submit" 
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#ff7900',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '15px'
          }}
        >
          {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
        </button>
      </form>

      <p className="auth-toggle-text">
        {isLogin ? "Vous n'avez pas de compte ? " : "Vous avez déjà un compte ? "}
        <button 
          type="button"
          className="auth-toggle-link"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
        >
          {isLogin ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </AuthLayout>
  );
};