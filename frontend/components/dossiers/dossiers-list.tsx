// frontend/components/dossiers/dossiers-list.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Upload, Download } from "lucide-react";

import {
  listDossiers,
  statutsFinal,
  type DossiersFilters,
} from "@/services/dossiersApi";

import type {
  DossierFacturable,
  StatutFinal,
  CroisementStatut,
} from "@/types/dossier";

import FiltersBar from "./filters-bar";
import FileUploadModal from "./file-upload-modal";

// ----------------------------------------------------
//  MODALE DE VERIFICATION DES ARTICLES
// ----------------------------------------------------

type VerificationState = {
  open: boolean;
  dossier: DossierFacturable | null;
};

function VerificationModal({
  state,
  onClose,
}: {
  state: VerificationState;
  onClose: () => void;
}) {
  const dossier = state.dossier;
  if (!state.open || !dossier) return null;

  const articlesAttendus =
    dossier.documents_attendus?.join(", ") || "—";
  const articlesPoses = dossier.liste_articles ?? "—";
  const resultat = dossier.statut_articles ?? "N/A";

  const badgeClass =
    resultat === "OK"
      ? "bg-green-100 text-green-700"
      : resultat === "A_VERIFIER"
      ? "bg-yellow-100 text-yellow-700"
      : resultat === "A_CONTESTER"
      ? "bg-red-100 text-red-700"
      : "bg-red-50 text-red-600";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-[520px] max-w-full">
        <h2 className="text-lg font-semibold mb-4">
          Vérification des articles – OT {dossier.ot_key}
        </h2>

        <div className="space-y-3 text-sm">
          <p>
            <span className="font-semibold">Articles attendus :</span>{" "}
            {articlesAttendus}
          </p>
          <p>
            <span className="font-semibold">Articles posés :</span>{" "}
            {articlesPoses}
          </p>
          <p className="flex items-center gap-2">
            <span className="font-semibold">Résultat :</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}
            >
              {resultat}
            </span>
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------- BADGES UI ---------------------- //

function StatutFinalBadge({ value }: { value: StatutFinal }) {
  const map: Record<StatutFinal, string> = {
    FACTURABLE: "bg-green-100 text-green-700",
    CONDITIONNEL: "bg-yellow-100 text-yellow-800",
    NON_FACTURABLE: "bg-red-100 text-red-700",
    A_VERIFIER: "bg-orange-100 text-orange-700",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[value]}`}>
      {(value ?? "—").replace("_", " ")}
    </span>
  );
}

function CroisementBadge({
  value,
}: {
  value?: CroisementStatut | string | null;
}) {
  if (!value) {
    return (
      <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">
        —
      </span>
    );
  }

  const map: Record<CroisementStatut, string> = {
    OK: "bg-green-100 text-green-700",
    ABSENT_PRAXEDO: "bg-yellow-100 text-yellow-700",
    ABSENT_PIDI: "bg-red-100 text-red-700",
    NON_ENVOYE_PIDI: "bg-purple-100 text-purple-700",
    INCONNU: "bg-gray-200 text-gray-700",
  };

  const label: Record<CroisementStatut, string> = {
    OK: "OK",
    ABSENT_PRAXEDO: "ABSENT PRAXEDO",
    ABSENT_PIDI: "ABSENT PIDI",
    NON_ENVOYE_PIDI: "NON ENVOYÉ PIDI",
    INCONNU: "INCONNU",
  };

  const v = value as CroisementStatut;
  const classes = map[v] ?? "bg-gray-200 text-gray-700";
  const txt = label[v] ?? String(value);

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${classes}`}>
      {txt}
    </span>
  );
}

