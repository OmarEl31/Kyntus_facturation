export type StatutFinal =
  | "FACTURABLE"
  | "CONDITIONNEL"
  | "NON_FACTURABLE"
  | "A_VERIFIER";

export type CroisementStatut =
  | "OK"
  | "ABSENT_PRAXEDO"
  | "ABSENT_PIDI"
  | "NON_ENVOYE_PIDI"
  | "INCONNU";

export type DossierFacturable = {
  key_match: string | number | null;

  statut_pidi?: string | null;
  statut_praxedo?: string | null;
  produit_code?: string | null;
  date_planifiee?: string | null;

  statut_croisement?: CroisementStatut | string | null;
  statut_articles?: string | null;
  liste_articles?: string | null;
  documents_attendus?: string[] | null;

  ot_key?: string | null;
  nd_global?: string | null;
  activite_code?: string | null;
  code_cible?: string | null;
  code_cloture_code?: string | null;

  cloture_facturable?: boolean | null;

  regle_code?: string | null;
  libelle_regle?: string | null;

  statut_final: StatutFinal;
  generated_at?: string | null;
};
