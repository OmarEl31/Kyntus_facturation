// frontend/components/dossiers/dossiers-list.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshCw, Upload, Download, X, ChevronRight, Info, Layers, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  compareOrangePpd,
  compareOrangePpdSummary,
  exportDossiersXlsx,
  listDossiers,
  listOrangeImports,
  listOrangePpdOptions,
  statutsFinal,
} from "@/services/dossiersApi";

import type {
  DossierFacturable,
  DossiersFilters,
  OrangePpdComparison,
  OrangePpdImportSummary,
  OrangePpdCompareSummary,
} from "@/services/dossiersApi";

import FiltersBar from "./filters-bar";
import FileUploadModal from "./file-upload-modal";

const PAGE_SIZE = 300;

type BadgeKind =
  | "green"
  | "yellow"
  | "red"
  | "gray"
  | "purple"
  | "blue"
  | "orange"
  | "indigo"
  | "teal"
  | "rose"
  | "slate"
  | "cyan"
  | "fuchsia"
  | "lime"
  | "lightBlue";

const DETAILS_BTN_CLASS =
  "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap shadow-sm transition-colors";

function badgeClass(kind: BadgeKind) {
  switch (kind) {
    case "green":
      return "bg-green-100 text-green-800";
    case "yellow":
      return "bg-amber-100 text-amber-900";
    case "red":
      return "bg-red-100 text-red-800";
    case "purple":
      return "bg-violet-100 text-violet-800";
    case "blue":
      return "bg-sky-100 text-sky-800";
    case "orange":
      return "bg-orange-100 text-orange-900";
    case "indigo":
      return "bg-indigo-100 text-indigo-800";
    case "teal":
      return "bg-teal-100 text-teal-900";
    case "rose":
      return "bg-rose-100 text-rose-800";
    case "slate":
      return "bg-slate-100 text-slate-800";
    case "cyan":
      return "bg-cyan-100 text-cyan-900";
    case "fuchsia":
      return "bg-fuchsia-100 text-fuchsia-900";
    case "lime":
      return "bg-lime-100 text-lime-900";
    case "lightBlue":
      return "bg-blue-50 text-blue-800 border border-blue-200";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function Badge({ txt, kind = "gray" }: { txt: string; kind?: BadgeKind }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badgeClass(kind)}`}>
      {txt}
    </span>
  );
}

function Chip({ txt }: { txt: string }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2 py-1 text-xs font-medium text-gray-700">
      {txt}
    </span>
  );
}

// ─── Helpers montants Orange ───────────────────────────────────────────────

function amountPillClass(kind: "orange" | "kyntus" | "diff", value?: number | null) {
  if (kind === "orange") return "bg-orange-100 text-orange-900 border border-orange-300";
  if (kind === "kyntus") return "bg-blue-50 text-blue-800 border border-blue-200";
  
  if (kind === "diff") {
    const numValue = Number(value ?? 0);
    if (numValue >= 0) return "bg-green-100 text-green-800 border border-green-300";
    return "bg-red-100 text-red-800 border border-red-300";
  }
  
  return "bg-gray-100 text-gray-800";
}

function AmountPill({ v, kind }: { v: any; kind: "orange" | "kyntus" | "diff" }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold ${amountPillClass(kind, kind === "diff" ? v : undefined)}`}>
      {fmtNum(v)} €
    </span>
  );
}

function normalizeNds(v: string[] | null | undefined): string[] {
  if (!v || !Array.isArray(v)) return [];
  return v.filter(Boolean).map(String);
}

// ──────────────────────────────────────────────────────────────────────────

function formatFrDate(v?: string | null) {
  if (!v) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) return v;

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function croisementKind(s?: string | null): BadgeKind {
  if (s === "OK") return "green";
  if (s === "ABSENT_PRAXEDO") return "yellow";
  if (s === "ABSENT_PIDI") return "red";
  if (s === "INCONNU") return "gray";
  return "gray";
}

function statutFinalKind(s?: string | null): BadgeKind {
  if (s === "FACTURABLE") return "green";
  if (s === "NON_FACTURABLE") return "red";
  if (s === "CONDITIONNEL") return "yellow";
  if (s === "A_VERIFIER") return "orange";
  return "gray";
}

function motifKind(m?: string | null): BadgeKind {
  const x = (m ?? "").toUpperCase();
  if (!x) return "gray";

  if (x === "CROISEMENT_INCOMPLET") return "orange";
  if (x === "REGLE_MANQUANTE") return "orange";
  if (x === "ACTPROD_MANQUANT") return "orange";
  if (x === "CLOTURE_INVALIDE") return "orange";
  if (x === "PREVISITE") return "slate";
  if (x === "NON_FACTURABLE_REGLE") return "slate";

  return "gray";
}

function motifLabel(m?: string | null): string {
  const x = (m ?? "").toUpperCase();
  if (!x) return "—";

  switch (x) {
    case "CROISEMENT_INCOMPLET":
      return "Croisement incomplet";
    case "REGLE_MANQUANTE":
      return "Règle manquante";
    case "ACTPROD_MANQUANT":
      return "Act/Prod manquant";
    case "CLOTURE_INVALIDE":
      return "Clôture invalide";
    case "PREVISITE":
      return "Prévisite";
    case "NON_FACTURABLE_REGLE":
      return "Non facturable (règle)";
    default:
      return x.replaceAll("_", " ");
  }
}

function clotureKind(code?: string | null): BadgeKind {
  if (!code) return "gray";
  const c = code.toUpperCase();
  if (c === "DMS") return "green";
  if (["DEF", "RRC", "TSO", "PDC"].includes(c)) return "purple";
  return "blue";
}

function pidiLabel(d: DossierFacturable) {
  if (!d.statut_pidi) return "Non envoyé à PIDI";
  return "Validé par PIDI";
}

function praxedoLabel(d: DossierFacturable) {
  return d.statut_praxedo ?? "—";
}

function terrainKind(mode?: string | null): BadgeKind {
  const m = (mode ?? "").toUpperCase();
  if (m.includes("IMM")) return "indigo";
  if (m.includes("SOUT")) return "cyan";
  if (m.includes("AER")) return "fuchsia";
  return "slate";
}

