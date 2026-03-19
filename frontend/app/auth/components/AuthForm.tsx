"use client";
import React, { useState } from "react";
import Image from 'next/image';
import { AuthInput } from "../ui/AuthInput";

import kyntusLogo from "../../../logo/Presentation1.png";

interface AuthFormProps {
  onLoginSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8100";
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password: password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Identifiants incorrects");

      localStorage.setItem("token", data.access_token);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        html, body, #__next {
          margin: 0 !important;
          padding: 0 !important;
          height: 100% !important;
          width: 100% !important;
        }
      `}</style>

      <div className="full-page">
        <div className="login-card">

          {/* ── Logo centré ── */}
          <div className="logo-section">
            <div className="logo-image-wrapper">
              <Image
                src={kyntusLogo}
                alt="Kyntus Logo"
                priority
                width={180}
                height={80}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p className="logo-slogan">AU CŒUR DE VOS RÉSEAUX</p>
          </div>

          {/* ── Titre ── */}
          <div className="text-header">
            <h1 className="form-title">Connexion</h1>
            <p className="form-subtitle">Accédez à votre interface de gestion</p>
          </div>

          {/* ── Formulaire ── */}
          <form onSubmit={handleSubmit} className="auth-form-body">
            <div className="input-group">
              <label className="input-label">Email</label>
              <AuthInput
                type="email"
                placeholder="nom@kyntus.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Mot de passe</label>
              <AuthInput
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="error-banner">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="submit-button">
              {loading ? <span className="spinner" /> : "Se connecter"}
            </button>

            <p className="footer-support">
              Besoin d'aide ?{" "}
              <a href="mailto:omar.elmahi@kyntus.com">Contactez-nous</a>
            </p>
          </form>
        </div>
      </div>

      <style jsx>{`
        .full-page {
          position: fixed;
          inset: 0;
          background: #eef2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
        }

        .login-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow:
            0 30px 60px -12px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(0, 0, 0, 0.04);
          width: 100%;
          max-width: 540px;
          padding: 3rem 4rem;
          box-sizing: border-box;
        }

        /* ── Logo : flex colonne pour centrage garanti ── */
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;      /* centre horizontalement */
          justify-content: center;
          margin-bottom: 2rem;
        }

        .logo-image-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;             /* prend toute la largeur de la carte */
        }

        .logo-slogan {
          margin-top: 0.6rem;
          font-size: 0.65rem;
          color: #94a3b8;
          letter-spacing: 0.18em;
          font-weight: 700;
          text-transform: uppercase;
          text-align: center;
        }

        .text-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .form-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 0.4rem;
        }

        .auth-form-body {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .input-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .error-banner {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.82rem;
          border: 1px solid #fee2e2;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .submit-button {
          width: 100%;
          padding: 0.9rem;
          background: #0d3b66;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .submit-button:hover:not(:disabled) { background: #05213d; }
        .submit-button:disabled { background: #cbd5e1; cursor: not-allowed; }

        .footer-support {
          text-align: center;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 0.5rem;
        }

        .footer-support a {
          color: #0d3b66;
          text-decoration: none;
          font-weight: 600;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};