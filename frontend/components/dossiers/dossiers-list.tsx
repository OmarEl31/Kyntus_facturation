// frontend/components/dossiers/dossiers-list.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Upload, Download, X } from "lucide-react";

import { listDossiers, statutsFinal } from "@/services/dossiersApi";
import type { DossierFacturable } from "@/types/dossier";
import type { DossiersFilters } from "@/services/dossiersApi";

import FiltersBar from "./filters-bar";
import FileUploadModal from "./file-upload-modal";

type BadgeKind = "green" | "yellow" | "red" | "gray" | "purple" | "blue" | "orange";

function badgeClass(kind: BadgeKind) {
  switch (kind) {
    case "green":
      return "bg-green-100 text-green-700";
    case "yellow":
      return "bg-yellow-100 text-yellow-800";
    case "red":
      return "bg-red-100 text-red-700";
    case "purple":
      return "bg-purple-100 text-purple-700";
    case "blue":
      return "bg-blue-100 text-blue-700";
    case "orange":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function Badge({ txt, kind = "gray" }: { txt: string; kind?: BadgeKind }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badgeClass(kind)}`}>
      {txt}
    </span>
  );
}

function formatFrDate(v?: string | null) {
  if (!v) return "—";
  // si c’est déjà "dd/mm/yyyy hh:mm" on renvoie tel quel
  if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) return v;

  // ISO -> dd/mm/yyyy hh:mm
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v; // fallback brut

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function croisementKind(s?: string | null): BadgeKind {
  if (s === "OK") return "green";
  if (s === "ABSENT_PRAXEDO") return "yellow";
  if (s === "ABSENT_PIDI") return "red"; // ✅ rouge
  if (s === "INCONNU") return "gray";
  return "gray";
}

function statutFinalKind(s?: string | null): BadgeKind {
  if (s === "FACTURABLE") return "green";
  if (s === "NON_FACTURABLE") return "red";
  if (s === "CONDITIONNEL") return "yellow";
  if (s === "A_VERIFIER") return "orange";
  return "gray";
}

// ⚠️ Ajuste ce mapping si ton ancien tableau avait d'autres couleurs
function clotureKind(code?: string | null): BadgeKind {
  if (!code) return "gray";
  const c = code.toUpperCase();
  if (c === "DMS") return "green";
  if (c === "DEF") return "purple";
  if (c === "RRC") return "purple";
  if (c === "TSO") return "purple";
  if (c === "PDC") return "purple";
  return "blue";
}

function pidiLabel(d: DossierFacturable) {
  // rendu "comme avant" :
  // - null => Non envoyé à PIDI
  // - sinon => Validé par PIDI (ou d.statut_pidi)
  if (!d.statut_pidi) return "Non envoyé à PIDI";
  // si tu veux afficher le statut brut : return d.statut_pidi;
  return "Validé par PIDI";
}

function praxedoLabel(d: DossierFacturable) {
  return d.statut_praxedo ?? "—";
}

export default function DossiersList() {
  const [items, setItems] = useState<DossierFacturable[]>([]);
  const [filters, setFilters] = useState<DossiersFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importType, setImportType] = useState<"PRAXEDO" | "PIDI" | null>(null);
  const [exporting, setExporting] = useState(false);

  // Modale Articles
  const [articlesOpen, setArticlesOpen] = useState(false);
  const [articlesTarget, setArticlesTarget] = useState<DossierFacturable | null>(null);

  const load = useCallback(
    async (f?: DossiersFilters) => {
      const activeFilters = f ?? filters;
      setLoading(true);
      setError(null);
      try {
        const data = await listDossiers(activeFilters);
        setItems(data);
        if (f) setFilters(f);
      } catch (e: any) {
        setItems([]);
        setError(e?.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countByCroisement = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = it.statut_croisement ?? "INCONNU";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  function exportCSV() {
    setExporting(true);
    try {
      const headers = [
        "ot_key",
        "nd_global",
        "activite_code",
        "produit_code",
        "code_cible",
        "code_cloture_code",
        "regle_code",
        "libelle_regle",
        "statut_final",
        "statut_croisement",
        "statut_praxedo",
        "statut_pidi",
        "statut_articles",
        "date_planifiee",
      ];
      const rows = items.map((d) =>
        headers
          .map((h) => {
            const v = (d as any)[h];
            const s = v === null || v === undefined ? "" : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dossiers_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  function openArticles(d: DossierFacturable) {
    setArticlesTarget(d);
    setArticlesOpen(true);
  }

  return (
    <div className="space-y-4">
      <FiltersBar onSearch={(f) => load(f)} loading={loading} statuts={statutsFinal} />

      {error && (
        <div className="mx-2 p-2 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-600">{loading ? "Chargement…" : `${items.length} dossiers`}</div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(filters)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>

          <button
            onClick={() => setImportType("PRAXEDO")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Praxedo
          </button>

          <button
            onClick={() => setImportType("PIDI")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            PIDI
          </button>

          <button
            onClick={exportCSV}
            disabled={exporting || items.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Répartition */}
      <div className="px-2">
        <div className="text-sm text-gray-700 mb-2">Répartition :</div>
        <div className="flex flex-wrap gap-2">
          {countByCroisement.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <Badge txt={k.replace("_", " ")} kind={croisementKind(k)} />
              <span className="text-sm text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-auto bg-white mx-2">
        <table className="min-w-[1400px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">OT</th>
              <th className="p-3">ND</th>
              <th className="p-3">Activité</th>
              <th className="p-3">Produit</th>
              <th className="p-3">Code cible</th>
              <th className="p-3">Clôture</th>
              <th className="p-3">Règle</th>
              <th className="p-3">Statut final</th>
              <th className="p-3">Croisement</th>
              <th className="p-3">Praxedo</th>
              <th className="p-3">PIDI</th>
              <th className="p-3">Articles</th>
              <th className="p-3">Planifiée</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-6 text-center text-gray-500">
                  {loading ? "Chargement…" : "Aucun dossier à afficher."}
                </td>
              </tr>
            ) : (
              items.map((d) => {
                const sf = d.statut_final ?? "NON_FACTURABLE";
                const cro = d.statut_croisement ?? "INCONNU";

                return (
                  <tr key={d.key_match} className="border-t hover:bg-gray-50/50">
                    <td className="p-3 font-mono">{d.ot_key ?? "—"}</td>
                    <td className="p-3 font-mono">{d.nd_global ?? "—"}</td>
                    <td className="p-3">{d.activite_code ?? "—"}</td>
                    <td className="p-3">{d.produit_code ?? "—"}</td>
                    <td className="p-3">{d.code_cible ?? "—"}</td>

                    <td className="p-3">
                      {d.code_cloture_code ? (
                        <Badge txt={d.code_cloture_code} kind={clotureKind(d.code_cloture_code)} />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="p-3">
                      <div className="max-w-[520px] truncate" title={d.libelle_regle ?? ""}>
                        {d.libelle_regle ?? "—"}
                      </div>
                    </td>

                    <td className="p-3">
                      <Badge txt={sf.replaceAll("_", " ")} kind={statutFinalKind(sf)} />
                    </td>

                    <td className="p-3">
                      <Badge txt={cro.replaceAll("_", " ")} kind={croisementKind(cro)} />
                    </td>

                    <td className="p-3">
                      {d.statut_praxedo ? (
                        <Badge txt={praxedoLabel(d)} kind={d.statut_praxedo.toLowerCase().includes("valid") ? "green" : "gray"} />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="p-3">
                      {/* rendu “comme avant” : texte violet */}
                      <span className="text-purple-700 font-medium">{pidiLabel(d)}</span>
                    </td>

                    <td className="p-3">
                      <button
                        onClick={() => openArticles(d)}
                        className="inline-flex items-center px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200"
                      >
                        Vérifier
                      </button>
                    </td>

                    <td className="p-3">{formatFrDate(d.date_planifiee)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Articles */}
      {articlesOpen && articlesTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Articles</h2>
                <div className="text-xs text-gray-500">
                  OT: <span className="font-mono">{articlesTarget.ot_key ?? "—"}</span> • ND:{" "}
                  <span className="font-mono">{articlesTarget.nd_global ?? "—"}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setArticlesOpen(false);
                  setArticlesTarget(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded border bg-gray-50 p-3 text-sm">
              <div className="text-xs text-gray-500 mb-2">Liste des articles (PIDI)</div>
              <pre className="whitespace-pre-wrap break-words text-gray-800">
                {articlesTarget.liste_articles ?? "—"}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setArticlesOpen(false);
                  setArticlesTarget(null);
                }}
                className="border rounded px-3 py-2 hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {importType && (
        <FileUploadModal
          type={importType}
          onImported={() => {
            setImportType(null);
            load(filters);
          }}
          onClose={() => setImportType(null)}
        />
      )}
    </div>
  );
}
