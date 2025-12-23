export type RegleFacturation = {
  id: number;
  code?: string | null;
  libelle?: string | null;
  condition_sql?: string | null;
  statut_facturation?: string | null; // FACTURABLE | NON_FACTURABLE | CONDITIONNEL
  code_activite?: string | null;
  code_produit?: string | null;
  codes_cloture_facturables?: string[] | null;
  categorie?: string | null;
};
