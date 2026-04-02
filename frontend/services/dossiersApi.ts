// frontend/services/dossiersApi.ts

import { normalizeString, extractPalierFromEvenements } from '../utils/stringUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100";

// Helper pour ajouter le token d'authentification
function getAuthHeaders(): HeadersInit {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

// Helper commun pour gérer les réponses API
async function handleApiResponse(response: Response): Promise<Response> {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/auth";
    }
    throw new Error("Non authentifié");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText}`);
  }

  return response;
}

/* =========================
   HELPER: Normalisation NDS
========================= */

/**
 * Convertit les nds (array PostgreSQL ou string) en texte affichable
 */
export function ndsToText(nds: string[] | string | null | undefined): string {
  if (!nds) return "";

  if (Array.isArray(nds)) {
    return nds.filter(Boolean).join(" | ");
  }

  const s = String(nds).trim();
  if (!s) return "";

  if (s.startsWith("{") && s.endsWith("}")) {
    return s
      .slice(1, -1)
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .join(" | ");
  }

  return s;
}

/**
 * Helper pour obtenir la valeur à afficher dans la colonne "Relevé / ND"
 */
export function getReleveOrNdValue(row: any): string {
  if (row.releve && typeof row.releve === 'string' && row.releve.trim()) {
    return row.releve.trim();
  }

  const ndText = ndsToText(row.nds);
  if (ndText) {
    return ndText;
  }

  return "—";
}

/* =========================
   DOSSIERS
========================= */

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

  palier: string | null;
  palier_phrase?: string | null;
  evenements?: string | null;
  compte_rendu?: string | null;

  releve?: string | null;
  nds?: string[] | string | null;
}

export const statutsFinal = ["FACTURABLE", "NON_FACTURABLE", "A_VERIFIER", "CONDITIONNEL"] as const;
export const statutsCroisement = ["OK", "ABSENT_PRAXEDO", "ABSENT_PIDI", "INCONNU"] as const;

function cleanValue(v?: string) {
  if (v == null) return undefined;
  const x = normalizeString(v);
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

  if (typeof filters.limit === "number" && !isNaN(filters.limit)) {
    params.set("limit", String(filters.limit));
  }
  if (typeof filters.offset === "number" && !isNaN(filters.offset)) {
    params.set("offset", String(filters.offset));
  }

  return params;
}

export async function listDossiers(
  filters: DossiersFilters = {},
  signal?: AbortSignal,
): Promise<DossierFacturable[]> {
  const cleanFilters = {
    ...filters,
    q: filters.q?.replace(/[<>]/g, ''),
    limit: filters.limit || 5000,
    offset: filters.offset || 0,
  };

  const params = buildParams(cleanFilters);
  const qs = params.toString();
  const url = `${API_URL}/api/dossiers/${qs ? `?${qs}` : ""}`;

  console.log("📥 Fetching dossiers:", url);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal,
    headers: {
      ...getAuthHeaders(),
    },
  });

  await handleApiResponse(response);
  return response.json();
}

function extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const patterns = [
    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
    /filename="([^"]+)"/,
    /filename=([^;]+)/,
  ];

  for (const pattern of patterns) {
    const match = contentDisposition.match(pattern);
    if (match) {
      let filename = match[1] || match[2] || match[0];
      filename = filename.replace(/['"]/g, '').trim();
      if (filename) return filename;
    }
  }

  return null;
}

export async function exportDossiersXlsx(filters: DossiersFilters = {}): Promise<void> {
  const params = buildParams(filters);
  params.delete("limit");
  params.delete("offset");

  const qs = params.toString();
  const url = `${API_URL}/api/dossiers/export.xlsx${qs ? `?${qs}` : ""}`;

  console.log("📥 Export Excel - URL:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ...getAuthHeaders(),
    },
  });

  await handleApiResponse(response);

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error("Le fichier Excel est vide");
  }

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;

  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = extractFilenameFromContentDisposition(contentDisposition);

  if (!filename || !filename.endsWith('.xlsx')) {
    const date = new Date().toISOString().split('T')[0];
    filename = `dossiers_export_${date}.xlsx`;
  }

  console.log("📥 Téléchargement Excel - Fichier:", filename);

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl);
  }, 100);
}

/* =========================
   IMPORTS (CSV)
========================= */

export interface ImportCsvOptions {
  type: "PRAXEDO" | "PIDI" | "ORANGE_PPD" | "PRAXEDO_CR10" | "COMMENTAIRE_TECH";
  file: File;
  delimiter?: ";" | "," | "\t" | "|";
  signal?: AbortSignal;
}

export interface ImportCsvResult {
  message: string;
  count: number;
  rows?: number;
  import_id?: string;
  importId?: string;
}

export async function importCsv(options: ImportCsvOptions): Promise<ImportCsvResult> {
  const { type, file, delimiter = ";", signal } = options;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("delimiter", delimiter);

  let endpoint: string;

  switch (type) {
    case "PRAXEDO":
      endpoint = `${API_URL}/api/import/praxedo`;
      break;
    case "PIDI":
      endpoint = `${API_URL}/api/import/pidi`;
      break;
    case "PRAXEDO_CR10":
      endpoint = `${API_URL}/api/import/praxedo-cr10`;
      break;
    case "COMMENTAIRE_TECH":
      endpoint = `${API_URL}/api/import/commentaire-tech-cr10`;
      break;
    case "ORANGE_PPD":
    default:
      endpoint = `${API_URL}/api/orange-ppd/import`;
      break;
  }

  console.log(`📤 Import CSV - Type: ${type}, Endpoint: ${endpoint}`);
  console.log(`📄 Fichier: ${file.name}, Taille: ${file.size} bytes, Délimiteur: ${delimiter}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal,
      headers: {
        ...getAuthHeaders(),
      },
    });

    await handleApiResponse(response);

    const result = await response.json();
    console.log(`✅ Import réussi:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Exception:`, error);
    throw error;
  }
}

