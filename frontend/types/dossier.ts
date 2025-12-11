// frontend/types/dossier.ts

export type DossierCroisement = {
  ot_key: string;
  nd_global: string | null;
  activite_code?: string | null;
  code_cible?: string | null;
  code_cloture_code?: string | null;
  date_planifiee?: string | null;
  statut_praxedo?: string | null;
  statut_pidi?: string | null;
  statut_croisement: "OK" | "MANQUANT_PIDI" | "MANQUANT_PRAXEDO" | "INCONNU";
  commentaire_praxedo?: string | null;
  generated_at?: string | null;
};

export type DossierFacturable = {
  ot_key: string;
  nd_global: string | null;
  activite_code?: string | null;
  code_cible?: string | null;
  code_cloture_code?: string | null;
  libelle_cloture?: string | null;
  cloture_facturable?: boolean | null;
  regle_code?: string | null;
  libelle_regle?: string | null;
  statut_final: "FACTURABLE" | "CONDITIONNEL" | "NON_FACTURABLE";
  generated_at?: string | null;
};

export type PageOut<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
};
