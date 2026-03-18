//frontend/app/auth/components/AuthForm.tsx
"use client";
import React, { useState } from "react";
import { AuthLayout } from "../layouts/AuthLayout";
import { AuthInput } from "../ui/AuthInput";

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
      const url = `${apiBase}/api/auth/login`;

      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erreur lors de la connexion");
      }

      localStorage.setItem("token", data.access_token);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Bienvenue sur Kyntus"
      subtitle="Connectez-vous pour accéder à vos imports"
    >
      <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
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

        {error && (
          <p
            style={{
              color: "red",
              fontSize: "13px",
              textAlign: "center",
              marginTop: "10px",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#ff7900",
            color: "white",
            border: "none",
            borderRadius: "5px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "15px",
          }}
        >
          {loading ? "Chargement..." : "Se connecter"}
        </button>
      </form>
    </AuthLayout>
  );
};