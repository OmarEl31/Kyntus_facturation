export type StatutFinal =
  | "FACTURABLE"
  | "CONDITIONNEL"
  | "NON_FACTURABLE"
  | "A_VERIFIER";

export type CroisementStatut =
  | "OK"
  | "PIDI_only"
  | "Praxedo_only"
  | "UNKNOWN";

export interface DossierFacturable {
  key_match: string;

  ot_key: string | null;
  nd_global: string | null;
  statut_croisement: CroisementStatut | null;

  praxedo_ot_key: string | null;
  praxedo_nd: string | null;
  activite_code: string | null;
  produit_code: string | null;
  code_cloture_code: string | null;
  statut_praxedo: string | null;
  date_planifiee: string | null; // ISO
  date_cloture: string | null;   // ISO
  technicien: string | null;
  commentaire_praxedo: string | null;

  statut_pidi: string | null;
  code_cible: string | null;
  pidi_date_creation: string | null;
  numero_att: string | null;
  liste_articles: string | null;
  commentaire_pidi: string | null;

  regle_code: string | null;
  libelle_regle: string | null;
  condition_sql: string | null;
  statut_facturation: string | null;
  codes_cloture_facturables: string[] | null;
  type_branchement: unknown | null;
  plp_applicable: boolean | null;
  services: unknown | null;
  prix_degressifs: unknown | null;
  articles_optionnels: unknown | null;
  documents_attendus: string[] | null;
  pieces_facturation: string[] | null;
  outils_depose: string[] | null;
  justificatifs: unknown | null;
  code_chantier_generique: string | null;
  categorie: string | null;

  statut_articles: string | null;

  statut_final: StatutFinal;
  cloture_facturable: boolean | null;
  generated_at: string | null;
}

export interface DossiersFilters {
  q?: string;
  statut?: StatutFinal;
  croisement?: CroisementStatut;
}
