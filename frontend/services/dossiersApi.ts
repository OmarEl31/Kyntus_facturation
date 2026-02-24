// frontend/services/dossiersApi.ts

import { normalizeString, extractPalierFromEvenements } from '../utils/stringUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  
  // ✅ Champs existants
  palier: string | null;
  
  // ✅ NOUVEAUX CHAMPS
  palier_phrase?: string | null;
  evenements?: string | null;
  compte_rendu?: string | null;
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

/**
 * Extrait le nom de fichier depuis l'en-tête Content-Disposition
 */
function extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  
  // Plusieurs patterns possibles
  const patterns = [
    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,  // Pattern standard
    /filename="([^"]+)"/,                       // filename="..."
    /filename=([^;]+)/,                          // filename=...
  ];
  
  for (const pattern of patterns) {
    const match = contentDisposition.match(pattern);
    if (match) {
      // Nettoyer le nom de fichier
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
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Export Excel failed:", response.status, errorText);
    throw new Error(`Erreur ${response.status}: ${errorText}`);
  }

  // Récupérer le blob
  const blob = await response.blob();
  
  // Vérifier que c'est bien un fichier Excel
  if (blob.size === 0) {
    throw new Error("Le fichier Excel est vide");
  }

  // Créer l'URL de téléchargement
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;

  // Déterminer le nom du fichier
  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = extractFilenameFromContentDisposition(contentDisposition);
  
  // Fallback si pas de nom ou nom invalide
  if (!filename || !filename.endsWith('.xlsx')) {
    // Construire un nom de fichier par défaut avec la date
    const date = new Date().toISOString().split('T')[0];
    filename = `dossiers_export_${date}.xlsx`;
  }

  console.log("📥 Téléchargement Excel - Fichier:", filename);

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Nettoyer l'URL
  setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl);
  }, 100);
}

/* =========================
   IMPORTS (CSV)
========================= */

export interface ImportCsvOptions {
  type: "PRAXEDO" | "PIDI" | "ORANGE_PPD" | "PRAXEDO_CR10";
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

  const endpoint =
    type === "PRAXEDO"
      ? `${API_URL}/api/import/praxedo`
      : type === "PIDI"
      ? `${API_URL}/api/import/pidi`
      : type === "PRAXEDO_CR10"
      ? `${API_URL}/api/import/praxedo-cr10`
      : `${API_URL}/api/orange-ppd/import`;

  console.log(`📤 Import CSV - Type: ${type}, Endpoint: ${endpoint}`);
  console.log(`📄 Fichier: ${file.name}, Taille: ${file.size} bytes, Délimiteur: ${delimiter}`);

  try {
    const response = await fetch(endpoint, { method: "POST", body: formData, signal });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorJson = await response.json();
        errorDetail = JSON.stringify(errorJson, null, 2);
      } catch {
        errorDetail = await response.text();
      }
      
      console.error(`❌ Erreur ${response.status}:`, errorDetail);
      throw new Error(`Erreur ${response.status}: ${errorDetail}`);
    }

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

/* =========================
   ORANGE PPD (CSV + XLSX)
========================= */

export interface OrangePpdImportSummary {
  import_id: string;
  filename?: string | null;
  row_count?: number | null;
  imported_by?: string | null;
  imported_at?: string | null;

  // Excel-only
  sheet_name?: string | null;

  // pour l'UI (facultatif)
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

  // Nouveaux champs (XLSX relevé par relevé)
  releve?: string | null;

  // nds peut venir comme array Postgres (text[]) ou string (selon sérialisation)
  nds?: string[] | string | null;

  // OT réel PIDI si ajouté au back
  ot_pidi?: string | null;
};

/**
 * Upload XLSX Orange PPD (PPDATEL multi-feuille)
 * Endpoint backend: /api/orange-ppd/import-excel
 */
export async function uploadOrangePpdExcel(file: File): Promise<ImportCsvResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/orange-ppd/import-excel`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * CSV + XLSX merged list.
 */
export async function listOrangeImports(limit = 20): Promise<OrangePpdImportSummary[]> {
  const [csvRes, xlsxRes] = await Promise.all([
    fetch(`${API_URL}/api/orange-ppd/imports?limit=${limit}`),
    fetch(`${API_URL}/api/orange-ppd/excel-imports?limit=${limit}`),
  ]);

  if (!csvRes.ok) throw new Error(`Erreur ${csvRes.status}: ${await csvRes.text()}`);
  if (!xlsxRes.ok) throw new Error(`Erreur ${xlsxRes.status}: ${await xlsxRes.text()}`);

  const csv = (await csvRes.json()) as OrangePpdImportSummary[];
  const xlsx = (await xlsxRes.json()) as OrangePpdImportSummary[];

  const merged: OrangePpdImportSummary[] = [
    ...csv.map((x) => ({ ...x, kind: "CSV" as const })),
    ...xlsx.map((x) => ({ ...x, kind: "XLSX" as const })),
  ];

  merged.sort((a, b) => String(b.imported_at || "").localeCompare(String(a.imported_at || "")));

  return merged.slice(0, limit);
}

export async function listOrangePpdOptions(importId?: string): Promise<string[]> {
  const qs = new URLSearchParams();
  if (importId) qs.set("import_id", importId);

  const response = await fetch(`${API_URL}/api/orange-ppd/ppd-options${qs.toString() ? `?${qs}` : ""}`);
  if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function compareOrangePpd(
  params: { importId?: string; ppd?: string; onlyMismatch?: boolean } = {}
): Promise<OrangePpdComparison[]> {
  const qs = new URLSearchParams();
  if (params.importId) qs.set("import_id", params.importId);
  if (params.ppd?.trim()) qs.set("ppd", params.ppd.trim());
  if (params.onlyMismatch) qs.set("only_mismatch", "true");

  const response = await fetch(`${API_URL}/api/orange-ppd/compare${qs.toString() ? `?${qs}` : ""}`);
  if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function compareOrangePpdSummary(
  params: { importId?: string; ppd?: string } = {}
): Promise<OrangePpdCompareSummary> {
  const qs = new URLSearchParams();
  if (params.importId) qs.set("import_id", params.importId);
  if (params.ppd?.trim()) qs.set("ppd", params.ppd.trim());

  const res = await fetch(`${API_URL}/api/orange-ppd/compare-summary${qs.toString() ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}: ${await res.text()}`);
  return res.json();
}