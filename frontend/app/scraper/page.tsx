// frontend/app/scraper/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Download, Loader2, CheckCircle2, Table as TableIcon, TerminalSquare, Sparkles, FileDigit, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { uploadPraxedo } from "@/services/dossiersApi";

interface LogMessage {
  id: string;
  status: "info" | "progress" | "result" | "error" | "fatal" | "done";
  message?: string;
  releve?: string;
  data?: string[];
}

const EXCEL_HEADERS = [
  "RELEVE_INPUT", "CONTRAT", "FLUX_PIDI", "TYPE", "STATUT", "ND", "SECTEUR", 
  "NUM_OT", "NUM_OEIE", "CODE_CHANTIER", "AGENCE", 
  "NUM_ATTACHEMENT", "CODE_POSTAL", "CODE_INSEE", "DOSSIER_TECH", "SOUS_TRAITANT", 
  "CODE_GPC", "CODE_ETR", "TECHNICIEN", "UI", "NUM_PPD", "ACTIVITE_PRODUIT", 
  "NUM_AS", "CODE_CENTRE", "DEBUT_CHANTIER", "FIN_CHANTIER", "NUM_CAC", 
  "COM_INTERNE", "COM_OEIE", "COM_ATTELEM", "MOTIF_FACT", "CATEGORIE", 
  "CHARGE_AFFAIRES", "CAUSE_REJET", "COM_ACQUITTEMENT", "DATE_CREATION", 
  "DERNIERE_SAISIE", "DATE_SOUMISSION", "DATE_VALIDATION", "POINTE_PPD", 
  "PLANIF_OT", "VALID_INTERVENTION", "ARTICLE", "BORDEREAU", "PRIX_MAJORE", "CONTRAT_SST"
];