export const uploadPraxedo = (file: File) => importCsv({ type: "PRAXEDO", file });
export const uploadPidi = (file: File) => importCsv({ type: "PIDI", file });
export const uploadOrangePpd = (file: File) => importCsv({ type: "ORANGE_PPD", file });
export const uploadPraxedoCr10 = (file: File) => importCsv({ type: "PRAXEDO_CR10", file });
export const uploadCommentaireTech = (file: File) => importCsv({ type: "COMMENTAIRE_TECH", file });

/* =========================
   ORANGE PPD (CSV + XLSX)
========================= */

export interface OrangePpdImportSummary {
  import_id: string;
  filename?: string | null;
  row_count?: number | null;
  imported_by?: string | null;
  imported_at?: string | null;
  sheet_name?: string | null;
  kind?: "CSV" | "XLSX";
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
  numero_ppd_orange?: string | null;
  facturation_orange_ht?: number | null;
  facturation_orange_ttc?: number | null;
  facturation_kyntus_ht?: number | null;
  facturation_kyntus_ttc?: number | null;
  diff_ht?: number | null;
  diff_ttc?: number | null;
  a_verifier?: boolean | null;
  ot_existant?: boolean | null;
  statut_croisement?: string | null;
  croisement_complet?: boolean | null;
  reason?: string | null;
  releve?: string | null;
  nds?: string[] | string | null;
  numero_ots?: string[] | string | null;
  ot_pidi?: string | null;
};

export type OrangePpdNdChild = {
  nd?: string | null;
  facturation_kyntus_ht?: number | null;
  facturation_kyntus_ttc?: number | null;
};

