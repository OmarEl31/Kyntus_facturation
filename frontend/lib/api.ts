import axios from "axios"
import type { Dossier, Regle, LogEntry } from "./store"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// 🧾 Dossiers
export const dossierApi = {
  getAll: () => api.get<Dossier[]>("/dossiers"),
  getById: (id: string) => api.get<Dossier>(`/dossiers/${id}`),
  create: (data: Partial<Dossier>) => api.post<Dossier>("/dossiers", data),
  update: (id: string, data: Partial<Dossier>) => api.put<Dossier>(`/dossiers/${id}`, data),
  delete: (id: string) => api.delete(`/dossiers/${id}`),
  sync: () => api.post("/dossiers/sync", {}),
}

// ⚙️ Règles
export const regleApi = {
  getAll: () => api.get<Regle[]>("/regles"),
  getById: (id: string) => api.get<Regle>(`/regles/${id}`),
  create: (data: Partial<Regle>) => api.post<Regle>("/regles", data),
  update: (id: string, data: Partial<Regle>) => api.put<Regle>(`/regles/${id}`, data),
  delete: (id: string) => api.delete(`/regles/${id}`),
}

// 🪵 Logs
export const logApi = {
  getAll: () => api.get<LogEntry[]>("/logs"),
  getByDossier: (dossierId: string) => api.get<LogEntry[]>(`/logs/dossier/${dossierId}`),
}

// 📊 Stats
export const statsApi = {
  getDashboard: () => api.get("/stats/dashboard"),
}

export default api
