// frontend/services/reglesApi.ts
import api from "@/lib/api";
import type { Regle } from "@/lib/store";

type DbRegle = {
  id: number;
  code?: string | null;
  libelle?: string | null;
  condition_sql?: string | null;
  condition_json?: any | null;
  statut_facturation?: string | null;

  code_activite?: string | null;
  code_produit?: string | null;
  plp_applicable?: boolean | null;
  categorie?: string | null;

  is_active?: boolean;
  deleted_at?: string | null;
};

const mapDbToUi = (r: DbRegle): Regle => ({
  id: String(r.id),
  nom: r.code ?? "",
  description: r.libelle ?? "",
  condition: r.condition_sql ?? "",
  action: (r.statut_facturation ?? "").toUpperCase(),

  actif: r.is_active !== false,
  priorite: 0,

  code_activite: r.code_activite ?? "",
  code_produit: r.code_produit ?? "",
  plp_applicable: r.plp_applicable ?? null,
  categorie: r.categorie ?? "",
});

const mapUiToDb = (r: Partial<Regle>) => ({
  code: r.nom,
  libelle: r.description ?? null,
  condition_sql: r.condition ?? null,
  statut_facturation: r.action ?? null,

  code_activite: (r as any).code_activite ?? null,
  code_produit: (r as any).code_produit ?? null,
  plp_applicable: (r as any).plp_applicable ?? null,
  categorie: (r as any).categorie ?? null,
});

export const reglesApi = {
  async list(opts?: { includeInactive?: boolean; q?: string; action?: string }): Promise<Regle[]> {
    const params: any = {
      limit: 5000,
      offset: 0,
      order: "desc",
    };
    if (opts?.includeInactive) params.include_inactive = true;
    if (opts?.q?.trim()) params.q = opts.q.trim();
    if (opts?.action?.trim()) params.action = opts.action.trim();

    const res = await api.get("/regles", { params });
    return (res.data as DbRegle[]).map(mapDbToUi);
  },

  async count(opts?: { includeInactive?: boolean }): Promise<number> {
    const res = await api.get("/regles/count", {
      params: { include_inactive: !!opts?.includeInactive },
    });
    return Number(res.data?.count ?? 0);
  },

  async create(payload: Partial<Regle>): Promise<Regle> {
    const res = await api.post("/regles", mapUiToDb(payload));
    return mapDbToUi(res.data as DbRegle);
  },

  async update(id: string, payload: Partial<Regle>): Promise<Regle> {
    // ✅ backend = PATCH
    const res = await api.patch(`/regles/${id}`, mapUiToDb(payload));
    return mapDbToUi(res.data as DbRegle);
  },

  async remove(id: string): Promise<void> {
    // ✅ soft delete
    await api.delete(`/regles/${id}`);
  },

  async restore(id: string): Promise<Regle> {
    const res = await api.post(`/regles/${id}/restore`);
    return mapDbToUi(res.data as DbRegle);
  },

  async toggleActive(id: string, isActive: boolean): Promise<Regle> {
    // option: PATCH is_active directement
    const res = await api.patch(`/regles/${id}`, { is_active: isActive });
    return mapDbToUi(res.data as DbRegle);
  },
};