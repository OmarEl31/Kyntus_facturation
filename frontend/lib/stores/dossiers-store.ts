import { create } from "zustand"
import apiClient from "@/lib/api-client"
import { mockDossiers } from "@/lib/mock-data"

export interface Dossier {
  id: string
  numero: string
  source: "PRAXEDO" | "PIDI"
  statut: "FACTURABLE" | "NON_FACTURABLE" | "CONDITIONNEL"
  agence: string
  technicien: string
  montant: number
  dateCreation: string
  dateModification: string
  reglesAppliquees: string[]
  notes?: string
}

interface DossiersStore {
  dossiers: Dossier[]
  isLoading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number

  fetchDossiers: (filters?: any) => Promise<void>
  getDossierById: (id: string) => Promise<Dossier>
  createDossier: (dossier: Omit<Dossier, "id">) => Promise<Dossier>
  updateDossier: (id: string, updates: Partial<Dossier>) => Promise<void>
  deleteDossier: (id: string) => Promise<void>
  setPage: (page: number) => void
}

export const useDossiersStore = create<DossiersStore>((set, get) => ({
  dossiers: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,

  fetchDossiers: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const { page, pageSize } = get()
      const response = await apiClient.get("/dossiers", {
        params: { page, pageSize, ...filters },
      })
      set({
        dossiers: response.data.items,
        total: response.data.total,
        isLoading: false,
      })
    } catch (error: any) {
      console.log("[v0] API error, using mock data for dossiers")
      set({
        dossiers: mockDossiers,
        total: mockDossiers.length,
        isLoading: false,
        error: null,
      })
    }
  },

  getDossierById: async (id: string) => {
    try {
      const response = await apiClient.get(`/dossiers/${id}`)
      return response.data
    } catch (error: any) {
      const dossier = mockDossiers.find((d) => d.id === id)
      if (dossier) return dossier
      throw new Error("Dossier not found")
    }
  },

  createDossier: async (dossier) => {
    try {
      const response = await apiClient.post("/dossiers", dossier)
      set((state) => ({
        dossiers: [...state.dossiers, response.data],
      }))
      return response.data
    } catch (error: any) {
      const newDossier = {
        ...dossier,
        id: `DOS-${Date.now()}`,
      }
      set((state) => ({
        dossiers: [...state.dossiers, newDossier],
      }))
      return newDossier
    }
  },

  updateDossier: async (id: string, updates: Partial<Dossier>) => {
    try {
      await apiClient.put(`/dossiers/${id}`, updates)
      set((state) => ({
        dossiers: state.dossiers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      }))
    } catch (error: any) {
      set((state) => ({
        dossiers: state.dossiers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      }))
    }
  },

  deleteDossier: async (id: string) => {
    try {
      await apiClient.delete(`/dossiers/${id}`)
      set((state) => ({
        dossiers: state.dossiers.filter((d) => d.id !== id),
      }))
    } catch (error: any) {
      set((state) => ({
        dossiers: state.dossiers.filter((d) => d.id !== id),
      }))
    }
  },

  setPage: (page) => set({ page }),
}))
