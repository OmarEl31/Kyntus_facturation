"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Upload, Download } from "lucide-react";

import { listDossiers, statutsFinal } from "@/services/dossiersApi";
import type { DossierFacturable } from "@/types/dossier";
import type { DossiersFilters } from "@/services/dossiersApi";

import FiltersBar from "./filters-bar";
import FileUploadModal from "./file-upload-modal";

export default function DossiersList() {
  const [items, setItems] = useState<DossierFacturable[]>([]);
  const [filters, setFilters] = useState<DossiersFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importType, setImportType] = useState<"PRAXEDO" | "PIDI" | null>(null);
  const [exporting, setExporting] = useState(false);

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
        console.error(e);
        setItems([]);
        setError(e?.message || "Erreur lors du chargement des dossiers.");
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
        "ot_key","nd_global","activite_code","produit_code","regle_code","libelle_regle",
        "statut_final","statut_croisement","statut_praxedo","statut_pidi","statut_articles","date_planifiee"
      ];
      const rows = items.map((d) =>
        headers.map((h) => {
          const v = (d as any)[h];
          const s = v === null || v === undefined ? "" : String(v);
          return `"${s.replace(/"/g, '""')}"`
        }).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dossiers_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  const badge = (txt: string, kind: "green" | "yellow" | "red" | "gray" = "gray") => {
    const cls =
      kind === "green"
        ? "bg-green-100 text-green-700"
        : kind === "yellow"
        ? "bg-yellow-100 text-yellow-700"
        : kind === "red"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-700";
    return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{txt}</span>;
  };

  return (
    <div className="space-y-4">
      <FiltersBar
        onSearch={(f) => load(f)}
        loading={loading}
        statuts={statutsFinal}
      />

      {/* Actions */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-600">
          {loading ? "Chargement…" : `${items.length} dossiers`}
        </div>

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

      {/* Erreur */}
      {error && (
        <div className="mx-2 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Répartition */}
      <div className="px-2">
        <div className="text-sm text-gray-700 mb-2">Répartition :</div>
        <div className="flex flex-wrap gap-2">
          {countByCroisement.map(([k, v]) => {
            const kind =
              k === "OK" ? "green" : (k.toLowerCase().includes("absent") ? "yellow" : "gray");
            return (
              <div key={k} className="flex items-center gap-2">
                {badge(k, kind as any)}
                <span className="text-sm text-gray-700">{v}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-auto bg-white mx-2">
        <table className="min-w-[1200px] w-full text-sm">
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
              items.map((d) => (
                <tr key={d.key_match} className="border-t">
                  <td className="p-3 font-mono">{d.ot_key ?? "—"}</td>
                  <td className="p-3 font-mono">{d.nd_global ?? "—"}</td>
                  <td className="p-3">{d.activite_code ?? "—"}</td>
                  <td className="p-3">{d.produit_code ?? "—"}</td>
                  <td className="p-3">{d.code_cible ?? "—"}</td>
                  <td className="p-3">{d.code_cloture_code ?? "—"}</td>
                  <td className="p-3">{d.libelle_regle ?? "—"}</td>

                  <td className="p-3">
                    {d.statut_final === "FACTURABLE"
                      ? badge("FACTURABLE", "green")
                      : d.statut_final === "NON_FACTURABLE"
                      ? badge("NON FACTURABLE", "red")
                      : badge(d.statut_final.replace("_", " "), "yellow")}
                  </td>

                  <td className="p-3">{badge(d.statut_croisement ?? "INCONNU", d.statut_croisement === "OK" ? "green" : "yellow")}</td>
                  <td className="p-3">{d.statut_praxedo ?? "—"}</td>
                  <td className="p-3">{d.statut_pidi ?? "—"}</td>
                  <td className="p-3">{d.statut_articles ?? "—"}</td>
                  <td className="p-3">{d.date_planifiee ?? "—"}</td>
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
