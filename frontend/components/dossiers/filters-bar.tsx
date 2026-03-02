"use client";

import { useMemo, useState } from "react";

type Props = {
  onSearch: (filters: {
    q?: string;
    ppd?: string;
    statut_final?: string;
    statut_croisement?: string;
  }) => void;
  loading?: boolean;
  statuts: readonly string[];
  ppds: string[];
};

export default function FiltersBar({ onSearch, loading = false, statuts, ppds }: Props) {
  const [q, setQ] = useState("");
  const [ppd, setPpd] = useState("");
  const [statutFinal, setStatutFinal] = useState("");
  const [croisement, setCroisement] = useState("");

  const ppdOptions = useMemo(() => Array.from(new Set(ppds)).sort((a, b) => a.localeCompare(b)), [ppds]);

  function submit() {
    onSearch({
      q: q.trim() || undefined,
      ppd: ppd || undefined,
      statut_final: statutFinal || undefined,
      statut_croisement: croisement || undefined,
    });
  }

  function reset() {
    setQ("");
    setPpd("");
    setStatutFinal("");
    setCroisement("");
    onSearch({});
  }

  return (
    <div className="mx-2 rounded-lg border bg-white px-3 py-2">
      <div className="flex flex-wrap items-end gap-2">
        {/* Recherche compacte */}
        <div className="w-[320px] max-w-full">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Recherche (OT / ND)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Ex: 0142019878…"
              className="h-9 w-full rounded-md border bg-white pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* PPD */}
        <div className="min-w-[160px]">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">PPD</label>
          <select
            value={ppd}
            onChange={(e) => setPpd(e.target.value)}
            className="h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
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
        <div className="min-w-[170px]">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Statut final</label>
          <select
            value={statutFinal}
            onChange={(e) => setStatutFinal(e.target.value)}
            className="h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Tous</option>
            {statuts.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Croisement */}
        <div className="min-w-[180px]">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Croisement</label>
          <select
            value={croisement}
            onChange={(e) => setCroisement(e.target.value)}
            className="h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Tous</option>
            <option value="OK">OK</option>
            <option value="ABSENT_PRAXEDO">ABSENT PRAXEDO</option>
            <option value="ABSENT_PIDI">ABSENT PIDI</option>
            <option value="INCONNU">INCONNU</option>
          </select>
        </div>

        {/* Actions (collées aux filtres) */}
        <div className="flex items-end gap-2">
          <button
            onClick={reset}
            disabled={loading}
            className="h-9 rounded-md border bg-white px-3 text-sm hover:bg-gray-50 disabled:opacity-60"
            title="Réinitialiser"
          >
            Reset
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="h-9 rounded-md bg-gray-900 px-3 text-sm text-white hover:bg-black disabled:opacity-60"
            title="Appliquer"
          >
            Filtrer
          </button>
        </div>
      </div>
    </div>
  );
}
