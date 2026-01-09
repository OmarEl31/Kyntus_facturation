"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { importCsv } from "@/services/dossiersApi";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

type Props = {
  type: "PRAXEDO" | "PIDI";
  onClose: () => void;
  onImported?: () => void;
};

export default function FileUploadModal({ type, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<";" | ",">(";");
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
        if (sc > cm) setDelimiter(";");
        else if (cm > sc) setDelimiter(",");
      } catch {
        // ignore
      }
    })();
  }, [file]);

  async function handleUpload() {
    setErrorMsg(null);

    try {
      if (!file) throw new Error("Veuillez choisir un fichier CSV.");
      if (!/\.(csv|txt)$/i.test(file.name)) throw new Error("Format invalide (CSV/TXT).");
      if (file.size > MAX_FILE_SIZE) throw new Error("Fichier trop volumineux (max 25 Mo).");

      setLoading(true);

      abortRef.current = new AbortController();

      await importCsv({
        type,
        file,
        delimiter,
        signal: abortRef.current.signal,
      });

      alert(`Import ${type} réussi.`);
      onImported?.();
      onClose();
    } catch (e: any) {
      // ✅ évite le fameux [object Object]
      const msg =
        typeof e?.message === "string"
          ? e.message
          : typeof e === "string"
          ? e
          : JSON.stringify(e);
      setErrorMsg(msg || "Échec d'import.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Importer {type}</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-700">Fichier (.csv / .txt)</label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {file && (
            <div className="text-xs text-gray-500">
              {file.name} — {Math.round(file.size / 1024)} Ko
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-700">Séparateur</label>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as ";" | ",")}
            className="border rounded px-2 py-1 text-sm bg-white"
          >
            <option value=";">Point-virgule ( ; )</option>
            <option value=",">Virgule ( , )</option>
          </select>
          <div className="text-xs text-gray-500">Auto-détecté depuis l’en-tête si possible.</div>
        </div>

        {errorMsg && (
          <div className="p-2 rounded border border-red-200 bg-red-50 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="border rounded px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Import…" : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
}
