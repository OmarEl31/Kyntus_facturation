"use client";

import { useMemo, useState } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";

type Props = {
  onSearch: (filters: { q?: string; ppd?: string; statut_final?: string; statut_croisement?: string }) => void;
  loading?: boolean;
  statuts: readonly string[];
  ppds: string[];
};

const inputCls =
  "h-9 w-full rounded-md border bg-white px-9 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-50 disabled:text-gray-500";

const selectCls =
  "h-9 w-full rounded-md border bg-white px-3 pr-8 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-50 disabled:text-gray-500";

export default function FiltersBar({ onSearch, loading, statuts, ppds }: Props) {
  const [q, setQ] = useState("");
  const [ppd, setPpd] = useState("Tous");
  const [statutFinal, setStatutFinal] = useState("Tous");
  const [croisement, setCroisement] = useState("Tous");

  const ppdOptions = useMemo(() => ["Tous", ...ppds], [ppds]);

  function submit() {
    const f: any = {};
    const qq = q.trim();
    if (qq) f.q = qq;
    if (ppd !== "Tous") f.ppd = ppd;
    if (statutFinal !== "Tous") f.statut_final = statutFinal;
    if (croisement !== "Tous") f.statut_croisement = croisement;
    onSearch(f);
  }

  function reset() {
    setQ("");
    setPpd("Tous");
    setStatutFinal("Tous");
    setCroisement("Tous");
    onSearch({});
  }

  return (
    <div className="mx-2">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-white px-3 py-2">
        {/* Recherche */}
        <div className="min-w-[260px] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Recherche (OT / ND)</label>
          <div className="relative">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex: 0142019878..."
              className={inputCls}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
        </div>

        {/* PPD */}
        <div className="w-[180px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">PPD</label>
          <div className="relative">
            <select value={ppd} onChange={(e) => setPpd(e.target.value)} className={selectCls} disabled={loading}>
              {ppdOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
          </div>
        </div>

        {/* Statut final */}
        <div className="w-[180px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Statut final</label>
          <div className="relative">
            <select
              value={statutFinal}
              onChange={(e) => setStatutFinal(e.target.value)}
              className={selectCls}
              disabled={loading}
            >
              <option value="Tous">Tous</option>
              {statuts.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
          </div>
        </div>

        {/* Croisement */}
        <div className="w-[190px]">
          <label className="mb-1 block text-[11px] font-medium text-gray-600">Croisement</label>
          <div className="relative">
            <select
              value={croisement}
              onChange={(e) => setCroisement(e.target.value)}
              className={selectCls}
              disabled={loading}
            >
              <option value="Tous">Tous</option>
              <option value="OK">OK</option>
              <option value="ABSENT_PRAXEDO">ABSENT PRAXEDO</option>
              <option value="ABSENT_PIDI">ABSENT PIDI</option>
              <option value="INCONNU">INCONNU</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2 pb-[2px]">
          <button
            onClick={reset}
            disabled={loading}
            className="h-9 rounded-md border bg-white px-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-2"
            title="Réinitialiser"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="h-9 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-60 inline-flex items-center gap-2"
            title="Appliquer les filtres"
          >
            <Filter className="h-4 w-4" />
            Filtrer
          </button>
        </div>
      </div>
    </div>
  );
}
