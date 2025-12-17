import type {
  DossierFacturable,
  StatutFinal,
  CroisementStatut,
} from "@/types/dossier";

export type DossiersFilters = {
  q?: string;
  statut?: StatutFinal;
  croisement?: CroisementStatut;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

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
    const t = await res.text();
    console.error("Erreur /api/dossiers", res.status, t);
    throw new Error(`Erreur API /api/dossiers: ${res.status}`);
  }

  return (await res.json()) as DossierFacturable[];
}
