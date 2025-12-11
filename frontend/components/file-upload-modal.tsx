"use client";
import { useState } from "react";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("praxedo");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Sélectionne un fichier CSV.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/import`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Échec import");
      alert("Import réussi !");
    } catch (err) {
      console.error(err);
      alert("Erreur d’import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded p-2"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="praxedo">Praxedo</option>
        <option value="pidi">PIDI</option>
      </select>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-3 py-2 rounded"
      >
        {loading ? "Import..." : "Importer"}
      </button>
    </div>
  );
}
