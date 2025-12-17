import type { DossierFacturable, StatutFinal, CroisementStatut } from "@/types/dossier";

export type DossiersFilters = {
  q?: string;
  statut?: StatutFinal;
  croisement?: CroisementStatut;
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const statutsFinal: readonly StatutFinal[] = [
  "FACTURABLE",
  "CONDITIONNEL",
  "NON_FACTURABLE",
  "A_VERIFIER",
];

export async function listDossiers(filters?: DossiersFilters): Promise<DossierFacturable[]> {
  const params = new URLSearchParams();

  if (filters?.q) params.set("q", filters.q);
  if (filters?.statut) params.set("statut", filters.statut);
  if (filters?.croisement) params.set("croisement", filters.croisement);

  const qs = params.toString();
  const url = `${API_BASE}/api/dossiers${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Erreur /api/dossiers", res.status, txt);
    throw new Error(`Erreur API /api/dossiers (${res.status})`);
  }

  return (await res.json()) as DossierFacturable[];
}

export async function importCsv(type: "PRAXEDO" | "PIDI", file: File, delimiter: "," | ";") {
  const endpoint = type === "PRAXEDO" ? "/api/import/praxedo" : "/api/import/pidi";

  const fd = new FormData();
  fd.append("file", file);
  fd.append("delimiter", delimiter);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Erreur import", type, res.status, txt);
    throw new Error(txt || `Erreur import ${type} (${res.status})`);
  }

  return await res.json().catch(() => ({}));
}
