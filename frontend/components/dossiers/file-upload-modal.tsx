"use client";

import { useEffect, useRef, useState } from "react";
import { importCsv } from "@/services/dossiersApi";

/** Taille max 25 Mo */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

type Props = {
  type: "PRAXEDO" | "PIDI";
  onClose: () => void;
  onImported?: () => void;
};

export default function FileUploadModal({ type, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<"," | ";">(";");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!file) return;
    (async () => {
      try {
        const head = await file.slice(0, 4096).text();
        const firstLine = head.split(/\r?\n/)[0] ?? "";
        const sc = (firstLine.match(/;/g) || []).length;
        const cm = (firstLine.match(/,/g) || []).length;
        if (sc > cm) setDelimiter(";"); else if (cm > sc) setDelimiter(",");
      } catch {
        /* ignore */
      }
    })();
  }, [file]);

  async function handleUpload() {
    setErrorMsg(null);

    try {
      if (!file) throw new Error("Veuillez choisir un fichier CSV.");
      if (!/\.csv$|\.txt$/i.test(file.name)) throw new Error("Format invalide (CSV/TXT).");
      if (file.size > MAX_FILE_SIZE) throw new Error("Fichier trop volumineux (max 25 Mo).");

      setLoading(true);

      // ✅ appel unique vers le backend (même base URL que list)
      const data = await importCsv(type, file, delimiter);

      const rows = typeof (data as any)?.rows === "number" ? (data as any).rows : "—";
      alert(`✅ Import ${type} réussi (${rows} lignes).`);

      onImported?.();
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || "Échec d’import.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    if (loading && abortRef.current) abortRef.current.abort();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Importer {type === "PRAXEDO" ? "Praxedo" : "PIDI"}</h2>
          <button onClick={cancel} className="text-gray-500 hover:text-gray-700" aria-label="Fermer">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Fichier (.csv / .txt)</label>
            <input
              type="file"
              accept=".csv,.txt"
              className="w-full border rounded px-3 py-2"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
            {file && <p className="mt-1 text-xs text-gray-500">{file.name} — {(file.size / 1024).toFixed(0)} Ko</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Séparateur</label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as "," | ";")}
              className="border rounded px-2 py-1"
              disabled={loading}
            >
              <option value=";">Point-virgule (;)</option>
              <option value=",">Virgule (,)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Auto-détecté depuis l’en-tête si possible.</p>
          </div>

          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={cancel} className="border rounded px-3 py-2 hover:bg-gray-50" disabled={loading}>
            Annuler
          </button>
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || !file}
          >
            {loading ? "Importation…" : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
}
