// frontend/services/dossiersApi.ts

export type CroisementStatut =
  | "OK"
  | "MANQUANT_PIDI"
  | "MANQUANT_PRAXEDO"
  | "INCONNU";

export type CroisementDossier = {
  ot_key: string;
  nd_global: string | null;
  activite_code?: string | null;
  code_cible?: string | null;
  code_cloture_code?: string | null;
  date_planifiee?: string | null;
  statut_praxedo?: string | null;
  statut_pidi?: string | null;
  statut_croisement: CroisementStatut;
  commentaire_praxedo?: string | null;
  generated_at?: string | null;
};

export const croisementStatuts: readonly CroisementStatut[] = [
  "OK",
  "MANQUANT_PIDI",
  "MANQUANT_PRAXEDO",
  "INCONNU",
] as const;

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function listCroisement(params?: {
  q?: string;
  statut?: CroisementStatut;
  statut_pidi_contains?: string;
}): Promise<CroisementDossier[]> {
  const u = new URL(`${API}/api/dossiers`);
  if (params?.q) u.searchParams.set("q", params.q);
  if (params?.statut) u.searchParams.set("statut", params.statut);
  if (params?.statut_pidi_contains)
    u.searchParams.set("attachement", params.statut_pidi_contains);

  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur API /api/dossiers");
  return await res.json();
}
