
"use client";

import { AuthForm } from "./components/AuthForm";

export default function AuthPage() {
    return <AuthForm onLoginSuccess={() => window.location.replace("/")} />;
}
