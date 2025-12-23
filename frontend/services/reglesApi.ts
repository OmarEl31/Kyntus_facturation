import api from "@/lib/api";
import type { Regle } from "@/lib/store";

// DB -> UI
const mapDbToUi = (r: any): Regle => ({
  id: String(r.id),
  nom: r.code ?? "",
  description: r.libelle ?? "",
  condition: r.condition_sql ?? "",
  action: r.statut_facturation ?? "",
  // si tu ne veux pas gérer actif/priorite :
  actif: true,
  priorite: 0,
});

// UI -> DB
const mapUiToDb = (r: Partial<Regle>) => ({
  code: r.nom,
  libelle: r.description ?? null,
  condition_sql: r.condition ?? null,
  statut_facturation: r.action ?? null,
});

export const reglesApi = {
  async list(): Promise<Regle[]> {
    const res = await api.get("/regles");
    return (res.data as any[]).map(mapDbToUi);
  },

  async create(payload: Partial<Regle>): Promise<Regle> {
    const res = await api.post("/regles", mapUiToDb(payload));
    return mapDbToUi(res.data);
  },

  async update(id: string, payload: Partial<Regle>): Promise<Regle> {
    const res = await api.put(`/regles/${id}`, mapUiToDb(payload));
    return mapDbToUi(res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/regles/${id}`);
  },
};
