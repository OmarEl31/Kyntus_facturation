import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  sub?: string;
  user_id?: number;
  role?: string;
  exp?: number;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getCurrentUserRole(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const decoded = jwtDecode<TokenPayload>(token);
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return (getCurrentUserRole() || "").toLowerCase() === "admin";
}