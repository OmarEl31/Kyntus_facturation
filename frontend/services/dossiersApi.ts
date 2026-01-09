// frontend/services/dossiersApi.ts
import type { DossierFacturable, StatutFinal, CroisementStatut } from "@/types/dossier";

export type DossiersFilters = {
  q?: string;
  statut?: StatutFinal;
  croisement?: CroisementStatut;
  ppd?: string;
};

// adapte si tu as déjà NEXT_PUBLIC_API_URL
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000") + "/api";

export const statutsFinal = ["FACTURABLE", "CONDITIONNEL", "NON_FACTURABLE", "A_VERIFIER"] as const;

// --------- helpers ----------
async function readError(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    const detail = (data as any)?.detail;

    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      return detail
        .map((x: { msg?: string } | string | unknown) =>
          typeof x === "string" ? x : (x as any)?.msg ?? JSON.stringify(x)
        )
        .join(" | ");
    }

    return JSON.stringify(data);
  } catch {
    try {
      return await res.text();
    } catch {
      return `HTTP ${res.status}`;
    }
  }
}

// --------- GET dossiers ----------
export async function listDossiers(filters: DossiersFilters = {}): Promise<DossierFacturable[]> {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.statut) params.set("statut", filters.statut);
  if (filters.croisement) params.set("croisement", filters.croisement);
  if (filters.ppd) params.set("ppd", filters.ppd);

  const url = `${API_BASE}/dossiers${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as DossierFacturable[];
}

// --------- IMPORT CSV (nouvelle signature objet) ----------
export async function importCsv(args: {
  type: "PRAXEDO" | "PIDI";
  file: File;
  delimiter?: ";" | ",";
  signal?: AbortSignal;
}): Promise<any> {
  const { type, file, delimiter = ";", signal } = args;

  const endpoint = type === "PRAXEDO" ? "praxedo" : "pidi";

  // ✅ pour éviter les 422 liés à la validation de Form fields côté backend,
  // on passe delimiter en query-string et on envoie seulement file en multipart
  const url = `${API_BASE}/import/${endpoint}?delimiter=${encodeURIComponent(delimiter)}`;

  const form = new FormData();
  form.append("file", file, file.name);

  const res = await fetch(url, {
    method: "POST",
    body: form,
    signal,
  });

  if (!res.ok) throw new Error(await readError(res));

  // si backend renvoie JSON
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

// --------- WRAPPERS (pour ne rien casser si l’existant les utilise) ----------
export async function importPraxedo(file: File, delimiter: ";" | "," = ";", signal?: AbortSignal) {
  return importCsv({ type: "PRAXEDO", file, delimiter, signal });
}

export async function importPidi(file: File, delimiter: ";" | "," = ";", signal?: AbortSignal) {
  return importCsv({ type: "PIDI", file, delimiter, signal });
}
