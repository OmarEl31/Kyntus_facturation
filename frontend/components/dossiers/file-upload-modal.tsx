"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import { uploadOrangePpd, uploadPraxedo, uploadPidi } from "@/services/dossiersApi";
type Props = {
  type: "PRAXEDO" | "PIDI" | "ORANGE_PPD";
  onImported: (payload?: { importId?: string }) => void;
  onClose: () => void;
};

export default function FileUploadModal({ type, onImported, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; count: number; import_id?: string } | null>(null);


  async function handleUpload() {
    if (!file) {
      setError("Veuillez sélectionner un fichier CSV.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
const res =
        type === "PRAXEDO"
          ? await uploadPraxedo(file)
          : type === "PIDI"
          ? await uploadPidi(file)
          : await uploadOrangePpd(file);      setResult(res);
      onImported({ importId: res.import_id });
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'import du fichier.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl border">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">Import fichier {type}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fichier CSV</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            {result && (
              <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                ✅ {result.message} — {result.count} lignes importées
                                {result.import_id ? <div className="mt-1 font-mono text-xs">Import ID: {result.import_id}</div> : null}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3 py-2 text-sm rounded border hover:bg-gray-50 disabled:opacity-60"
            >
              Annuler
            </button>

            <button
              onClick={handleUpload}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {loading ? "Import..." : "Importer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
