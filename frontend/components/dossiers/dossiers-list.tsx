"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Upload, Download } from "lucide-react";

import { listDossiers, statutsFinal } from "@/services/dossiersApi";
import type { DossierFacturable, CroisementStatut } from "@/types/dossier";
import type { DossiersFilters } from "@/services/dossiersApi";

import FiltersBar from "./filters-bar";
import FileUploadModal from "./file-upload-modal";

type VerificationState = { open: boolean; dossier: DossierFacturable | null };

function croisementLabel(s: CroisementStatut | null | undefined) {
  if (!s) return "UNKNOWN";
  if (s === "OK") return "OK";
  if (s === "PIDI_only") return "ABSENT PRAXEDO";
  if (s === "Praxedo_only") return "ABSENT PIDI";
  return "UNKNOWN";
}

function badgeClass(status: string) {
  if (status === "OK") return "bg-green-100 text-green-700";
  if (status.includes("ABSENT")) return "bg-yellow-100 text-yellow-700";
  if (status === "UNKNOWN") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

function statutFinalClass(s: string) {
  if (s === "FACTURABLE") return "bg-green-100 text-green-700";
  if (s === "CONDITIONNEL") return "bg-yellow-100 text-yellow-700";
  if (s === "A_VERIFIER") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export default function DossiersList() {
  const [items, setItems] = useState<DossierFacturable[]>([]);
  const [filters, setFilters] = useState<DossiersFilters>({});
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<"PRAXEDO" | "PIDI" | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    async (f?: DossiersFilters) => {
      const activeFilters = f ?? filters;
      setLoading(true);
      try {
        const data = await listDossiers(activeFilters);
        setItems(data);
        if (f) setFilters(f);
      } catch (e) {
        console.error(e);
        setItems([]);
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
      const k = croisementLabel(it.statut_croisement);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  async function exportCsv() {
    setExporting(true);
    try {
      const headers = [
        "ot_key",
        "nd_global",
        "activite_code",
        "produit_code",
        "statut_final",
        "statut_croisement",
        "statut_praxedo",
        "statut_pidi",
        "date_planifiee",
      ];

      const rows = items.map((d) =>
        headers
          .map((h) => {
            const v = (d as any)[h];
            const s = v == null ? "" : String(v);
            return `"${s.replaceAll('"', '""')}"`;
          })
          .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `dossiers_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <FiltersBar onSearch={(f) => load(f)} loading={loading} statuts={statutsFinal} />

      {/* Boutons */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-600">
          {loading ? "Chargement…" : `${items.length} dossiers`}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(filters)}
            className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>

          <button
            onClick={() => setImportType("PRAXEDO")}
            className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Praxedo
          </button>

          <button
            onClick={() => setImportType("PIDI")}
            className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            PIDI
          </button>

          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
            disabled={exporting || items.length === 0}
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Répartition */}
      <div className="px-2 flex items-center gap-3 text-sm">
        <span className="text-gray-600">Répartition :</span>
        {countByCroisement.map(([k, v]) => (
          <span key={k} className={`px-2 py-1 rounded text-xs font-medium ${badgeClass(k)}`}>
            {k} {v}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto bg-white">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">OT</th>
              <th className="px-3 py-2">ND</th>
              <th className="px-3 py-2">Activité</th>
              <th className="px-3 py-2">Produit</th>
              <th className="px-3 py-2">Règle</th>
              <th className="px-3 py-2">Statut final</th>
              <th className="px-3 py-2">Croisement</th>
              <th className="px-3 py-2">Praxedo</th>
              <th className="px-3 py-2">PIDI</th>
              <th className="px-3 py-2">Planifiée</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-gray-500">
                  Aucun dossier à afficher.
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.key_match} className="border-t">
                  <td className="px-3 py-2 font-mono">{d.ot_key ?? "—"}</td>
                  <td className="px-3 py-2 font-mono">{d.nd_global ?? "—"}</td>
                  <td className="px-3 py-2">{d.activite_code ?? "—"}</td>
                  <td className="px-3 py-2">{d.produit_code ?? "—"}</td>
                  <td className="px-3 py-2">{d.libelle_regle ?? "—"}</td>

                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statutFinalClass(d.statut_final)}`}>
                      {d.statut_final.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass(croisementLabel(d.statut_croisement))}`}>
                      {croisementLabel(d.statut_croisement)}
                    </span>
                  </td>

                  <td className="px-3 py-2">{d.statut_praxedo ?? "—"}</td>
                  <td className="px-3 py-2">{d.statut_pidi ?? "—"}</td>
                  <td className="px-3 py-2">{d.date_planifiee ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
