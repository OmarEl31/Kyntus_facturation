const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DossiersFilters {
  statut_final?: string;
  statut_croisement?: string;
  ppd?: string;
  limit?: number;
  offset?: number;
  q?: string;
}

export interface DossierFacturable {
  key_match: string;
  ot_key?: string | null;
  nd_global?: string | null;
  numero_ppd?: string | null;
  attachement_valide?: string | null;

  activite_code?: string | null;
  produit_code?: string | null;
  code_cible?: string | null;
  code_cloture_code?: string | null;

  mode_passage?: string | null;
  type_site_terrain?: string | null;
  type_pbo_terrain?: string | null;
  desc_site?: string | null;
  description?: string | null;

  regle_code?: string | null;
  libelle_regle?: string | null;
  statut_facturation?: string | null;

  codes_cloture_facturables?: string[] | null;

  statut_final?: string | null;
  statut_croisement?: string | null;
  motif_verification?: string | null;
  is_previsite?: boolean | null;

  statut_praxedo?: string | null;
  statut_pidi?: string | null;

  liste_articles?: string | null;

  date_planifiee?: string | null;
  generated_at?: string | null;
  technicien?: string | null;

  type_branchement?: any;
  plp_applicable?: boolean | null;
  services?: any;
  prix_degressifs?: any;
  articles_optionnels?: any;
  documents_attendus?: string[] | null;
  pieces_facturation?: string[] | null;
  outils_depose?: string[] | null;
  justificatifs?: any;

  article_facturation_propose?: string | null;
  regle_articles_attendus?: any;
  statut_article?: string | null;
  statut_article_vs_regle?: string | null;
}

export const statutsFinal = ["FACTURABLE", "NON_FACTURABLE", "A_VERIFIER", "CONDITIONNEL"] as const;
export const statutsCroisement = ["OK", "ABSENT_PRAXEDO", "ABSENT_PIDI", "INCONNU"] as const;

function cleanValue(v?: string) {
  if (v == null) return undefined;
  const x = v.trim();
  if (!x) return undefined;
  if (x.toLowerCase() === "tous" || x.toLowerCase() === "tout" || x === "*") return undefined;
  return x;
}

function buildParams(filters: DossiersFilters) {
  const params = new URLSearchParams();

  const q = cleanValue(filters.q);
  const statut = cleanValue(filters.statut_final);
  const croisement = cleanValue(filters.statut_croisement);
  const ppd = cleanValue(filters.ppd);

  if (q) params.set("q", q);
  if (statut) params.set("statut", statut);
  if (croisement) params.set("croisement", croisement);
  if (ppd) params.set("ppd", ppd);

  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));

  return params;
}

export async function listDossiers(filters: DossiersFilters = {}): Promise<DossierFacturable[]> {
  const params = buildParams(filters);
  const qs = params.toString();
  const url = `${API_URL}/api/dossiers/${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText}`);
  }
  return response.json();
}

export async function exportDossiersXlsx(filters: DossiersFilters = {}): Promise<void> {
  const params = buildParams(filters);
  // export = tout le filtré (pas de pagination)
  params.delete("limit");
  params.delete("offset");

  const qs = params.toString();
  const url = `${API_URL}/api/dossiers/export.xlsx${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;

  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = "dossiers_export.xlsx";
  if (contentDisposition) {
    const m = contentDisposition.match(/filename="?(.+)"?/);
    if (m?.[1]) filename = m[1];
  }

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

export interface ImportCsvOptions {
  type: "PRAXEDO" | "PIDI";
  file: File;
  delimiter?: ";" | ",";
  signal?: AbortSignal;
}

export async function importCsv(options: ImportCsvOptions): Promise<{ message: string; count: number }> {
  const { type, file, delimiter = ";", signal } = options;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("delimiter", delimiter);

  const endpoint = type === "PRAXEDO" ? `${API_URL}/api/import/praxedo` : `${API_URL}/api/import/pidi`;

  const response = await fetch(endpoint, { method: "POST", body: formData, signal });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText}`);
  }

  return response.json();
}

export const uploadPraxedo = (file: File) => importCsv({ type: "PRAXEDO", file });
export const uploadPidi = (file: File) => importCsv({ type: "PIDI", file });
