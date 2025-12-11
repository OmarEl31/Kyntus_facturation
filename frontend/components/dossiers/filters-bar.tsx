"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import type { CroisementStatut } from "@/services/dossiersApi";

type Props = {
  onSearch: (f: { q?: string; statut?: CroisementStatut; attachement?: string }) => void;
  loading?: boolean;
  statuts: readonly CroisementStatut[];
};

export function FiltersBar({ onSearch, loading, statuts }: Props) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<CroisementStatut | "">("");
  const [attachement, setAttachement] = useState("");

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div>
        <label className="block text-sm font-medium mb-1">Recherche (OT / ND global)</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            className="w-full border rounded-lg px-9 py-2"
            placeholder="Ex: 0016695151 ou 0130965670…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Statut croisement</label>
        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <select
            className="w-full border rounded-lg px-9 py-2 bg-white"
            value={statut}
            onChange={(e) => setStatut((e.target.value || "") as CroisementStatut | "")}
          >
            <option value="">Tous</option>
            {statuts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Statut PIDI (contient)</label>
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="ex: envoyé / non envoyé / partiel…"
          value={attachement}
          onChange={(e) => setAttachement(e.target.value)}
        />
      </div>

      <div className="md:col-span-3 flex gap-2 justify-end">
        <button
          className="rounded-md border px-4 py-2 hover:bg-gray-50"
          disabled={loading}
          onClick={() => onSearch({ q, statut: (statut || undefined) as CroisementStatut | undefined, attachement: attachement || undefined })}
        >
          Appliquer
        </button>
        <button
          className="rounded-md border px-4 py-2 hover:bg-gray-50"
          disabled={loading}
          onClick={() => {
            setQ("");
            setStatut("");
            setAttachement("");
            onSearch({});
          }}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
