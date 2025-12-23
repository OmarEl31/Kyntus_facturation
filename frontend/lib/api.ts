import axios from "axios";
import type { Dossier, Regle, LogEntry } from "./store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ On fixe une fois pour toutes le prefix /api
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🧾 Dossiers (backend: /api/dossiers)
export const dossierApi = {
  getAll: () => api.get<Dossier[]>("/dossiers"),
  getById: (id: string) => api.get<Dossier>(`/dossiers/${id}`), // si tu as un endpoint détail (sinon à enlever)
  create: (data: Partial<Dossier>) => api.post<Dossier>("/dossiers", data), // si existant
  update: (id: string, data: Partial<Dossier>) => api.put<Dossier>(`/dossiers/${id}`, data), // si existant
  delete: (id: string) => api.delete(`/dossiers/${id}`), // si existant
  sync: () => api.post("/dossiers/sync", {}), // si existant
};

// ⚙️ Règles (backend: /api/regles)
export const regleApi = {
  getAll: () => api.get<any[]>("/regles"), // 👈 on met any[] car backend renvoie code/libelle...
  getById: (id: string) => api.get<any>(`/regles/${id}`),
  create: (data: any) => api.post<any>("/regles", data),
  update: (id: string, data: any) => api.put<any>(`/regles/${id}`, data),
  delete: (id: string) => api.delete(`/regles/${id}`),
};

// 🪵 Logs (si tu as backend /api/logs)
export const logApi = {
  getAll: () => api.get<LogEntry[]>("/logs"),
  getByDossier: (dossierId: string) => api.get<LogEntry[]>(`/logs/dossier/${dossierId}`),
};

// 📊 Stats (si tu as backend /api/stats/dashboard)
export const statsApi = {
  getDashboard: () => api.get("/stats/dashboard"),
};

export default api;
