"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listCroisement,
  type CroisementDossier,
  croisementStatuts,
  type CroisementStatut,
} from "@/services/dossiersApi";
import { RefreshCw, Upload, Download } from "lucide-react";
import { FiltersBar } from "./filters-bar";
import FileUploadModal from "./file-upload-modal";

function CroisementBadge({ value }: { value: CroisementStatut }) {
  const v = value ?? "INCONNU";
  const colors: Record<string, string> = {
    OK: "bg-green-100 text-green-700",
    MANQUANT_PIDI: "bg-red-100 text-red-700",
    MANQUANT_PRAXEDO: "bg-orange-100 text-orange-700",
    INCONNU: "bg-gray-100 text-gray-700",
  };
  return <span className={`px-2 py-1 rounded ${colors[v]}`}>{v}</span>;
}

export default function DossiersList() {
  const [items, setItems] = useState<CroisementDossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<"PRAXEDO" | "PIDI" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<{ q?: string; statut?: CroisementStatut; attachement?: string }>({});

  const load = useCallback(async (f?: typeof filters) => {
    setLoading(true);
    try {
      const data = await listCroisement(f);
      setItems(data);
      if (f) setFilters(f);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const queryParams = new URLSearchParams();
      if (filters.q) queryParams.append("q", filters.q);
      if (filters.statut) queryParams.append("statut", filters.statut);
      if (filters.attachement) queryParams.append("attachement", filters.attachement);

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dossiers/export?${queryParams.toString()}`;
      window.open(url, "_blank");
    } catch (e) {
      console.error("Erreur export:", e);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const countByStatut = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const key = it.statut_croisement ?? "INCONNU";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  return (
    <div className="space-y-4">
      <FiltersBar onSearch={(f) => load(f)} loading={loading} statuts={croisementStatuts} />

      <div className="flex items-center justify-end gap-2">
        <button title="Rafraîchir" onClick={() => load(filters)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50" disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </button>

        <button title="Importer Praxedo" onClick={() => setImportType("PRAXEDO")} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50">
          <Upload className="h-4 w-4" /> Praxedo
        </button>

        <button title="Importer PIDI" onClick={() => setImportType("PIDI")} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50">
          <Upload className="h-4 w-4" /> PIDI
        </button>

        <button title="Exporter CSV" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 disabled:opacity-50">
          <Download className="h-4 w-4" />
          {exporting ? "Export..." : "Exporter CSV"}
        </button>
      </div>

      {countByStatut.length > 0 && (
        <div className="text-sm text-gray-600">
          Répartition :{" "}
          {countByStatut.map(([k, v]) => (
            <span key={k} className="mr-3">
              <span className="font-medium">{k}</span> {v}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto border rounded shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">OT</th>
              <th className="px-3 py-2 text-left">ND global</th>
              <th className="px-3 py-2 text-left">Statut Praxedo</th>
              <th className="px-3 py-2 text-left">Statut PIDI</th>
              <th className="px-3 py-2 text-left">Planifiée</th>
              <th className="px-3 py-2 text-left">Croisement</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  Chargement…
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  Aucun dossier
                </td>
              </tr>
            )}

            {!loading &&
              items.map((d) => (
                <tr key={`${d.ot_key}-${d.nd_global}`} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{d.ot_key ?? "—"}</td>
                  <td className="px-3 py-2 font-mono">{d.nd_global ?? "—"}</td>
                  <td className="px-3 py-2">{d.statut_praxedo ?? "—"}</td>
                  <td className="px-3 py-2">{d.statut_pidi ?? "—"}</td>
                  <td className="px-3 py-2">{d.date_planifiee ? new Date(d.date_planifiee).toLocaleString("fr-FR") : "—"}</td>
                  <td className="px-3 py-2">
                    <CroisementBadge value={d.statut_croisement} />
                  </td>
                </tr>
              ))}
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
