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

/* -------------------------
   IMPORT CSV
-------------------------- */

export interface ImportCsvOptions {
  type: "PRAXEDO" | "PIDI" | "ORANGE_PPD";
  file: File;
  delimiter?: ";" | ",";
  signal?: AbortSignal;
}

export interface ImportCsvResult {
  message: string;
  count: number;
  rows?: number;
  import_id?: string;
  importId?: string; // tolérance (front)
}

export async function importCsv(options: ImportCsvOptions): Promise<ImportCsvResult> {
  const { type, file, delimiter = ";", signal } = options;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("delimiter", delimiter);

  const endpoint =
    type === "PRAXEDO"
      ? `${API_URL}/api/import/praxedo`
      : type === "PIDI"
      ? `${API_URL}/api/import/pidi`
      : `${API_URL}/api/orange-ppd/import`;

  const response = await fetch(endpoint, { method: "POST", body: formData, signal });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText}`);
  }

  return response.json();
}

export const uploadPraxedo = (file: File) => importCsv({ type: "PRAXEDO", file });
export const uploadPidi = (file: File) => importCsv({ type: "PIDI", file });
export const uploadOrangePpd = (file: File) => importCsv({ type: "ORANGE_PPD", file });

/* -------------------------
   ORANGE PPD
-------------------------- */

export interface OrangePpdImportSummary {
  import_id: string;
  filename?: string | null;
  row_count?: number | null;
  imported_by?: string | null;
  imported_at?: string | null;
}

export type OrangePpdCompareSummary = {
  orange_total_ht: number;
  orange_total_ttc: number;
  kyntus_total_ht: number;
  kyntus_total_ttc: number;
  ecart_ht: number;
  ecart_ttc: number;
};

export type OrangePpdComparison = {
  import_id: string;
  num_ot: string;

  // Montants
  facturation_orange_ht?: number | null;
  facturation_orange_ttc?: number | null;
  facturation_kyntus_ht?: number | null;
  facturation_kyntus_ttc?: number | null;

  diff_ht?: number | null;
  diff_ttc?: number | null;

  a_verifier: boolean;
};

export async function compareOrangePpdSummary(params: { importId?: string }) {
  const qs = new URLSearchParams();
  if (params.importId) qs.set("import_id", params.importId);

  const res = await fetch(`${API_URL}/api/orange-ppd/compare-summary${qs.toString() ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as OrangePpdCompareSummary;
}

export async function listOrangeImports(limit = 20): Promise<OrangePpdImportSummary[]> {
  const response = await fetch(`${API_URL}/api/orange-ppd/imports?limit=${limit}`);
  if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
  return response.json();
}


export async function listOrangePpdOptions(importId?: string): Promise<string[]> {
  const qs = new URLSearchParams();
  if (importId) qs.set("import_id", importId);

  const response = await fetch(`${API_URL}/api/orange-ppd/ppd-options${qs.toString() ? `?${qs}` : ""}`);
  if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function compareOrangePpd(params: { importId?: string; onlyMismatch?: boolean } = {}): Promise<OrangePpdComparison[]> {
  const qs = new URLSearchParams();
  if (params.importId) qs.set("import_id", params.importId);
  if (params.onlyMismatch) qs.set("only_mismatch", "true");

  const response = await fetch(`${API_URL}/api/orange-ppd/compare${qs.toString() ? `?${qs}` : ""}`);
  if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
  return response.json();
}
