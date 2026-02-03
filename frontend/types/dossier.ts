// frontend/types/dossier.ts

export type StatutFinal = "FACTURABLE" | "CONDITIONNEL" | "NON_FACTURABLE" | "A_VERIFIER";
export type CroisementStatut = "OK" | "ABSENT_PRAXEDO" | "ABSENT_PIDI" | "INCONNU";

export type StatutArticleVsRegle = "OK" | "A_VERIFIER" | "INCONNU" | "NON_APPLICABLE";
export type StatutArticles = "OK" | "A_VERIFIER" | "INCONNU_REGLE" | "NON_APPLICABLE";

export type MotifVerification =
  | "PREVISITE"
  | "CROISEMENT_INCOMPLET"
  | "ACTPROD_MANQUANT"
  | "REGLE_MANQUANTE"
  | "NON_FACTURABLE_REGLE"
  | "CLOTURE_INVALIDE"
  | "ARTICLES_MANQUANTS"
  | "ARTICLES_MISMATCH";

export interface DossierFacturable {
  key_match: string;

  ot_key?: string | null;
  nd_global?: string | null;
  statut_croisement?: CroisementStatut | string | null;

  praxedo_ot_key?: string | null;
  praxedo_nd?: string | null;
  activite_code?: string | null;
  produit_code?: string | null;
  code_cloture_code?: string | null;
  statut_praxedo?: string | null;
  date_planifiee?: string | null;
  date_cloture?: string | null; // (si tu veux un vrai datetime côté front, on peut typer Date)
  technicien?: string | null;
  commentaire_praxedo?: string | null;

  statut_pidi?: string | null;
  code_cible?: string | null;
  pidi_date_creation?: string | null;
  numero_att?: string | null;
  liste_articles?: string | null;
  commentaire_pidi?: string | null;

  regle_code?: string | null;
  libelle_regle?: string | null;
  condition_sql?: string | null;
  condition_json?: string | null; // si ton backend renvoie JSON stringifié, sinon on peut typer en unknown
  statut_facturation?: string | null;
  codes_cloture_facturables?: string[] | null;

  type_branchement?: unknown | null;
  plp_applicable?: boolean | string | null; // selon ta view (parfois "t/f" en texte)
  services?: unknown | null;
  prix_degressifs?: unknown | null;
  articles_optionnels?: unknown | null;
  documents_attendus?: string[] | string | null;
  pieces_facturation?: string[] | string | null;
  outils_depose?: string[] | string | null;
  justificatifs?: unknown | null;
  code_chantier_generique?: string | null;
  categorie?: string | null;

  statut_articles?: StatutArticles | string | null;
  statut_final?: StatutFinal | string | null;
  cloture_facturable?: boolean | null;
  generated_at?: string | null;

  motif_verification?: MotifVerification | string | null;
  is_previsite?: boolean | null;

  desc_site?: string | null;
  description?: string | null;
  type_site_terrain?: string | null;
  type_pbo_terrain?: string | null;
  mode_passage?: string | null;

  article_facturation_propose?: string | null;
  regle_articles_attendus?: unknown | null;
  statut_article?: string | null;
  statut_article_vs_regle?: StatutArticleVsRegle | string | null;

  numero_ppd?: string | null;
  attachement_valide?: string | null;

  // Optionnel : si backend fournit un format parsé
  articles_app?: string[] | string | null;
}

export interface DossiersFilters {
  q?: string;
  statut_final?: StatutFinal | string;          // côté front
  statut_croisement?: CroisementStatut | string; // côté front
  ppd?: string;
  limit?: number;
  offset?: number;
}