function parseAnyList(v?: string | null): string[] {
  if (!v) return [];
  return String(v)
    .split(/[\r\n,;|]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

// ✅ Version améliorée de l'extraction du commentaire
function _extractCommentaireReleve(compte_rendu: string | null): string | null {
  if (!compte_rendu) return null;
  
  // Remplacer les NBSP par des espaces normaux
  const s = String(compte_rendu).replace(/\u00a0/g, ' ').trim();
  
  // Chercher plusieurs formats possibles
  const patterns = [
    /#commentairereleve\s*=\s*(.+?)(?=#|$)/i,  // Format avec # et = 
    /commentairereleve[:\s]+(.+?)(?=#|$)/i,    // Format avec : ou espace
    /#commentaire\s*=\s*(.+?)(?=#|$)/i,        // Variante sans "releve"
    /commentaire\s*technique[:\s]+(.+?)(?=#|$)/i // "commentaire technique"
  ];
  
  for (const pattern of patterns) {
    const m = s.match(pattern);
    if (m) {
      const val = m[1].trim();
      if (val) return val;
    }
  }
  
  // Si pas trouvé avec les patterns, chercher après le dernier #
  const lastHashIndex = s.lastIndexOf('#');
  if (lastHashIndex !== -1 && lastHashIndex < s.length - 1) {
    const afterLastHash = s.substring(lastHashIndex + 1).trim();
    if (afterLastHash && afterLastHash.length < 200) {
      return afterLastHash;
    }
  }
  
  return null;
}

function parseCommentaireReleve(compteRendu?: string | null): {
  aChangeArticle: boolean;
  commentaire: string | null;
} {
  if (!compteRendu) return { aChangeArticle: false, commentaire: null };
  
  const commentaireReleve = _extractCommentaireReleve(compteRendu);
  
  const aChangeArticle = commentaireReleve 
    ? /change(?:ment)?\s+d['']?article|remplacement|article\s+change|modif(?:ication)?\s+article/i.test(commentaireReleve)
    : false;
  
  return {
    aChangeArticle,
    commentaire: commentaireReleve
  };
}

function parsePidiBrutCodes(v?: string | null): string[] {
  if (!v) return [];
  const s = String(v).toUpperCase();
  const matches = s.match(/\b[A-Z]{2,}[A-Z0-9]{0,12}\b/g) ?? [];
  return Array.from(
    new Set(
      matches
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => x !== "PIDI" && x !== "BRUT")
    )
  );
}

function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {right}
    </div>
  );
}

function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-gray-500">{k}</div>
      <div className="col-span-2 text-gray-900">{v}</div>
    </div>
  );
}

