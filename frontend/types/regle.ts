// frontend/types/regle.ts
export type RegleFacturation = {
  id: number;
  code?: string | null;
  libelle?: string | null;
  condition_sql?: string | null;
  condition_json?: any | null;

  statut_facturation?: string | null;

  code_activite?: string | null;
  code_produit?: string | null;
  codes_cloture_facturables?: string[] | null;

  plp_applicable?: boolean | null;
  categorie?: string | null;

  // ✅ soft delete
  is_active?: boolean;
  deleted_at?: string | null;
};