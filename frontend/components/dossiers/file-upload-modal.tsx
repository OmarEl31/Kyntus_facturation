// frontend/components/dossiers/file-upload-modal.tsx
"use client";

import { useEffect, useRef, useState } from "react";

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

  const endpoint = type === "PRAXEDO" ? "/api/import/praxedo" : "/api/import/pidi";

  async function handleUpload() {
    setErrorMsg(null);

    try {
      if (!file) throw new Error("Veuillez choisir un fichier CSV.");
      if (!/\.csv$|\.txt$/i.test(file.name)) throw new Error("Format invalide (CSV/TXT).");
      if (file.size > MAX_FILE_SIZE) throw new Error("Fichier trop volumineux (max 25 Mo).");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL manquant (front).");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("delimiter", delimiter);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const timeout = setTimeout(() => ctrl.abort(), 90_000);

      setLoading(true);
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        body: fd,
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        let detail = "";
        try {
          const j = await res.json();
          detail = j?.detail || j?.message || "";
        } catch { /* ignore */ }
        throw new Error(detail || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      const rows = typeof data?.rows === "number" ? data.rows : "—";
      alert(`✅ Import ${type} réussi (${rows} lignes).`);

      onImported?.();
      onClose();
    } catch (e: any) {
      if (e?.name === "AbortError") setErrorMsg("La requête a expiré. Réessayez avec un fichier plus léger.");
      else setErrorMsg(e?.message || "Échec d’import inconnu.");
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
          <h2 className="text-lg font-semibold">
            Importer {type === "PRAXEDO" ? "Praxedo" : "PIDI"}
          </h2>
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

          {errorMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{errorMsg}</div>}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={cancel} className="border rounded px-3 py-2 hover:bg-gray-50" disabled={loading}>Annuler</button>
          <button onClick={handleUpload} className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50" disabled={loading || !file}>
            {loading ? "Importation…" : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
}