function groupByPpd(items: DossierFacturable[]) {
  const m = new Map<string, DossierFacturable[]>();

  for (const d of items) {
    const hasPidi = !!d.statut_pidi;
    let key: string;
    if (!hasPidi) key = "— (sans PIDI)";
    else key = (d.numero_ppd ?? "").trim() || "SANS_PPD";
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(d);
  }

  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function fmtNum(v: any): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

function Pagination({
  page,
  pageCount,
  onPrev,
  onNext,
  onGo,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  onGo: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <button className="border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50" onClick={onPrev} disabled={page <= 1}>
        Précédent
      </button>
      <span className="text-gray-700">
        Page <b>{page}</b> / {pageCount}
      </span>
      <button className="border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50" onClick={onNext} disabled={page >= pageCount}>
        Suivant
      </button>
      <select
        className="border rounded px-2 py-1"
        value={page}
        onChange={(e) => onGo(Number(e.target.value))}
      >
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Helpers comparaison Orange ────────────────────────────────────────────

function reasonLabel(r: string) {
  switch ((r || "").toUpperCase()) {
    case "OT_INEXISTANT":
      return "OT inexistant";
    case "CROISEMENT_INCOMPLET":
      return "Croisement incomplet";
    case "COMPARAISON_INCOHERENTE":
      return "Comparaison incohérente";
    case "RELEVE_ABSENT_PIDI":
      return "Relevé absent PIDI";
    case "OK":
      return "OK";
    default:
      return r || "—";
  }
}

function orangeRowClass(r: OrangePpdComparison & { reason?: string }) {
  const reason = (r.reason || "").toUpperCase();
  if (reason === "RELEVE_ABSENT_PIDI") {
    return "bg-red-50/40 hover:bg-red-100/50";
  }
  if (reason === "OT_INEXISTANT" || reason === "CROISEMENT_INCOMPLET" || reason === "COMPARAISON_INCOHERENTE") {
    return "bg-amber-50/40 hover:bg-amber-100/50";
  }
  return "bg-green-50/30 hover:bg-green-100/50";
}

function orangeReasonBadgeKind(r: OrangePpdComparison & { reason?: string }): BadgeKind {
  const reason = (r.reason || "").toUpperCase();
  if (reason === "OK") return "green";
  if (reason === "RELEVE_ABSENT_PIDI") return "red";
  if (reason === "COMPARAISON_INCOHERENTE") return "yellow";
  if (reason === "OT_INEXISTANT" || reason === "CROISEMENT_INCOMPLET") return "yellow";
  return "gray";
}

// ──────────────────────────────────────────────────────────────────────────

export default function DossiersList() {
  const router = useRouter(); // 👈 Router pour la navigation vers scraper

  // --- affichage des sections ---
  const [showOrangeSection, setShowOrangeSection] = useState(false);
  const [showDossiersSection, setShowDossiersSection] = useState(true);

  // --- dossiers ---
  const [items, setItems] = useState<DossierFacturable[]>([]);
  const [rawItems, setRawItems] = useState<DossierFacturable[]>([]);
  const [filters, setFilters] = useState<DossiersFilters>({ limit: 5000, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [grouped, setGrouped] = useState(false);

  // pagination dossiers
  const [dossiersPage, setDossiersPage] = useState(1);

  // --- drawer ---
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DossierFacturable | null>(null);
  const [showRawTerrain, setShowRawTerrain] = useState(false);

  // --- imports ---
  const [importType, setImportType] = useState<"PRAXEDO" | "PIDI" | "ORANGE_PPD" | "PRAXEDO_CR10" | null>(null);

  // --- orange ---
  const [orangeRows, setOrangeRows] = useState<OrangePpdComparison[]>([]);
  const [orangeImports, setOrangeImports] = useState<OrangePpdImportSummary[]>([]);
  const [selectedOrangeImportId, setSelectedOrangeImportId] = useState<string>("");
  const [orangePpdOptions, setOrangePpdOptions] = useState<string[]>([]);
  const [selectedOrangePpd, setSelectedOrangePpd] = useState<string>("");
  const [onlyOrangeMismatch, setOnlyOrangeMismatch] = useState(false);
  const [expandedOrangeRows, setExpandedOrangeRows] = useState<Set<string>>(new Set());

  // Filtres tableau Orange
  const [orangeStatus, setOrangeStatus] = useState<"ALL" | "OK" | "A_VERIFIER">("ALL");
  const [orangeCroisementFilter, setOrangeCroisementFilter] = useState<string>("ALL");
  const [orangeOtSearch, setOrangeOtSearch] = useState<string>("");
  const [orangeNdSearch, setOrangeNdSearch] = useState<string>("");

  const [loadingOrange, setLoadingOrange] = useState(false);
  const [exportingOrange, setExportingOrange] = useState(false);

  // pagination orange
  const [orangePage, setOrangePage] = useState(1);

  // summary (HT/TTC totals)
  const [orangeSummary, setOrangeSummary] = useState<OrangePpdCompareSummary | null>(null);

  // --------- LOAD DOSSIERS ----------
  const load = useCallback(
    async (f?: DossiersFilters) => {
      const activeFilters = f ?? filters;

      const normalized: DossiersFilters = {
        ...activeFilters,
        limit: 5000,
        offset: 0,
      };

      setLoading(true);
      setError(null);

      try {
        const data = await listDossiers(normalized);
        setRawItems(data);
        setItems(data);
        setDossiersPage(1);
        if (f) setFilters(normalized);
      } catch (e: any) {
        setRawItems([]);
        setItems([]);
        setError(e?.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load({ limit: 5000, offset: 0 });
  }, [load]);

  // --------- LOAD ORANGE ----------
  const loadOrangeComparison = useCallback(
    async (opts?: { importId?: string; ppd?: string; onlyMismatch?: boolean }) => {
      setLoadingOrange(true);
      setError(null);
      try {
        const importId = opts?.importId ?? selectedOrangeImportId;
        const ppd = opts?.ppd ?? selectedOrangePpd;
        const mismatch = opts?.onlyMismatch ?? onlyOrangeMismatch;

        const [rows, imports, ppds, summary] = await Promise.all([
          compareOrangePpd({
            importId,
            ppd: ppd || undefined,
            onlyMismatch: mismatch,
          }),
          listOrangeImports(30),
          listOrangePpdOptions(importId || undefined),
          compareOrangePpdSummary({ importId, ppd: ppd || undefined }),
        ]);

        setOrangeRows(rows);
        setOrangeImports(imports);
        setOrangePpdOptions(ppds);
        setOrangeSummary(summary);
        setOrangePage(1);
        setExpandedOrangeRows(new Set());
        setOrangeStatus("ALL");
        setOrangeCroisementFilter("ALL");
        setOrangeOtSearch("");
        setOrangeNdSearch("");

        if (!selectedOrangeImportId && imports.length > 0) {
          setSelectedOrangeImportId(imports[0].import_id);
        }
      } catch (e: any) {
        setError(e?.message || "Erreur chargement comparaison Orange.");
      } finally {
        setLoadingOrange(false);
      }
    },
    [selectedOrangeImportId, selectedOrangePpd, onlyOrangeMismatch]
  );

  // --- Valeurs uniques pour filtre croisement ---
  const uniqueCroisementStatus = useMemo(() => {
    const statuses = new Set<string>();
    orangeRows.forEach((row) => {
      if (row.statut_croisement) statuses.add(row.statut_croisement);
    });
    return Array.from(statuses).sort();
  }, [orangeRows]);

  // ✅ Filtrage amélioré pour OT et ND
  const orangeRowsFiltered = useMemo(() => {
    const enrichedRows = orangeRows.map((row) => {
      const ndList = normalizeNds(row.nds);
      const hasKyntus =
        row.facturation_kyntus_ht !== null && row.facturation_kyntus_ht !== undefined;

      const reason = (() => {
        const backendReason = row.reason;
        if (backendReason) return String(backendReason).toUpperCase();

        if (!hasKyntus) return "OT_INEXISTANT";
        if (row.statut_croisement !== "OK") return "CROISEMENT_INCOMPLET";
        if (
          row.diff_ht !== null &&
          row.diff_ht !== undefined &&
          Math.abs(Number(row.diff_ht)) >= 0.01
        )
          return "COMPARAISON_INCOHERENTE";
        if (
          row.diff_ttc !== null &&
          row.diff_ttc !== undefined &&
          Math.abs(Number(row.diff_ttc)) >= 0.01
        )
          return "COMPARAISON_INCOHERENTE";
        return "OK";
      })();

      return {
        ...row,
        nds: ndList,
        ot_existant: hasKyntus,
        croisement_complet: row.statut_croisement === "OK",
        reason,
      };
    });

    let rows = enrichedRows;

    // Filtre OK / à vérifier
    if (orangeStatus === "OK") rows = rows.filter((r) => r.reason === "OK");
    if (orangeStatus === "A_VERIFIER") rows = rows.filter((r) => r.reason !== "OK");

    // Filtre croisement
    if (orangeCroisementFilter !== "ALL") {
      rows = rows.filter((r) => r.statut_croisement === orangeCroisementFilter);
    }

    // ✅ Filtre OT amélioré - recherche dans num_ot
    if (orangeOtSearch.trim() !== "") {
      const searchTerm = orangeOtSearch.trim().toLowerCase();
      rows = rows.filter((r) => {
        const ot = String(r.num_ot || "").toLowerCase();
        return ot.includes(searchTerm);
      });
    }

    // ✅ Filtre ND amélioré - recherche dans tous les ND
    if (orangeNdSearch.trim() !== "") {
      const ndNeedle = orangeNdSearch.trim().toLowerCase();
      rows = rows.filter((r) => {
        const nds = r.nds as string[];
        return nds.some((nd: string) => nd.toLowerCase().includes(ndNeedle));
      });
    }

    return [...rows].sort((a, b) => {
      const aBad = a.reason !== "OK";
      const bBad = b.reason !== "OK";
      if (aBad && !bBad) return -1;
      if (!aBad && bBad) return 1;
      return String(a.num_ot || "").localeCompare(String(b.num_ot || ""));
    });
  }, [orangeRows, orangeStatus, orangeCroisementFilter, orangeOtSearch, orangeNdSearch]);

  // 👉 Fonction pour scraper les relevés manquants
  const handleScrapeMissing = () => {
    // Récupérer tous les relevés ou OTs manquants
    const missing = orangeRowsFiltered
      .filter((r) => r.reason === "RELEVE_ABSENT_PIDI" || r.reason === "OT_INEXISTANT" || r.reason === "CROISEMENT_INCOMPLET")
      .map((r) => r.releve || r.num_ot) // On préfère le relevé, sinon num_ot
      .filter(Boolean);

    // Enlever les doublons
    const uniqueMissing = Array.from(new Set(missing));

    if (uniqueMissing.length === 0) {
      alert("✅ Aucun relevé manquant à scraper ! Tout est bon.");
      return;
    }

    // Sauvegarder dans sessionStorage
    sessionStorage.setItem("kyntus_missing_releves", uniqueMissing.join("\n"));
    
    // Rediriger vers la page scraper
    router.push("/scraper");
  };

  // --------- EXPORT ORANGE EXCEL ----------
  const exportOrangeExcel = useCallback(async () => {
    if (!orangeRowsFiltered.length) return;

    setExportingOrange(true);
    try {
      const dataToExport = orangeRowsFiltered.map((r) => {
        const ndList = normalizeNds(r.nds);
        return {
          "Num OT": r.num_ot,
          "Relevé": r.releve ?? "—",
          "ND(s)": ndList.length ? ndList.join(", ") : "—",
          "OT Existant": r.ot_existant ? "Oui" : "Non",
          "Statut Croisement": r.statut_croisement ?? "—",
          "Raison": reasonLabel(r.reason ?? ""),
          "Orange HT": r.facturation_orange_ht,
          "Kyntus HT": r.facturation_kyntus_ht,
          "Diff HT": r.diff_ht,
          "Orange TTC": r.facturation_orange_ttc,
          "Kyntus TTC": r.facturation_kyntus_ttc,
          "Diff TTC": r.diff_ttc,
        };
      });

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      ws["!cols"] = [
        { wch: 15 },
        { wch: 14 },
        { wch: 30 },
        { wch: 12 },
        { wch: 18 },
        { wch: 25 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
      ];

      const importInfo = selectedOrangeImportId
        ? orangeImports.find((i) => i.import_id === selectedOrangeImportId)
        : null;
      const fileName = `comparaison_orange_${importInfo?.filename ?? "export"}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      XLSX.utils.book_append_sheet(wb, ws, "Comparaison Orange");
      XLSX.writeFile(wb, fileName);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'export Excel Orange");
    } finally {
      setExportingOrange(false);
    }
  }, [orangeRowsFiltered, selectedOrangeImportId, orangeImports]);

  // toggle expand pour les lignes Orange avec plusieurs ND
  const toggleOrangeRow = (rowId: string) => {
    setExpandedOrangeRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // escape drawer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (drawerOpen) {
          setDrawerOpen(false);
          setSelected(null);
          setShowRawTerrain(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // ------- derived -------
  const ppdOptions = useMemo(() => {
    const xs = rawItems
      .map((d) => (d.numero_ppd ?? "").trim())
      .filter((x) => x.length > 0);
    return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
  }, [rawItems]);

  const hasAnyPidi = useMemo(() => rawItems.some((d) => !!d.statut_pidi), [rawItems]);

  const countByCroisement = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = it.statut_croisement ?? "INCONNU";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const countByPpd = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      if (!it.statut_pidi) continue;
      const k = (it.numero_ppd ?? "").trim() || "SANS_PPD";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const countByMotif = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = (it.motif_verification ?? "").trim();
      if (!k || k === "—") continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const orangePageCount = useMemo(
    () => Math.max(1, Math.ceil(orangeRowsFiltered.length / PAGE_SIZE)),
    [orangeRowsFiltered.length]
  );

  const orangeRowsPage = useMemo(() => {
    const start = (orangePage - 1) * PAGE_SIZE;
    return orangeRowsFiltered.slice(start, start + PAGE_SIZE);
  }, [orangeRowsFiltered, orangePage]);

  async function exportExcel() {
    setIsExporting(true);
    try {
      await exportDossiersXlsx(filters);
    } catch (e: any) {
      setError(e?.message || "Export Excel échoué.");
    } finally {
      setIsExporting(false);
    }
  }

  function openDrawer(d: DossierFacturable) {
    setSelected(d);
    setDrawerOpen(true);
    setShowRawTerrain(false);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
    setShowRawTerrain(false);
  }

  const groupedEntries = useMemo(() => groupByPpd(items), [items]);

  const selectedTerrainArticles = useMemo(() => {
    if (!selected) return [];
    return parseAnyList(selected.article_facturation_propose).map((x) => x.toUpperCase());
  }, [selected]);

  const selectedPidiCodes = useMemo(() => {
    if (!selected) return [];
    return parsePidiBrutCodes(selected.liste_articles);
  }, [selected]);

  const dossiersPageCount = useMemo(
    () => Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
    [items.length]
  );

  const dossiersPageItems = useMemo(() => {
    const start = (dossiersPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, dossiersPage]);

  return (
    <div className="space-y-4">
      <style jsx>{`
        [data-details-btn] {
          background: #f36868;
          border: 1px solid #f36868;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        [data-details-btn]:hover {
          background: #d65c5c;
          border-color: #d65c5c;
        }
      `}</style>

      <FiltersBar onSearch={(f) => load(f)} loading={loading} statuts={statutsFinal} ppds={ppdOptions} />

      {error && (
        <div className="mx-2 p-2 rounded border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ACTIONS + choix affichage */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-600">{loading ? "Chargement…" : `${items.length} dossiers`}</div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm border rounded px-3 py-2 bg-white cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showDossiersSection}
              onChange={(e) => setShowDossiersSection(e.target.checked)}
            />
            Afficher Dossiers
          </label>
          <label className="inline-flex items-center gap-2 text-sm border rounded px-3 py-2 bg-white cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showOrangeSection}
              onChange={(e) => setShowOrangeSection(e.target.checked)}
            />
            Afficher Orange
          </label>

          <button
            onClick={() => load(filters)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>

          <button
            onClick={() => setGrouped((x) => !x)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
            title="Regrouper les dossiers par PPD"
          >
            <Layers className="h-4 w-4" />
            {grouped ? "Vue dossiers" : "Regrouper PPD"}
          </button>

          <button
            onClick={() => setImportType("PRAXEDO")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Praxedo
          </button>

          <button
            onClick={() => setImportType("PRAXEDO_CR10")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Praxedo CR10
          </button>

          <button
            onClick={() => setImportType("PIDI")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            PIDI
          </button>

          <button
            onClick={() => setImportType("ORANGE_PPD")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Orange PPD
          </button>

          <button
            onClick={exportExcel}
            disabled={isExporting || items.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            title="Exporter en Excel (xlsx)"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Export…" : "Exporter Excel"}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="px-2 space-y-3">
        <div>
          <div className="text-sm text-gray-700 mb-2">Répartition (croisement) :</div>
          <div className="flex flex-wrap gap-2">
            {countByCroisement.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <Badge txt={k.replaceAll("_", " ")} kind={croisementKind(k)} />
                <span className="text-sm text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {hasAnyPidi ? (
          <div>
            <div className="text-sm text-gray-700 mb-2">Répartition (PPD) :</div>
            <div className="flex flex-wrap gap-2">
              {countByPpd.slice(0, 20).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <Badge txt={k} kind={k === "SANS_PPD" ? "rose" : "lime"} />
                  <span className="text-sm text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm text-gray-700 mb-2">Répartition (PPD) :</div>
            <div className="text-sm text-gray-500">Importer PIDI pour afficher la répartition PPD.</div>
          </div>
        )}

        {countByMotif.length > 0 && (
          <div>
            <div className="text-sm text-gray-700 mb-2">Répartition (motif) :</div>
            <div className="flex flex-wrap gap-2">
              {countByMotif.slice(0, 12).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <Badge txt={motifLabel(k)} kind={motifKind(k)} />
                  <span className="text-sm text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          ORANGE SECTION
      ══════════════════════════════════════════════════ */}
      {showOrangeSection && (
        <div className="mx-2 rounded-lg border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Comparaison Kyntus vs Orange (Num OT)</div>
              <div className="text-xs text-gray-500">
                Comparaison PPD + facturation (HT/TTC) entre Orange et Kyntus (par import).
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bouton Scraper les manquants */}
              <button
                onClick={handleScrapeMissing}
                disabled={orangeRowsFiltered.length === 0}
                className="inline-flex items-center gap-2 px-3 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60 text-sm font-medium shadow-sm transition-colors"
                title="Extraire les relevés manquants depuis Praxedo"
              >
                <Sparkles className="h-4 w-4" />
                Scraper les manquants
              </button>

              <button
                onClick={exportOrangeExcel}
                disabled={exportingOrange || orangeRowsFiltered.length === 0}
                className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-sm"
                title="Exporter la comparaison Orange en Excel"
              >
                <Download className="h-4 w-4" />
                {exportingOrange ? "Export..." : "Exporter Orange"}
              </button>

              <button
                onClick={() => loadOrangeComparison()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
                disabled={loadingOrange}
              >
                <RefreshCw className="h-4 w-4" />
                {loadingOrange ? "Chargement..." : "Actualiser Orange"}
              </button>
            </div>
          </div>

          {/* Sélecteurs API */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedOrangeImportId}
              onChange={(e) => setSelectedOrangeImportId(e.target.value)}
              className="border rounded px-2 py-2 text-sm min-w-[360px]"
            >
              <option value="">Dernier import</option>
              {orangeImports.map((it) => (
                <option key={it.import_id} value={it.import_id}>
                  {(it.imported_at ?? "?").replace("T", " ").slice(0, 19)} • {it.filename ?? "sans nom"} •{" "}
                  {it.row_count ?? 0} lignes
                </option>
              ))}
            </select>

            <select
              value={selectedOrangePpd}
              onChange={(e) => setSelectedOrangePpd(e.target.value)}
              className="border rounded px-2 py-2 text-sm min-w-[240px]"
            >
              <option value="">Toutes les PPD</option>
              {orangePpdOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyOrangeMismatch}
                onChange={(e) => setOnlyOrangeMismatch(e.target.checked)}
              />
              API: uniquement à vérifier
            </label>

            <button
              onClick={() =>
                loadOrangeComparison({
                  importId: selectedOrangeImportId,
                  ppd: selectedOrangePpd,
                  onlyMismatch: onlyOrangeMismatch,
                })
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Lancer la comparaison
            </button>
          </div>

          {/* Filtres tableau */}
          <div className="flex flex-wrap items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg border">
            <div className="text-xs font-medium text-gray-700 mr-1">Filtres tableau :</div>

            <select
              className="border rounded px-2 py-2 text-sm min-w-[140px]"
              value={orangeStatus}
              onChange={(e) => {
                setOrangeStatus(e.target.value as "ALL" | "OK" | "A_VERIFIER");
                setOrangePage(1);
              }}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="OK">OK uniquement</option>
              <option value="A_VERIFIER">À vérifier uniquement</option>
            </select>

            <select
              className="border rounded px-2 py-2 text-sm min-w-[180px]"
              value={orangeCroisementFilter}
              onChange={(e) => {
                setOrangeCroisementFilter(e.target.value);
                setOrangePage(1);
              }}
            >
              <option value="ALL">Tous les croisements</option>
              {uniqueCroisementStatus.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Rechercher OT..."
                value={orangeOtSearch}
                onChange={(e) => {
                  setOrangeOtSearch(e.target.value);
                  setOrangePage(1);
                }}
                className="border rounded px-3 py-2 text-sm min-w-[200px]"
              />
              {orangeOtSearch && (
                <button
                  onClick={() => {
                    setOrangeOtSearch("");
                    setOrangePage(1);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Effacer la recherche OT"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Filtrer ND..."
                value={orangeNdSearch}
                onChange={(e) => {
                  setOrangeNdSearch(e.target.value);
                  setOrangePage(1);
                }}
                className="border rounded px-3 py-2 text-sm min-w-[200px]"
              />
              {orangeNdSearch && (
                <button
                  onClick={() => {
                    setOrangeNdSearch("");
                    setOrangePage(1);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Effacer filtre ND"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* TOTAUX */}
          {orangeSummary && (
            <div className="flex flex-wrap items-center gap-4 w-full mt-2 bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Orange Total HT</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold bg-orange-100 text-orange-900 border border-orange-300">
                  {fmtNum(orangeSummary.orange_total_ht)} €
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Orange Total TTC</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold bg-orange-100 text-orange-900 border border-orange-300">
                  {fmtNum(orangeSummary.orange_total_ttc)} €
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Kyntus Total HT</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-300">
                  {fmtNum(orangeSummary.kyntus_total_ht)} €
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Kyntus Total TTC</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-300">
                  {fmtNum(orangeSummary.kyntus_total_ttc)} €
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Écart HT</span>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold ${
                    orangeSummary.ecart_ht >= 0
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  {fmtNum(orangeSummary.ecart_ht)} €
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Écart TTC</span>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold ${
                    orangeSummary.ecart_ttc >= 0
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  {fmtNum(orangeSummary.ecart_ttc)} €
                </span>
              </div>
            </div>
          )}

          {/* Compteurs + pagination */}
          <div className="flex items-center justify-between w-full mt-1">
            <div className="text-xs text-gray-600">
              {orangeRowsFiltered.length} ligne(s) • OK:{" "}
              {orangeRowsFiltered.filter((r) => r.reason === "OK").length} • À vérifier:{" "}
              {orangeRowsFiltered.filter((r) => r.reason !== "OK").length} • Import:{" "}
              {selectedOrangeImportId || "dernier"}
              {orangeOtSearch && <span className="ml-2">• OT: "{orangeOtSearch}"</span>}
              {orangeNdSearch && <span className="ml-2">• ND: "{orangeNdSearch}"</span>}
              {orangeCroisementFilter !== "ALL" && (
                <span className="ml-2">• Croisement: {orangeCroisementFilter.replaceAll("_", " ")}</span>
              )}
              {orangeStatus !== "ALL" && (
                <span className="ml-2">• Statut: {orangeStatus === "OK" ? "OK" : "À vérifier"}</span>
              )}
            </div>

            <Pagination
              page={orangePage}
              pageCount={orangePageCount}
              onPrev={() => setOrangePage((p) => Math.max(1, p - 1))}
              onNext={() => setOrangePage((p) => Math.min(orangePageCount, p + 1))}
              onGo={(p) => setOrangePage(p)}
            />
          </div>

          {/* ✅ Table Orange avec lignes expansibles */}
          {orangeRowsFiltered.length > 0 && (
            <div className="overflow-x-auto border rounded mt-4">
              <table className="min-w-[2000px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-3 text-sm font-semibold w-8"></th>
                    <th className="p-3 text-sm font-semibold">OT (CAC)</th>
                    <th className="p-3 text-sm font-semibold">Relevé / ND</th>
                    <th className="p-3 text-sm font-semibold">Raison</th>
                    <th className="p-3 text-sm font-semibold">Montant brut (HT)</th>
                    <th className="p-3 text-sm font-semibold">Vision Praxedo (HT)</th>
                    <th className="p-3 text-sm font-semibold">Diff HT</th>
                    <th className="p-3 text-sm font-semibold">Montant majoré (TTC)</th>
                    <th className="p-3 text-sm font-semibold">Vision Praxedo (TTC)</th>
                    <th className="p-3 text-sm font-semibold">Différence</th>
                  </tr>
                </thead>

                <tbody>
                  {orangeRowsPage.map((r) => {
                    const ndList = normalizeNds(r.nds);
                    const hasMultipleNds = ndList.length > 1;
                    const rowId = `${r.num_ot}__${r.releve ?? ""}`;
                    const isExpanded = expandedOrangeRows.has(rowId);
                    
                    return (
                      <React.Fragment key={rowId}>
                        {/* Ligne principale */}
                        <tr
                          className={`border-t transition-colors cursor-pointer ${orangeRowClass(r)}`}
                          onClick={() => hasMultipleNds && toggleOrangeRow(rowId)}
                        >
                          <td className="p-3 align-top">
                            {hasMultipleNds && (
                              <button className="text-gray-500 hover:text-gray-700">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                          <td className="p-3 font-mono font-medium align-top">{r.num_ot || "—"}</td>
                          <td className="p-3 align-top">
                            <div className="font-mono">{r.releve ? String(r.releve) : "—"}</div>
                            {!isExpanded && hasMultipleNds && (
                              <div className="text-xs font-mono text-gray-500 mt-1">
                                {ndList.length} ND • {ndList[0]}{ndList.length > 1 ? "..." : ""}
                              </div>
                            )}
                            {isExpanded && (
                              <div className="mt-2 space-y-1">
                                {ndList.map((nd, idx) => (
                                  <div key={idx} className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                    {nd}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-3 align-top">
                            <Badge txt={reasonLabel(r.reason ?? "")} kind={orangeReasonBadgeKind(r)} />
                          </td>
                          <td className="p-3 align-top">
                            <AmountPill v={r.facturation_orange_ht} kind="orange" />
                          </td>
                          <td className="p-3 align-top">
                            <AmountPill v={r.facturation_kyntus_ht} kind="kyntus" />
                          </td>
                          <td className="p-3 align-top">
                            <AmountPill v={r.diff_ht} kind="diff" />
                          </td>
                          <td className="p-3 align-top">
                            <AmountPill v={r.facturation_orange_ttc} kind="orange" />
                          </td>
                          <td className="p-3 align-top">
                            <AmountPill v={r.facturation_kyntus_ttc} kind="kyntus" />
                          </td>
                          <td className="p-3 align-top">
                            <AmountPill v={r.diff_ttc} kind="diff" />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {orangeRowsFiltered.length === 0 && (
            <div className="text-sm text-gray-500 py-4 text-center">
              Aucune ligne à afficher (selon les filtres).
              {orangeOtSearch && <div className="mt-1">Recherche OT : "{orangeOtSearch}"</div>}
              {orangeNdSearch && <div className="mt-1">Recherche ND : "{orangeNdSearch}"</div>}
              {orangeCroisementFilter !== "ALL" && (
                <div className="mt-1">Croisement : {orangeCroisementFilter.replaceAll("_", " ")}</div>
              )}
              {orangeStatus !== "ALL" && (
                <div className="mt-1">Statut : {orangeStatus === "OK" ? "OK" : "À vérifier"}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          DOSSIERS SECTION - AVEC NOUVELLE COLONNE PALIER
      ══════════════════════════════════════════════════ */}
      {showDossiersSection && (
        <div className="border rounded-lg overflow-auto bg-white mx-2">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
            <div className="text-sm font-semibold">Dossiers</div>
            {!grouped && (
              <Pagination
                page={dossiersPage}
                pageCount={dossiersPageCount}
                onPrev={() => setDossiersPage((p) => Math.max(1, p - 1))}
                onNext={() => setDossiersPage((p) => Math.min(dossiersPageCount, p + 1))}
                onGo={(p) => setDossiersPage(p)}
              />
            )}
          </div>

          <table className="min-w-[2000px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">OT</th>
                <th className="p-3">ND</th>
                <th className="p-3">PPD</th>
                <th className="p-3">Attachement</th>
                <th className="p-3">Act.</th>
                <th className="p-3">Prod.</th>
                <th className="p-3">Code cible</th>
                <th className="p-3">Clôture</th>
                <th className="p-3">Terrain</th>
                <th className="p-3">Règle</th>
                <th className="p-3">Statut final</th>
                <th className="p-3">Croisement</th>
                <th className="p-3">Praxedo</th>
                <th className="p-3">PIDI</th>
                <th className="p-3">Palier</th> {/* ✅ NOUVELLE COLONNE */}
                <th className="p-3">Actions</th>
                <th className="p-3">Planifiée</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-6 text-center text-gray-500">
                    {loading ? "Chargement…" : "Aucun dossier à afficher."}
                  </td>
                </tr>
              ) : !grouped ? (
                dossiersPageItems.map((d) => {
                  const sf = d.statut_final ?? "NON_FACTURABLE";
                  const cro = d.statut_croisement ?? "INCONNU";
                  const terrainLabel = d.mode_passage ? d.mode_passage : "—";

                  return (
                    <tr
                      key={d.key_match}
                      className="border-t hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => openDrawer(d)}
                      title="Clique pour ouvrir les détails"
                    >
                      <td className="p-3 font-mono">{d.ot_key ?? "—"}</td>
                      <td className="p-3 font-mono">{d.nd_global ?? "—"}</td>
                      <td className="p-3 font-mono">{d.numero_ppd ?? "—"}</td>
                      <td className="p-3">{d.attachement_valide ?? "—"}</td>
                      <td className="p-3">{d.activite_code ?? "—"}</td>
                      <td className="p-3">{d.produit_code ?? "—"}</td>
                      <td className="p-3">{d.code_cible ?? "—"}</td>
                      <td className="p-3">
                        {d.code_cloture_code ? (
                          <Badge txt={d.code_cloture_code} kind={clotureKind(d.code_cloture_code)} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        {d.mode_passage ? (
                          <Badge txt={terrainLabel} kind={terrainKind(d.mode_passage)} />
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="max-w-[520px] truncate" title={d.libelle_regle ?? ""}>
                          {d.libelle_regle ?? "—"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge txt={sf.replaceAll("_", " ")} kind={statutFinalKind(sf)} />
                            {d.is_previsite ? <Badge txt="Prévisite" kind="slate" /> : null}
                          </div>
                          {sf === "A_VERIFIER" && d.motif_verification ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                txt={motifLabel(d.motif_verification)}
                                kind={motifKind(d.motif_verification)}
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge txt={cro.replaceAll("_", " ")} kind={croisementKind(cro)} />
                      </td>
                      <td className="p-3">
                        {d.statut_praxedo ? (
                          <Badge
                            txt={praxedoLabel(d)}
                            kind={d.statut_praxedo.toLowerCase().includes("valid") ? "green" : "gray"}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-purple-700 font-medium">{pidiLabel(d)}</span>
                      </td>
                      <td className="p-3">
                        {d.palier ? (
                          <Badge txt={d.palier.replaceAll("_", " ")} kind="lightBlue" />
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(d);
                          }}
                          data-details-btn
                          className={DETAILS_BTN_CLASS}
                          title="Ouvrir les détails du dossier"
                        >
                          Détails
                        </button>
                      </td>
                      <td className="p-3">{formatFrDate(d.date_planifiee)}</td>
                      <td className="p-3">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })
              ) : (
                groupedEntries.map(([ppd, rows]) => (
                  <tr key={ppd} className="border-t">
                    <td colSpan={18} className="p-0">
                      <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900">
                            PPD: <span className="font-mono">{ppd}</span>
                          </span>
                          <span className="text-xs text-gray-600">{rows.length} dossiers</span>
                        </div>
                      </div>

                      <div className="overflow-auto">
                        <table className="min-w-[2000px] w-full text-sm">
                          <tbody>
                            {rows.map((d) => {
                              const sf = d.statut_final ?? "NON_FACTURABLE";
                              const cro = d.statut_croisement ?? "INCONNU";
                              const terrainLabel = d.mode_passage ? d.mode_passage : "—";

                              return (
                                <tr
                                  key={d.key_match}
                                  className="border-b hover:bg-gray-50/50 cursor-pointer"
                                  onClick={() => openDrawer(d)}
                                >
                                  <td className="p-3 font-mono w-[160px]">{d.ot_key ?? "—"}</td>
                                  <td className="p-3 font-mono w-[160px]">{d.nd_global ?? "—"}</td>
                                  <td className="p-3 font-mono w-[160px]">{d.numero_ppd ?? "—"}</td>
                                  <td className="p-3 w-[160px]">{d.attachement_valide ?? "—"}</td>
                                  <td className="p-3 w-[80px]">{d.activite_code ?? "—"}</td>
                                  <td className="p-3 w-[80px]">{d.produit_code ?? "—"}</td>
                                  <td className="p-3 w-[120px]">{d.code_cible ?? "—"}</td>
                                  <td className="p-3 w-[110px]">
                                    {d.code_cloture_code ? (
                                      <Badge
                                        txt={d.code_cloture_code}
                                        kind={clotureKind(d.code_cloture_code)}
                                      />
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="p-3 w-[120px]">
                                    {d.mode_passage ? (
                                      <Badge txt={terrainLabel} kind={terrainKind(d.mode_passage)} />
                                    ) : (
                                      <span className="text-gray-500">—</span>
                                    )}
                                  </td>
                                  <td className="p-3 w-[520px]">
                                    <div
                                      className="max-w-[520px] truncate"
                                      title={d.libelle_regle ?? ""}
                                    >
                                      {d.libelle_regle ?? "—"}
                                    </div>
                                  </td>
                                  <td className="p-3 w-[220px]">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          txt={sf.replaceAll("_", " ")}
                                          kind={statutFinalKind(sf)}
                                        />
                                        {d.is_previsite ? (
                                          <Badge txt="Prévisite" kind="slate" />
                                        ) : null}
                                      </div>
                                      {sf === "A_VERIFIER" && d.motif_verification ? (
                                        <Badge
                                          txt={motifLabel(d.motif_verification)}
                                          kind={motifKind(d.motif_verification)}
                                        />
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="p-3 w-[140px]">
                                    <Badge txt={cro.replaceAll("_", " ")} kind={croisementKind(cro)} />
                                  </td>
                                  <td className="p-3 w-[140px]">
                                    {d.statut_praxedo ? (
                                      <Badge
                                        txt={praxedoLabel(d)}
                                        kind={
                                          d.statut_praxedo.toLowerCase().includes("valid")
                                            ? "green"
                                            : "gray"
                                        }
                                      />
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="p-3 w-[160px]">
                                    <span className="text-purple-700 font-medium">{pidiLabel(d)}</span>
                                  </td>
                                  <td className="p-3 w-[100px]">
                                    {d.palier ? (
                                      <Badge txt={d.palier.replaceAll("_", " ")} kind="lightBlue" />
                                    ) : (
                                      <span className="text-gray-500">—</span>
                                    )}
                                  </td>
                                  <td className="p-3 w-[80px]">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDrawer(d);
                                      }}
                                      data-details-btn
                                      className={DETAILS_BTN_CLASS}
                                    >
                                      Détails
                                    </button>
                                  </td>
                                  <td className="p-3 w-[170px]">{formatFrDate(d.date_planifiee)}</td>
                                  <td className="p-3 w-[40px]">
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          DRAWER avec commentaire technique + PALIER + PHRASE + EVENEMENTS
      ══════════════════════════════════════════════════ */}
      {drawerOpen && selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />

          <div className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl border-l flex flex-col">
            <div className="px-5 py-4 border-b flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Détails dossier</div>
                <div className="text-lg font-semibold">
                  <span className="font-mono">{selected.ot_key ?? "—"}</span>
                  <span className="text-gray-400"> • </span>
                  <span className="font-mono">{selected.nd_global ?? "—"}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    txt={(selected.statut_final ?? "—").replaceAll("_", " ")}
                    kind={statutFinalKind(selected.statut_final)}
                  />
                  <Badge
                    txt={(selected.statut_croisement ?? "INCONNU").replaceAll("_", " ")}
                    kind={croisementKind(selected.statut_croisement)}
                  />
                  {selected.is_previsite ? <Badge txt="Prévisite" kind="slate" /> : null}
                  {selected.motif_verification ? (
                    <Badge
                      txt={motifLabel(selected.motif_verification)}
                      kind={motifKind(selected.motif_verification)}
                    />
                  ) : null}
                </div>
              </div>

              <button
                onClick={closeDrawer}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-5">
              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle title="Résumé" right={<Info className="h-4 w-4 text-gray-400" />} />
                <div className="space-y-2">
                  <KeyValue
                    k="Activité / Produit"
                    v={
                      <span className="font-medium">
                        {selected.activite_code ?? "—"} / {selected.produit_code ?? "—"}
                      </span>
                    }
                  />
                  <KeyValue k="Code cible" v={selected.code_cible ?? "—"} />
                  <KeyValue k="PPD" v={<span className="font-mono">{selected.numero_ppd ?? "—"}</span>} />
                  <KeyValue k="Attachement validé" v={selected.attachement_valide ?? "—"} />
                  <KeyValue
                    k="Clôture"
                    v={
                      selected.code_cloture_code ? (
                        <Badge
                          txt={selected.code_cloture_code}
                          kind={clotureKind(selected.code_cloture_code)}
                        />
                      ) : (
                        "—"
                      )
                    }
                  />
                  <KeyValue
                    k="Motif"
                    v={
                      selected.motif_verification ? (
                        <Badge
                          txt={motifLabel(selected.motif_verification)}
                          kind={motifKind(selected.motif_verification)}
                        />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )
                    }
                  />
                  {/* ✅ NOUVEAUX CHAMPS */}
                  <KeyValue
                    k="Palier"
                    v={
                      selected.palier ? (
                        <Badge txt={selected.palier.replaceAll("_", " ")} kind="lightBlue" />
                      ) : (
                        "—"
                      )
                    }
                  />
                  <KeyValue k="Palier (phrase)" v={selected.palier_phrase ?? "—"} />
                  <KeyValue k="Planifiée" v={formatFrDate(selected.date_planifiee)} />
                  <KeyValue k="Technicien" v={selected.technicien ?? "—"} />
                </div>
              </div>

              {/* ✅ Section Terrain avec commentaire technique - VERSION DYNAMIQUE */}
              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle
                  title="Terrain (PBO / passage)"
                  right={
                    <button
                      className="text-xs text-blue-700 hover:underline"
                      onClick={() => setShowRawTerrain((x) => !x)}
                    >
                      {showRawTerrain ? "Masquer texte source" : "Voir texte source"}
                    </button>
                  }
                />

                {/* ✅ Commentaire technique extrait de la description ou du compte_rendu */}
                <div className="space-y-2 pt-2 border-b border-gray-100 pb-3">
                  <div className="text-xs font-medium text-gray-700">Commentaire technique</div>
                  
                  {(() => {
                    // Chercher d'abord dans description
                    const description = selected?.description || '';
                    const compteRendu = selected?.compte_rendu || '';
                    
                    // Extraire le bloc-note de la description
                    let commentaire = null;
                    
                    // Chercher dans description
                    const blocNoteMatch = description.match(/Bloc-note:\s*(.+?)(?:\n|$)/i);
                    if (blocNoteMatch && blocNoteMatch[1]) {
                      commentaire = blocNoteMatch[1].trim();
                    }
                    
                    // Si pas trouvé, chercher dans compte_rendu
                    if (!commentaire && compteRendu) {
                      const crMatch = compteRendu.replace(/\u00a0/g, ' ').match(/#commentairereleve\s*=\s*([^#]+)/i);
                      if (crMatch && crMatch[1]) {
                        commentaire = crMatch[1].trim();
                      }
                    }
                    
                    // Détections
                    const aPlp = commentaire ? commentaire.toLowerCase().includes('plp') : false;
                    const aPto = commentaire ? commentaire.toLowerCase().includes('pto') : false;
                    const aMutation = commentaire ? /muter?|mutation/i.test(commentaire) : false;
                    
                    return (
                      <>
                        {commentaire ? (
                          <div className="rounded border bg-gray-50 p-3">
                            <div className="text-xs text-gray-600 break-words whitespace-pre-wrap">
                              "{commentaire}"
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {aPlp && <Badge txt="PLP détecté" kind="orange" />}
                              {aPto && <Badge txt="PTO mentionné" kind="blue" />}
                              {aMutation && <Badge txt="Mutation" kind="purple" />}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            Aucun commentaire technique trouvé
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="text-xs text-gray-500 mb-1">Mode passage</div>
                    <div className="text-sm font-medium">
                      {selected?.mode_passage ? (
                        <Badge txt={selected.mode_passage} kind={terrainKind(selected.mode_passage)} />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="text-xs text-gray-500 mb-1">Type site</div>
                    <div className="text-sm font-medium">{selected?.type_site_terrain || "—"}</div>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3 col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Type PBO</div>
                    <div className="text-sm font-medium">{selected?.type_pbo_terrain ?? "—"}</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs text-gray-500 mb-2">Articles terrain proposés</div>
                  {selectedTerrainArticles.length ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedTerrainArticles.map((a) => (
                        <Chip key={a} txt={a} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">—</div>
                  )}
                </div>

                {showRawTerrain && (
                  <div className="space-y-2">
                    <div className="rounded border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500 mb-1">desc_site (source)</div>
                      <pre className="whitespace-pre-wrap break-words text-xs text-gray-800 max-h-40 overflow-auto">
                        {selected?.desc_site || "—"}
                      </pre>
                    </div>
                    <div className="rounded border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500 mb-1">description (source)</div>
                      <pre className="whitespace-pre-wrap break-words text-xs text-gray-800 max-h-60 overflow-auto">
                        {selected?.description || "—"}
                      </pre>
                    </div>
                    <div className="rounded border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500 mb-1">compte_rendu (source)</div>
                      <pre className="whitespace-pre-wrap break-words text-xs text-gray-800 max-h-60 overflow-auto">
                        {selected?.compte_rendu || "—"}
                      </pre>
                    </div>
                    {/* ✅ NOUVEAU : evenements (source) */}
                    <div className="rounded border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500 mb-1">evenements (source)</div>
                      <pre className="whitespace-pre-wrap break-words text-xs text-gray-800 max-h-60 overflow-auto">
                        {selected?.evenements || "—"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle title="Règle appliquée" />
                <div className="space-y-2">
                  <KeyValue
                    k="Code règle"
                    v={<span className="font-mono">{selected.regle_code ?? "—"}</span>}
                  />
                  <KeyValue k="Libellé" v={selected.libelle_regle ?? "—"} />
                  <KeyValue k="Statut facturation" v={selected.statut_facturation ?? "—"} />
                  <KeyValue
                    k="Clôtures facturables"
                    v={
                      selected.codes_cloture_facturables?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {selected.codes_cloture_facturables.map((c) => (
                            <Chip key={c} txt={c} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle title="Articles PIDI (brut)" />
                <div className="rounded border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500 mb-2">Colonne "liste_articles" (tokens)</div>
                  {selectedPidiCodes.length ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedPidiCodes.map((a) => (
                        <Chip key={a} txt={a} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">—</div>
                  )}
                </div>

                <div className="rounded border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500 mb-2">Texte source (PIDI brut)</div>
                  <pre className="whitespace-pre-wrap break-words text-xs text-gray-800">
                    {selected.liste_articles ?? "—"}
                  </pre>
                </div>
              </div>
            </div>

            <div className="border-t p-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">ESC pour fermer</div>
              <button onClick={closeDrawer} className="border rounded px-3 py-2 hover:bg-gray-50">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importType && (
        <FileUploadModal
          type={importType}
          onImported={(payload) => {
            const t = importType;
            setImportType(null);

            load(filters);

            if (payload?.importId && t === "ORANGE_PPD") {
              setSelectedOrangeImportId(payload.importId);
              setSelectedOrangePpd("");
              listOrangeImports(30).then(setOrangeImports).catch(() => {});
              listOrangePpdOptions(payload.importId).then(setOrangePpdOptions).catch(() => {});
            }
          }}
          onClose={() => setImportType(null)}
        />
      )}
    </div>
  );
}