"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Download, Loader2, TerminalSquare, Sparkles, FileDigit, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogMessage {
  id: string;
  status: "info" | "progress" | "result" | "error" | "fatal" | "done";
  message?: string;
  releve?: string;
  row?: Record<string, string>;
}

// ─── Colonnes du tableau (noms normalisés par _norm_key côté backend) ─────────
// Quand les colonnes sont toutes actives dans Praxedo, on a ~46 colonnes.
// Le frontend affiche ce qui est disponible selon les clés reçues.
const EXCEL_HEADERS = [
  "RELEVE_INPUT",
  "CONTRAT", "N_FLUX_PIDI", "TYPE_D_ATTACHEMENT", "STATUT_ATTACHEMENT",
  "ND", "CODE_SECTEUR", "N_OT", "N_OEIE", "CODES_CHANTIER_DE_GESTION", "AGENCE",
  "N_ATTACHEMENT", "CODE_POSTAL", "CODE_INSEE", "DOSSIER_TECH", "SOUS_TRAITANT",
  "CODE_GPC", "CODE_ETR", "TECHNICIEN", "UI",
  "NUM_PPD", "ACTIVITE_PRODUIT", "NUM_AS", "CODE_CENTRE",
  "DEBUT_CHANTIER", "FIN_CHANTIER",
  "NUM_CAC",  // ← la clé qui nous intéresse pour le matching Orange
  "COM_INTERNE", "COM_OEIE", "COM_ATTELEM", "MOTIF_FACT", "CATEGORIE",
  "CHARGE_AFFAIRES", "CAUSE_REJET", "COM_ACQUITTEMENT",
  "DATE_CREATION", "DERNIERE_SAISIE", "DATE_SOUMISSION", "DATE_VALIDATION",
  "POINTE_PPD", "PLANIF_OT", "VALID_INTERVENTION",
  "ARTICLE", "BORDEREAU", "PRIX_MAJORE", "CONTRAT_SST",
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ScraperPage() {
  const [relevesInput, setRelevesInput] = useState("");
  const [isScraping, setIsScraping]     = useState(false);
  const [logs, setLogs]                 = useState<LogMessage[]>([]);
  const [results, setResults]           = useState<Record<string, string>[]>([]);
  const [isInjecting, setIsInjecting]   = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const relevesList = relevesInput.split("\n").map((r) => r.trim()).filter(Boolean);

  // Pré-remplir depuis /dossiers (bouton "Scraper les manquants")
  useEffect(() => {
    const missing = sessionStorage.getItem("kyntus_missing_releves");
    if (missing) {
      setRelevesInput(missing);
      sessionStorage.removeItem("kyntus_missing_releves");
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ─── Save PIDI en base ────────────────────────────────────────────────────

  const handleSavePidi = async (rows: Record<string, string>[]) => {
    if (rows.length === 0) return;

    setIsInjecting(true);
    setLogs((prev) => [
      ...prev,
      { id: "pidi-start", status: "info", message: `🔄 Injection PIDI en base (${rows.length} ligne(s))…` },
    ]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100";
      // Payload : [{ data: { N_FLUX_PIDI: "...", NUM_CAC: "...", RELEVE_INPUT: "...", ... } }]
      const payload = rows.map((row) => ({ data: row }));

      const res = await fetch(`${apiUrl}/api/scraper/save-pidi`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Erreur ${res.status} : ${errText}`);
      }

      const data = await res.json();
      setLogs((prev) => [
        ...prev,
        {
          id: "pidi-ok",
          status: "done",
          message: `✅ Base Kyntus mise à jour — ${data.inserted_pidi ?? 0} ligne(s) insérée(s) dans raw.pidi, ${data.saved_full ?? 0} archivée(s).`,
        },
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        { id: "pidi-err", status: "error", message: `❌ Erreur injection PIDI : ${err.message}` },
      ]);
    } finally {
      setIsInjecting(false);
    }
  };

  // ─── Scraping principal ───────────────────────────────────────────────────

  const startScraping = async () => {
    if (relevesList.length === 0) return;

    setIsScraping(true);
    setLogs([]);
    setResults([]);

    const collected: Record<string, string>[] = [];

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100"}/api/scraper`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ releves: relevesList }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) throw new Error("Non autorisé. Veuillez vous reconnecter.");
        throw new Error(`Erreur serveur : ${response.status}`);
      }
      if (!response.body) throw new Error("Réponse de l'API vide.");

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const newLog: LogMessage = { id: Math.random().toString(36).slice(2, 9), ...data };
            setLogs((prev) => [...prev, newLog]);

            if (data.status === "result" && data.row) {
              const row = data.row as Record<string, string>;
              setResults((prev) => [...prev, row]);
              collected.push(row);
            }
          } catch {
            console.error("Erreur parsing NDJSON :", line);
          }
        }
      }
    } catch (error: any) {
      setLogs((prev) => [
        ...prev,
        { id: "fatal", status: "fatal", message: error.message || "Erreur de connexion." },
      ]);
    } finally {
      setIsScraping(false);
      if (collected.length > 0) {
        await handleSavePidi(collected);
      }
    }
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    if (results.length === 0) return;

    // Utiliser les colonnes réellement présentes dans les données (union de toutes les clés)
    const allKeys = Array.from(new Set(results.flatMap(r => Object.keys(r))));
    // Mettre RELEVE_INPUT en premier, puis le reste dans l'ordre EXCEL_HEADERS, puis les inconnues
    const orderedKeys = [
      "RELEVE_INPUT",
      ...EXCEL_HEADERS.filter(h => h !== "RELEVE_INPUT" && allKeys.includes(h)),
      ...allKeys.filter(k => !EXCEL_HEADERS.includes(k) && k !== "RELEVE_INPUT"),
    ];

    const BOM = "\uFEFF";
    const csvContent =
      BOM +
      [
        orderedKeys.join(";"),
        ...results.map((row) =>
          orderedKeys.map((h) => `"${(row[h] ?? "").replace(/"/g, '""')}"`).join(";")
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `kyntus_pidi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Colonnes à afficher dans le tableau (celles qui ont au moins une valeur) ──
  const displayHeaders = EXCEL_HEADERS.filter(h =>
    results.some(r => r[h] && r[h].trim())
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-gray-50/50">

      <style jsx global>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px 0 rgba(30, 58, 95, 0.05);
        }
        .terminal-bg {
          background: #0f172a;
          background-image: radial-gradient(circle at 50% 0%, #1e293b 0%, transparent 70%);
        }
        .animate-scanline { animation: scanline 3s linear infinite; }
        @keyframes scanline {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(400px); opacity: 0; }
        }
        .btn-magic {
          background-size: 200% auto;
          background-image: linear-gradient(to right, #1e3a5f 0%, #ff8c42 50%, #1e3a5f 100%);
          transition: 0.5s;
        }
        .btn-magic:hover {
          background-position: right center;
          box-shadow: 0 10px 20px -5px rgba(255, 140, 66, 0.4);
          transform: translateY(-2px);
        }
        .glow-text { text-shadow: 0 0 10px currentColor; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kyntus Automation v2.0</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a5f] to-[#ff8c42]">
            Data Extraction Engine
          </h1>
          <p className="text-gray-500 mt-2 text-lg max-w-2xl">
            Récupération furtive, filtrage, et{" "}
            <strong className="text-green-600">injection automatique en Base de Données.</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* ── Input ── */}
        <div className="xl:col-span-4 space-y-6 flex flex-col h-full">
          <Card className="glass-panel border-0 flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-4 border-b border-gray-100/50 bg-white/40">
              <CardTitle className="text-xl flex items-center gap-2 text-[#1e3a5f]">
                <FileDigit className="w-5 h-5 text-[#ff8c42]" />
                Input Source
              </CardTitle>
              <CardDescription>Collez les relevés. L'outil s'occupe de tout.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col gap-4">
              <div className="relative flex-1 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200 to-orange-200 rounded-xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur-sm" />
                <textarea
                  value={relevesInput}
                  onChange={(e) => setRelevesInput(e.target.value)}
                  disabled={isScraping || isInjecting}
                  placeholder={"42AA4322\n42AA4323\n..."}
                  className="relative w-full h-full min-h-[250px] p-4 border-gray-200 rounded-xl resize-none focus:ring-0 focus:border-transparent font-mono text-sm leading-relaxed text-gray-800 bg-white/90 shadow-inner"
                  style={{ outline: "none" }}
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {relevesList.length} relevé(s)
                </span>
              </div>

              <button
                onClick={startScraping}
                disabled={isScraping || isInjecting || relevesList.length === 0}
                className="w-full flex items-center justify-center gap-2 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 btn-magic shadow-lg"
              >
                {isScraping || isInjecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isInjecting ? "Injection PIDI…" : "Extraction en cours…"}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Démarrer l'Auto-Pilote
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* ── Terminal ── */}
        <div className="xl:col-span-8 flex flex-col h-full">
          <Card className="border-0 shadow-2xl rounded-xl overflow-hidden flex-1 flex flex-col">
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-800">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
                <TerminalSquare className="w-4 h-4" />
                kyntus-scraper-cli ~ bash
              </div>
              <div>
                {isScraping || isInjecting ? (
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                    Idle
                  </span>
                )}
              </div>
            </div>

            <div className="terminal-bg relative flex-1 p-6 font-mono text-sm overflow-hidden h-[400px] xl:h-auto flex flex-col">
              {(isScraping || isInjecting) && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.8)] z-10 animate-scanline pointer-events-none" />
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1.5">
                {logs.length === 0 && !isScraping && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                    <TerminalSquare className="w-12 h-12 mb-4" />
                    <p>En attente d'instructions…</p>
                  </div>
                )}

                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-gray-600 shrink-0 select-none text-xs mt-0.5">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <div className="flex-1 break-words">
                      {log.status === "info" && (
                        <span className="text-blue-300">
                          <span className="text-blue-500 font-bold mr-1">{">"}</span>
                          {log.message}
                        </span>
                      )}
                      {log.status === "progress" && (
                        <span className="text-yellow-300">
                          <span className="text-yellow-600 font-bold mr-1">[*]</span>
                          <span className="bg-yellow-900/30 px-1 rounded text-yellow-100">{log.releve}</span>
                          {" "}{log.message}
                        </span>
                      )}
                      {log.status === "result" && (
                        <span className="text-green-400 glow-text">
                          <span className="text-green-500 font-bold mr-1">[+]</span>
                          SUCCESS: {log.releve}
                          {log.row && (
                            <span className="ml-2 text-green-300 opacity-70 text-xs">
                              → {Object.values(log.row).filter(v => v).length} champs
                              {log.row["N_FLUX_PIDI"] ? ` · FLUX ${log.row["N_FLUX_PIDI"]}` : ""}
                              {log.row["NUM_CAC"] ? ` · CAC ${log.row["NUM_CAC"]}` : " · ⚠️ CAC vide"}
                            </span>
                          )}
                        </span>
                      )}
                      {log.status === "error" && (
                        <span className="text-red-400">
                          <span className="text-red-500 font-bold mr-1">[-]</span>
                          {log.releve && <span className="mr-1">{log.releve} :</span>}
                          {log.message}
                        </span>
                      )}
                      {log.status === "fatal" && (
                        <span className="text-red-500 font-bold bg-red-900/20 px-2 py-1 rounded border border-red-500/30 inline-block w-full">
                          [FATAL] {log.message}
                        </span>
                      )}
                      {log.status === "done" && (
                        <span className="text-emerald-400 font-bold mt-2 block p-2 bg-emerald-900/20 border border-emerald-500/30 rounded">
                          $ {log.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {(isScraping || isInjecting) && (
                  <div className="flex gap-3 mt-2">
                    <span className="text-gray-600 text-xs">{new Date().toLocaleTimeString()}</span>
                    <span className="w-2 h-4 bg-gray-400 animate-pulse inline-block mt-0.5" />
                  </div>
                )}

                <div ref={logsEndRef} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Tableau de résultats ── */}
      {results.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Card className="border-0 shadow-2xl rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex flex-row items-center justify-between py-5 px-6">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Database className="h-5 w-5" />
                  </div>
                  Données synchronisées avec Kyntus DB
                </CardTitle>
                <CardDescription className="mt-1 text-sm font-medium">
                  <span className="text-blue-600 font-bold">{results.length}</span> ligne(s) · {" "}
                  <span className="text-green-600 font-bold">
                    {results.filter(r => r["NUM_CAC"] && r["NUM_CAC"].trim()).length}
                  </span> avec CAC
                </CardDescription>
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 font-bold transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" />
                Télécharger .CSV
              </button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100/80 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      {/* Afficher uniquement les colonnes qui ont des données */}
                      {displayHeaders.map((header) => (
                        <th
                          key={header}
                          className={`p-3 text-left font-bold border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap text-xs tracking-wider ${
                            header === "NUM_CAC" ? "text-orange-600 bg-orange-50" :
                            header === "RELEVE_INPUT" ? "text-blue-700" : "text-gray-600"
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-blue-50/40 transition-colors group">
                        {displayHeaders.map((header) => (
                          <td
                            key={header}
                            className={`p-3 border-r border-gray-100 last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px] ${
                              header === "NUM_CAC" ? "bg-orange-50/50 font-mono text-orange-700" :
                              header === "RELEVE_INPUT" ? "font-bold text-[#1e3a5f]" : "text-gray-700"
                            }`}
                            title={row[header] || ""}
                          >
                            {row[header] ? row[header] : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}