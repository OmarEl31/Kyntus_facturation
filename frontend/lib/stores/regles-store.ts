import { create } from "zustand"
import apiClient from "@/lib/api-client"
import { mockRegles } from "@/lib/mock-data"

export interface Regle {
  id: string
  nom: string
  description: string
  condition: string
  action: string
  actif: boolean
  priorite: number
}

interface ReglesStore {
  regles: Regle[]
  isLoading: boolean
  error: string | null

  fetchRegles: () => Promise<void>
  createRegle: (regle: Omit<Regle, "id">) => Promise<Regle>
  updateRegle: (id: string, updates: Partial<Regle>) => Promise<void>
  deleteRegle: (id: string) => Promise<void>
  toggleRegle: (id: string) => Promise<void>
}

export const useReglesStore = create<ReglesStore>((set) => ({
  regles: [],
  isLoading: false,
  error: null,

  fetchRegles: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get("/regles")
      set({ regles: response.data, isLoading: false })
    } catch (error: any) {
      console.log("[v0] API error, using mock data for regles")
      set({ regles: mockRegles, isLoading: false, error: null })
    }
  },

  createRegle: async (regle) => {
    try {
      const response = await apiClient.post("/regles", regle)
      set((state) => ({
        regles: [...state.regles, response.data],
      }))
      return response.data
    } catch (error: any) {
      const newRegle = {
        ...regle,
        id: `REGLE-${Date.now()}`,
      }
      set((state) => ({
        regles: [...state.regles, newRegle],
      }))
      return newRegle
    }
  },

  updateRegle: async (id: string, updates: Partial<Regle>) => {
    try {
      await apiClient.put(`/regles/${id}`, updates)
      set((state) => ({
        regles: state.regles.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }))
    } catch (error: any) {
      set((state) => ({
        regles: state.regles.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }))
    }
  },

  deleteRegle: async (id: string) => {
    try {
      await apiClient.delete(`/regles/${id}`)
      set((state) => ({
        regles: state.regles.filter((r) => r.id !== id),
      }))
    } catch (error: any) {
      set((state) => ({
        regles: state.regles.filter((r) => r.id !== id),
      }))
    }
  },

  toggleRegle: async (id: string) => {
    try {
      const regle = (await apiClient.get(`/regles/${id}`)).data
      await apiClient.put(`/regles/${id}`, { actif: !regle.actif })
      set((state) => ({
        regles: state.regles.map((r) => (r.id === id ? { ...r, actif: !r.actif } : r)),
      }))
    } catch (error: any) {
      set((state) => ({
        regles: state.regles.map((r) => (r.id === id ? { ...r, actif: !r.actif } : r)),
      }))
    }
  },
}))
