"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster 
      position="top-right" 
      richColors 
      expand={false}
      duration={4000}
      closeButton
    />
  );
}

"use client";

import { useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  type: "PRAXEDO" | "PIDI";
  onImported: () => void;
  onClose: () => void;
};

export default function FileUploadModal({ type, onImported, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [delimiter, setDelimiter] = useState(";");

  async function handleUpload() {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier CSV");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("delimiter", delimiter);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const endpoint =
        type === "PRAXEDO"
          ? `${API_BASE}/api/import/praxedo`
          : `${API_BASE}/api/import/pidi`;

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Erreur lors de l'import");
      }

      const data = await res.json();
      toast.success(
        `✅ Import réussi : ${data.rows_ok} lignes importées${
          data.rows_failed > 0 ? ` (${data.rows_failed} échecs)` : ""
        }`
      );
      onImported();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error 
          ? `❌ ${error.message}` 
          : "❌ Erreur lors de l'import"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Importer {type === "PRAXEDO" ? "Praxedo" : "PIDI"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* File upload area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <label className="cursor-pointer">
              <span className="text-sm text-blue-600 hover:underline font-medium">
                Choisir un fichier CSV
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {file && (
              <p className="mt-2 text-sm text-gray-600 font-mono">{file.name}</p>
            )}
          </div>

          {/* Delimiter selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Séparateur :
            </label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value=";">Point-virgule (;)</option>
              <option value=",">Virgule (,)</option>
              <option value="|">Pipe (|)</option>
            </select>
          </div>

          {/* Info message */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>
              Le fichier doit être au format CSV avec les colonnes attendues pour {type}.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "Import en cours..." : "Importer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}