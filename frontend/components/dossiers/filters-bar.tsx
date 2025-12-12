// frontend/components/dossiers/filters-bar.tsx
"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";

import type { StatutFinal, CroisementStatut } from "@/types/dossier";

type Props = {
  onSearch: (filters: {
    q?: string;
    statut?: StatutFinal;
    croisement?: CroisementStatut;
  }) => void;
  loading?: boolean;
  statuts: readonly StatutFinal[];
};

export default function FiltersBar({ onSearch, loading, statuts }: Props) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<StatutFinal | "">("");
  const [croisement, setCroisement] = useState<CroisementStatut | "">("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      q: q.trim() || undefined,
      statut: statut || undefined,
      croisement: croisement || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 px-2 py-2"
    >
      {/* Recherche OT / ND */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600 mb-1">
          Recherche (OT / ND)
        </label>
        <div className="flex items-center border rounded px-2 py-1 bg-white">
          <Search className="h-4 w-4 text-gray-400 mr-1" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="outline-none text-sm flex-1"
            placeholder="Ex: 0142019878..."
          />
        </div>
      </div>

      {/* Statut final */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600 mb-1">Statut final</label>
        <select
          value={statut}
          onChange={(e) =>
            setStatut(e.target.value as StatutFinal | "")
          }
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
          onChange={(e) =>
            setCroisement(e.target.value as CroisementStatut | "")
          }
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">Tous</option>
          <option value="OK">OK</option>
          <option value="ABSENT_PRAXEDO">ABSENT PRAXEDO</option>
          <option value="ABSENT_PIDI">ABSENT PIDI</option>
          <option value="NON_ENVOYE_PIDI">NON ENVOYE PIDI</option>
          <option value="INCONNU">INCONNU</option>
        </select>
      </div>

      {/* Bouton Filtrer */}
      <div className="flex flex-col">
        <span className="text-xs text-transparent mb-1">.</span>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-60"
        >
          <Filter className="h-4 w-4" />
          Filtrer
        </button>
      </div>
    </form>
  );
}
