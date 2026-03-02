import { create } from "zustand"
import apiClient from "@/lib/api-client"

export interface AuditLog {
  id: string
  timestamp: string
  utilisateur: string
  action: string
  entite: string
  entiteId: string
  details: string
  ancienneValeur?: string
  nouvelleValeur?: string
}

interface AuditStore {
  logs: AuditLog[]
  isLoading: boolean
  error: string | null
  total: number

  fetchLogs: (filters?: any) => Promise<void>
  addLog: (log: Omit<AuditLog, "id" | "timestamp">) => Promise<void>
}

export const useAuditStore = create<AuditStore>((set) => ({
  logs: [],
  isLoading: false,
  error: null,
  total: 0,

  fetchLogs: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get("/audit/logs", { params: filters })
      set({
        logs: response.data.items,
        total: response.data.total,
        isLoading: false,
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Erreur"
      set({ error: errorMessage, isLoading: false })
    }
  },

  addLog: async (log) => {
    try {
      const response = await apiClient.post("/audit/logs", log)
      set((state) => ({
        logs: [response.data, ...state.logs],
      }))
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Erreur")
    }
  },
}))