export type OrangePpdTreeReleve = {
  releve?: string | null;
  numero_ppd_orange?: string | null;
  facturation_orange_ht?: number | null;
  facturation_orange_ttc?: number | null;
  facturation_kyntus_ht?: number | null;
  facturation_kyntus_ttc?: number | null;
  diff_ht?: number | null;
  diff_ttc?: number | null;
  a_verifier?: boolean | null;
  reason?: string | null;
  nds?: string[] | string | null;
  children?: OrangePpdNdChild[];
};

export type OrangePpdTreeNode = {
  num_ot: string;
  numero_ppd_orange?: string | null;
  facturation_orange_ht?: number | null;
  facturation_orange_ttc?: number | null;
  facturation_kyntus_ht?: number | null;
  facturation_kyntus_ttc?: number | null;
  diff_ht?: number | null;
  diff_ttc?: number | null;
  a_verifier?: boolean | null;
  children?: OrangePpdTreeReleve[];
};

export async function compareOrangePpdTree(
  params: { importId?: string; ppd?: string; onlyMismatch?: boolean } = {}
): Promise<OrangePpdTreeNode[]> {
  const qs = new URLSearchParams();
  if (params.importId) qs.set("import_id", params.importId);
  if (params.ppd?.trim()) qs.set("ppd", params.ppd.trim());
  if (params.onlyMismatch) qs.set("only_mismatch", "true");

  const response = await fetch(`${API_URL}/api/orange-ppd/compare-tree${qs.toString() ? `?${qs}` : ""}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  await handleApiResponse(response);
  return response.json();
}

export async function uploadOrangePpdExcel(file: File): Promise<ImportCsvResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/orange-ppd/import-excel`, {
    method: "POST",
    body: formData,
    headers: {
      ...getAuthHeaders(),
    },
  });

  await handleApiResponse(response);
  return response.json();
}

export async function listOrangeImports(limit = 30): Promise<OrangePpdImportSummary[]> {
  const res = await fetch(`${API_URL}/api/orange-ppd/imports?limit=${limit}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  await handleApiResponse(res);
  return res.json();
}

export async function listOrangeExcelImports(limit = 30): Promise<OrangePpdImportSummary[]> {
  const res = await fetch(`${API_URL}/api/orange-ppd/excel-imports?limit=${limit}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  await handleApiResponse(res);
  const data = await res.json();
  return data.map((x: any) => ({ ...x, kind: "XLSX" as const }));
}

export function dedupeByImportId(items: any[]) {
  const m = new Map<string, any>();
  for (const it of items || []) {
    if (!it?.import_id) continue;
    if (!m.has(it.import_id)) m.set(it.import_id, it);
  }
  return Array.from(m.values());
}

export async function listOrangePpdOptions(importId?: string): Promise<string[]> {
  const qs = new URLSearchParams();
  if (importId) qs.set("import_id", importId);

  const response = await fetch(`${API_URL}/api/orange-ppd/ppd-options${qs.toString() ? `?${qs}` : ""}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  await handleApiResponse(response);
  return response.json();
}

export async function compareOrangePpd(
  params: { importId?: string; ppd?: string; onlyMismatch?: boolean } = {}
): Promise<OrangePpdComparison[]> {
  const qs = new URLSearchParams();
  if (params.importId) qs.set("import_id", params.importId);
  if (params.ppd?.trim()) qs.set("ppd", params.ppd.trim());
  if (params.onlyMismatch) qs.set("only_mismatch", "true");

  const response = await fetch(`${API_URL}/api/orange-ppd/compare${qs.toString() ? `?${qs}` : ""}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  await handleApiResponse(response);
  return response.json();
}

export async function compareOrangePpdSummary(
  params: { importId?: string; ppd?: string } = {}
): Promise<OrangePpdCompareSummary> {
  const qs = new URLSearchParams();
  if (params.importId) qs.set("import_id", params.importId);
  if (params.ppd?.trim()) qs.set("ppd", params.ppd.trim());

  const res = await fetch(`${API_URL}/api/orange-ppd/compare-summary${qs.toString() ? `?${qs}` : ""}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  await handleApiResponse(res);
  return res.json();
}