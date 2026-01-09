"use client";
import { useMemo, useState } from "react";
import { Search, Filter, RotateCcw } from "lucide-react";
import type { StatutFinal, CroisementStatut } from "@/types/dossier";

type Props = {
  onSearch: (filters: { q?: string; ppd?: string; statut?: StatutFinal; croisement?: CroisementStatut }) => void;
  loading?: boolean;
  statuts: readonly StatutFinal[];
  ppds?: string[]; // liste existante (options)
};

export default function FiltersBar({ onSearch, loading, statuts, ppds }: Props) {
  const [q, setQ] = useState("");
  const [ppd, setPpd] = useState("");
  const [statut, setStatut] = useState<StatutFinal | "">("");
  const [croisement, setCroisement] = useState<CroisementStatut | "">("");

  const ppdOptions = useMemo(() => (ppds ?? []).filter(Boolean), [ppds]);

  function submit(next?: Partial<{ q: string; ppd: string; statut: StatutFinal | ""; croisement: CroisementStatut | "" }>) {
    const nq = (next?.q ?? q).trim();
    const nppd = (next?.ppd ?? ppd).trim();
    const nstatut = (next?.statut ?? statut);
    const ncrois = (next?.croisement ?? croisement);

    onSearch({
      q: nq || undefined,
      ppd: nppd || undefined,
      statut: nstatut || undefined,
      croisement: ncrois || undefined,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleReset() {
    setQ("");
    setPpd("");
    setStatut("");
    setCroisement("");
    onSearch({});
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 px-2 py-2">
      {/* Recherche OT/ND */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600 mb-1">Recherche (OT / ND)</label>
        <div className="flex items-center border rounded px-2 py-1 bg-white">
          <Search className="h-4 w-4 text-gray-400 mr-1" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="outline-none text-sm flex-1"
            placeholder="Ex: 0142019878..."
          />
        </div>
      </div>

      {/* ✅ PPD : vraie liste déroulante (valeurs existantes) */}
      <div className="flex flex-col min-w-[220px]">
        <label className="text-xs text-gray-600 mb-1">
          PPD {ppdOptions.length ? <span className="text-gray-400">({ppdOptions.length})</span> : null}
        </label>
        <select
          value={ppd}
          onChange={(e) => setPpd(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-white"
          disabled={!ppdOptions.length}
        >
          <option value="">Tous</option>
          {ppdOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      {/* Statut final */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600 mb-1">Statut final</label>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value as StatutFinal | "")}
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">Tous</option>
          {statuts.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Croisement */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600 mb-1">Croisement</label>
        <select
          value={croisement}
          onChange={(e) => setCroisement(e.target.value as CroisementStatut | "")}
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">Tous</option>
          <option value="OK">OK</option>
          <option value="ABSENT_PRAXEDO">ABSENT PRAXEDO</option>
          <option value="ABSENT_PIDI">ABSENT PIDI</option>
          <option value="INCONNU">INCONNU</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded border bg-white text-sm hover:bg-gray-50 disabled:opacity-60"
          title="Réinitialiser les filtres"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-60"
        >
          <Filter className="h-4 w-4" /> Filtrer
        </button>
      </div>
    </form>
  );
}
