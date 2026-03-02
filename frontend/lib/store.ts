import { create } from "zustand"

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

export interface Regle {
  id: string
  nom: string
  description: string
  condition: string
  action: string
  actif: boolean
  priorite: number
}

export interface LogEntry {
  id: string
  timestamp: string
  utilisateur: string
  action: string
  dossierId?: string
  details: string
}

interface Store {
  dossiers: Dossier[]
  regles: Regle[]
  logs: LogEntry[]
  userRole: "admin" | "user"
  isReadOnly: boolean

  setDossiers: (dossiers: Dossier[]) => void
  addDossier: (dossier: Dossier) => void
  updateDossier: (id: string, dossier: Partial<Dossier>) => void

  setRegles: (regles: Regle[]) => void
  addRegle: (regle: Regle) => void
  updateRegle: (id: string, regle: Partial<Regle>) => void
  deleteRegle: (id: string) => void

  addLog: (log: LogEntry) => void
  setUserRole: (role: "admin" | "user") => void
  setReadOnly: (readOnly: boolean) => void
}

export const useStore = create<Store>((set) => ({
  dossiers: [],
  regles: [],
  logs: [],
  userRole: "user",
  isReadOnly: false,

  setDossiers: (dossiers) => set({ dossiers }),
  addDossier: (dossier) => set((state) => ({ dossiers: [...state.dossiers, dossier] })),
  updateDossier: (id, updates) =>
    set((state) => ({
      dossiers: state.dossiers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),

  setRegles: (regles) => set({ regles }),
  addRegle: (regle) => set((state) => ({ regles: [...state.regles, regle] })),
  updateRegle: (id, updates) =>
    set((state) => ({
      regles: state.regles.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  deleteRegle: (id) =>
    set((state) => ({
      regles: state.regles.filter((r) => r.id !== id),
    })),

  addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
  setUserRole: (role) => set({ userRole: role }),
  setReadOnly: (readOnly) => set({ isReadOnly: readOnly }),
}))