export default function ScraperPage() {
  const [relevesInput, setRelevesInput] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [results, setResults] = useState<string[][]>([]);
  const [isInjecting, setIsInjecting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const relevesList = relevesInput.split("\n").map(r => r.trim()).filter(r => r);

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

  // 🚀 L'INJECTION MAGIQUE AVEC LES BONS ENDPOINTS ET BONNES COLONNES
  const handleAutoImport = async (scrapedData: string[][]) => {
    if (scrapedData.length === 0) return;
    
    setIsInjecting(true);
    setLogs((prev) => [...prev, { id: "import", status: "info", message: "🔄 Traduction et Injection dans la DB Kyntus (Praxedo + PIDI)..." }]);
    
    try {
      const BOM = "\uFEFF";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // ==========================================
      // 1. CREATION DU CSV FORMAT "PRAXEDO"
      // ==========================================
      const praxedoHeaders = ["N°", "Statut", "Planifiée", "Nom technicien", "Prénom technicien", "Equipiers", "ND", "Act / Prod", "Code intervention", "CP", "Ville site", "Desc. site", "Description"];
      const praxedoCsvContent = BOM + [
        praxedoHeaders.join(";"),
        ...scrapedData.map(row => [
          row[7] || "",   // NUM_OT -> N°
          row[4] || "",   // STATUT -> Statut
          row[40] || "",  // PLANIF_OT -> Planifiée
          row[18] || "",  // TECHNICIEN -> Nom technicien
          "",             // Prénom technicien
          "",             // Equipiers
          row[5] || "",   // ND
          row[21] || "",  // ACTIVITE_PRODUIT -> Act / Prod
          "",             // Code intervention
          row[12] || "",  // CODE_POSTAL -> CP
          row[13] || "",  // CODE_INSEE -> Ville site
          row[27] || "",  // COM_INTERNE -> Desc. site
          row[28] || ""   // COM_OEIE -> Description
        ].map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(";"))
      ].join("\n");

      const praxedoBlob = new Blob([praxedoCsvContent], { type: "text/csv;charset=utf-8;" });
      const praxedoFile = new File([praxedoBlob], "scraped_praxedo_auto.csv", { type: "text/csv" });

      const fdPraxedo = new FormData();
      fdPraxedo.append("file", praxedoFile);
      
      const resPraxedo = await fetch(`${apiUrl}/api/import/praxedo`, { method: "POST", body: fdPraxedo });
      if (!resPraxedo.ok) throw new Error(`Erreur API Praxedo: ${await resPraxedo.text()}`);

      // ==========================================
      // 2. CREATION DU CSV FORMAT "PIDI" (CORRIGE)
      // ==========================================
      const pidiHeaders = [
        "Contrat", 
        "N° Flux PIDI", 
        "Type", 
        "N° OT", 
        "ND", 
        "Statut", 
        "Code secteur", 
        "N° Attachement", 
        "OEIE", 
        "Code gestion chantier", 
        "Agence", 
        "Liste d'articles", 
        "N° PPD", 
        "Attachement validé", 
        "Bordereau", 
        "HT", 
        "N° CAC", 
        "Comment. acqui./rejet", 
        "Cause acqui./rejet"
      ];
      
      const pidiCsvContent = BOM + [
        pidiHeaders.join(";"),
        ...scrapedData.map(row => [
          row[1] || "",   // CONTRAT -> Contrat
          row[2] || "",   // FLUX_PIDI -> N° Flux PIDI
          row[3] || "",   // TYPE -> Type
          row[7] || "",   // NUM_OT -> N° OT
          row[5] || "",   // ND -> ND
          row[4] || "",   // STATUT -> Statut
          row[6] || "",   // SECTEUR -> Code secteur
          row[11] || "",  // NUM_ATTACHEMENT -> N° Attachement
          row[8] || "",   // NUM_OEIE -> OEIE
          row[9] || "",   // CODE_CHANTIER -> Code gestion chantier
          row[10] || "",  // AGENCE -> Agence
          row[42] || "",  // ARTICLE -> Liste d'articles
          row[20] || "",  // NUM_PPD -> N° PPD
          row[41] || "",  // VALID_INTERVENTION -> Attachement validé
          row[43] || "",  // BORDEREAU -> Bordereau
          row[44] || "",  // PRIX_MAJORE -> HT
          row[26] || "",  // NUM_CAC -> N° CAC
          row[34] || "",  // COM_ACQUITTEMENT -> Comment. acqui./rejet
          row[33] || ""   // CAUSE_REJET -> Cause acqui./rejet
        ].map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(";"))
      ].join("\n");

      const pidiBlob = new Blob([pidiCsvContent], { type: "text/csv;charset=utf-8;" });
      const pidiFile = new File([pidiBlob], "scraped_pidi_auto.csv", { type: "text/csv" });

      const fdPidi = new FormData();
      fdPidi.append("file", pidiFile);

      const resPidi = await fetch(`${apiUrl}/api/import/pidi`, { method: "POST", body: fdPidi });
      if (!resPidi.ok) throw new Error(`Erreur API PIDI: ${await resPidi.text()}`);

      setLogs((prev) => [...prev, { id: "import-ok", status: "done", message: `✅ Base de données Kyntus mise à jour ! (Tables Praxedo et Pidi).` }]);
    } catch (err: any) {
       setLogs((prev) => [...prev, { id: "import-err", status: "error", message: `❌ Erreur d'injection DB: ${err.message}` }]);
    } finally {
      setIsInjecting(false);
    }
  };

  const startScraping = async () => {
    if (relevesList.length === 0) return;
    
    setIsScraping(true);
    setLogs([]);
    setResults([]);
    
    let currentScrapedData: string[][] = [];

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/scraper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releves: relevesList })
      });

      if (!response.body) throw new Error("Réponse de l'API vide");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; 

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            const newLog: LogMessage = { id: Math.random().toString(36).substr(2, 9), ...data };
            
            setLogs((prev) => [...prev, newLog]);

            if (data.status === "result" && data.data) {
              const newRow = [data.releve || "", ...data.data!];
              setResults((prev) => [...prev, newRow]);
              currentScrapedData.push(newRow);
            }
          } catch (err) {
            console.error("Erreur parsing JSON:", line);
          }
        }
      }
    } catch (error: any) {
      setLogs((prev) => [...prev, { id: "error", status: "fatal", message: error.message || "Erreur de connexion" }]);
    } finally {
      setIsScraping(false);
      // 🔥 A LA FIN DU SCRAPING, ON INJECTE DANS LES DEUX TABLES AUTOMATIQUEMENT
      if (currentScrapedData.length > 0) {
        await handleAutoImport(currentScrapedData);
      }
    }
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const BOM = "\uFEFF";
    const csvContent = BOM + [
      EXCEL_HEADERS.join(";"),
      ...results.map(row => {
        const paddedRow = [...row];
        while (paddedRow.length < EXCEL_HEADERS.length) {
          paddedRow.push("");
        }
        return paddedRow.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(";")
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `kyntus_scraper_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        .animate-scanline {
          animation: scanline 3s linear infinite;
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
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
        .glow-text {
          text-shadow: 0 0 10px currentColor;
        }
      `}</style>

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
            Récupération furtive, filtrage, et <strong className="text-green-600">injection automatique en Base de Données.</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        <div className="xl:col-span-4 space-y-6 flex flex-col h-full">
          <Card className="glass-panel border-0 flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-4 border-b border-gray-100/50 bg-white/40">
              <CardTitle className="text-xl flex items-center gap-2 text-[#1e3a5f]">
                <FileDigit className="w-5 h-5 text-[#ff8c42]" />
                Input Source
              </CardTitle>
              <CardDescription>
                Collez les relevés. L'outil s'occupe de tout.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col gap-4">
              <div className="relative flex-1 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200 to-orange-200 rounded-xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>
                <textarea
                  value={relevesInput}
                  onChange={(e) => setRelevesInput(e.target.value)}
                  disabled={isScraping || isInjecting}
                  placeholder="ND_12345678&#10;OT_98765432&#10;..."
                  className="relative w-full h-full min-h-[250px] p-4 border-gray-200 rounded-xl resize-none focus:ring-0 focus:border-transparent font-mono text-sm leading-relaxed text-gray-800 bg-white/90 shadow-inner"
                  style={{ outline: 'none' }}
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {relevesList.length} Entité(s)
                </span>
              </div>

              <button
                onClick={startScraping}
                disabled={isScraping || isInjecting || relevesList.length === 0}
                className="w-full flex items-center justify-center gap-2 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 btn-magic shadow-lg"
              >
                {(isScraping || isInjecting) ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isInjecting ? "Mise à jour BDD..." : "Extraction en cours..."}
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

        <div className="xl:col-span-8 flex flex-col h-full">
          <Card className="border-0 shadow-2xl rounded-xl overflow-hidden flex-1 flex flex-col">
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-800">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
                <TerminalSquare className="w-4 h-4" />
                kyntus-scraper-cli ~ bash
              </div>
              <div>
                {(isScraping || isInjecting) ? (
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
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
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.8)] z-10 animate-scanline pointer-events-none"></div>
              )}
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {logs.length === 0 && !isScraping && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                    <TerminalSquare className="w-12 h-12 mb-4" />
                    <p>En attente d'instructions...</p>
                  </div>
                )}
                
                {logs.map((log) => (
                  <div key={log.id} className="mb-1.5 flex gap-2">
                    <span className="text-gray-500 shrink-0 select-none">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <div className="flex-1 break-words">
                      {log.status === "info" && (
                        <span className="text-blue-300">
                          <span className="text-blue-500 font-bold mr-2">{'>'}</span> 
                          {log.message}
                        </span>
                      )}
                      {log.status === "progress" && (
                        <span className="text-yellow-300">
                          <span className="text-yellow-600 font-bold mr-2">[*]</span> 
                          <span className="bg-yellow-900/30 px-1 rounded text-yellow-100">{log.releve}</span> : {log.message}
                        </span>
                      )}
                      {log.status === "result" && (
                        <span className="text-green-400 glow-text">
                          <span className="text-green-500 font-bold mr-2">[+]</span> 
                          SUCCESS: {log.releve} → {log.data?.length} cols
                        </span>
                      )}
                      {log.status === "error" && (
                        <span className="text-red-400">
                          <span className="text-red-500 font-bold mr-2">[-]</span> 
                          ERR: {log.releve} - {log.message}
                        </span>
                      )}
                      {log.status === "fatal" && (
                        <span className="text-red-500 font-bold bg-red-900/20 px-2 py-1 rounded border border-red-500/30 inline-block w-full">
                          [FATAL] {log.message}
                        </span>
                      )}
                      {log.status === "done" && (
                        <span className="text-emerald-400 font-bold mt-4 block p-2 bg-emerald-900/20 border border-emerald-500/30 rounded">
                          $ {log.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                
                {(isScraping || isInjecting) && (
                  <div className="flex gap-3 mt-2">
                    <span className="text-gray-500"> {new Date().toLocaleTimeString()} </span>
                    <span className="w-2.5 h-4 bg-gray-400 animate-pulse inline-block mt-1"></span>
                  </div>
                )}
                
                <div ref={logsEndRef} />
              </div>
            </div>
          </Card>
        </div>
      </div>

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
                  <span className="text-blue-600 font-bold">{results.length}</span> ligne(s) ajoutée(s) au tableau principal.
                </CardDescription>
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 font-bold transition-all shadow-md active:scale-95 border border-gray-700 hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                Télécharger Sauvegarde .CSV
              </button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-sm border-collapse min-w-[3000px]">
                  <thead className="bg-gray-100/80 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      {EXCEL_HEADERS.map((header, idx) => (
                        <th 
                          key={idx} 
                          className="p-3 text-left font-bold text-gray-600 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap shadow-sm text-xs tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-blue-50/40 transition-colors group">
                        {Array.from({ length: EXCEL_HEADERS.length }).map((_, colIdx) => (
                          <td 
                            key={colIdx} 
                            className="p-3 border-r border-gray-100 last:border-r-0 text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] group-hover:border-blue-100" 
                            title={row[colIdx] || "-"}
                          >
                            {row[colIdx] ? (
                              <span className={colIdx === 0 ? "font-bold text-[#1e3a5f]" : ""}>
                                {row[colIdx]}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
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