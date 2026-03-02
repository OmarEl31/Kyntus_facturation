import { create } from "zustand"
import apiClient from "@/lib/api-client"

export interface User {
  id: string
  email: string
  nom: string
  role: "admin" | "user"
  agence?: string
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post("/auth/login", { email, password })
      const { user, token } = response.data
      localStorage.setItem("auth_token", token)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Erreur de connexion"
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem("auth_token")
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  checkAuth: async () => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      set({ isAuthenticated: false })
      return
    }
    try {
      const response = await apiClient.get("/auth/me")
      set({ user: response.data, isAuthenticated: true })
    } catch {
      localStorage.removeItem("auth_token")
      set({ isAuthenticated: false })
    }
  },
}))
