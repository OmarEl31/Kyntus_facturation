// frontend/services/dossiersApi.ts
import type { DossierFacturable, StatutFinal, CroisementStatut } from "@/types/dossier";

export type DossiersFilters = {
  q?: string;
  statut?: StatutFinal;
  croisement?: CroisementStatut;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const statutsFinal: readonly StatutFinal[] = [
  "FACTURABLE",
  "CONDITIONNEL",
  "NON_FACTURABLE",
  "A_VERIFIER",
];

async function parseError(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const j = await res.json();
      return j?.detail ? String(j.detail) : JSON.stringify(j);
    }
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function listDossiers(filters?: DossiersFilters): Promise<DossierFacturable[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.statut) params.set("statut", filters.statut);
  if (filters?.croisement) params.set("croisement", filters.croisement);

  const url = `${API_BASE}/api/dossiers${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));

  return (await res.json()) as DossierFacturable[];
}

export async function importCsv(type: "PRAXEDO" | "PIDI", file: File, delimiter: "," | ";") {
  const endpoint = type === "PRAXEDO" ? "/api/import/praxedo" : "/api/import/pidi";
  const fd = new FormData();
  fd.append("file", file);
  fd.append("delimiter", delimiter);

  const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