function ClotureBadge({
  label,
  ok,
}: {
  label?: string | null;
  ok?: boolean | null;
}) {
  if (!label) {
    return (
      <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-600">
        —
      </span>
    );
  }

  const cls = ok
    ? "bg-green-100 text-green-700"
    : "bg-purple-100 text-purple-700";

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function PraxedoBadge({ value }: { value?: string | null }) {
  if (!value) {
    return (
      <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-500">
        —
      </span>
    );
  }

  const map: Record<string, string> = {
    Validée: "bg-green-100 text-green-700",
    Planifiée: "bg-blue-100 text-blue-700",
    Annulée: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        map[value] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {value}
    </span>
  );
}

// ---------------------- COMPOSANT PRINCIPAL ---------------------- //

export default function DossiersList() {
  const [items, setItems] = useState<DossierFacturable[]>([]);
  const [filters, setFilters] = useState<DossiersFilters>({});
  const [loading, setLoading] = useState(false);
  const [importType, setImportType] = useState<"PRAXEDO" | "PIDI" | null>(
    null
  );
  const [exporting, setExporting] = useState(false);
  const [verification, setVerification] = useState<VerificationState>({
    open: false,
    dossier: null,
  });

  // ---------------------- LOAD AVEC FILTRES ---------------------- //
  const load = useCallback(
    async (f?: DossiersFilters) => {
      const activeFilters = f ?? filters;

      setLoading(true);
      try {
        const data = await listDossiers(activeFilters);
        setItems(data);
        if (f) setFilters(f);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    load();
  }, [load]);

  const countByCroisement = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = it.statut_croisement ?? "INCONNU";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries());
  }, [items]);

  // ---------------------- EXPORT CSV ---------------------- //
  async function handleExport() {
    try {
      if (!items.length) {
        alert("Aucune donnée à exporter.");
        return;
      }

      setExporting(true);

      const header = [
        "OT",
        "ND",
        "Activité",
        "Produit",
        "Code cible",
        "Clôture",
        "Règle",
        "Libellé règle",
        "Statut final",
        "Croisement",
        "Praxedo",
        "PIDI",
        "Planifiée",
      ];

      const csv = (v: unknown): string => {
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/\r?\n/g, " ");
        if (s.includes(";") || s.includes('"')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const rows = items.map((d) => {
        const datePlanifiee = d.date_planifiee
          ? new Date(d.date_planifiee).toLocaleString("fr-FR")
          : "";

        return [
          csv(d.ot_key),
          csv(d.nd_global),
          csv(d.activite_code),
          csv(d.produit_code),
          csv(d.code_cible),
          csv(d.code_cloture_code),
          csv(d.regle_code),
          csv(d.libelle_regle),
          csv(d.statut_final),
          csv(d.statut_croisement),
          csv(d.statut_praxedo),
          csv(d.statut_pidi),
          csv(datePlanifiee),
        ].join(";");
      });

      const csvContent = [header.join(";"), ...rows].join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "dossiers_export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erreur export CSV", e);
      alert("Erreur lors de l'export CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* BARRE DE FILTRES */}
      <FiltersBar
        onSearch={(f) => load(f)}
        loading={loading}
        statuts={statutsFinal}
      />

      {/* BOUTONS IMPORT / EXPORT */}
      <div className="flex justify-end gap-3 pr-4">
        <button
          className="px-3 py-2 border rounded hover:bg-gray-50"
          onClick={() => load(filters)}
          disabled={loading}
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        <button
          onClick={() => setImportType("PRAXEDO")}
          className="px-4 py-2 bg-white border rounded flex items-center gap-2 hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          Praxedo
        </button>

        <button
          onClick={() => setImportType("PIDI")}
          className="px-4 py-2 bg-white border rounded flex items-center gap-2 hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          PIDI
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {/* RÉPARTITION PAR CROISEMENT */}
      <div className="text-sm text-gray-600 pl-2">
        Répartition :
        {countByCroisement.map(([k, v]) => (
          <span key={k} className="ml-3 inline-flex items-center gap-1">
            <CroisementBadge value={k as CroisementStatut} /> {v}
          </span>
        ))}
      </div>

      {/* TABLEAU PRINCIPAL */}
      <div className="overflow-x-auto border rounded shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2">OT</th>
              <th className="px-3 py-2">ND</th>
              <th className="px-3 py-2">Activité</th>
              <th className="px-3 py-2">Produit</th>
              <th className="px-3 py-2">Code cible</th>
              <th className="px-3 py-2">Clôture</th>
              <th className="px-3 py-2">Règle</th>
              <th className="px-3 py-2">Statut final</th>
              <th className="px-3 py-2">Croisement</th>
              <th className="px-3 py-2">Praxedo</th>
              <th className="px-3 py-2">PIDI</th>
              <th className="px-3 py-2">Articles</th>
              <th className="px-3 py-2">Planifiée</th>
            </tr>
          </thead>

          <tbody>
            {items.map((d) => (
              <tr key={d.key_match} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-mono">{d.ot_key ?? "—"}</td>
                <td className="px-3 py-2 font-mono">{d.nd_global ?? "—"}</td>

                <td className="px-3 py-2">{d.activite_code ?? "—"}</td>
                <td className="px-3 py-2">{d.produit_code ?? "—"}</td>
                <td className="px-3 py-2">{d.code_cible ?? "—"}</td>

                <td className="px-3 py-2">
                  <ClotureBadge
                    label={d.code_cloture_code}
                    ok={d.cloture_facturable ?? false}
                  />
                </td>

                <td className="px-3 py-2">
                  {d.regle_code ? (
                    <>
                      <span className="font-mono">{d.regle_code}</span>
                      {d.libelle_regle ? ` – ${d.libelle_regle}` : ""}
                    </>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="px-3 py-2">
                  <StatutFinalBadge value={d.statut_final} />
                </td>

                <td className="px-3 py-2">
                  <CroisementBadge value={d.statut_croisement} />
                </td>

                <td className="px-3 py-2">
                  <PraxedoBadge value={d.statut_praxedo} />
                </td>

                <td className="px-3 py-2 text-purple-700 font-medium">
                  {d.statut_pidi ?? "—"}
                </td>

                <td className="px-3 py-2">
                  <button
                    onClick={() =>
                      setVerification({ open: true, dossier: d })
                    }
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Vérifier
                  </button>
                </td>

                <td className="px-3 py-2">
                  {d.date_planifiee
                    ? new Date(d.date_planifiee).toLocaleString("fr-FR")
                    : "—"}
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

      <VerificationModal
        state={verification}
        onClose={() =>
          setVerification({ open: false, dossier: null })
        }
      />
    </div>
  );
}
