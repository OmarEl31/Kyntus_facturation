//frontend/components/dossiers/orange-comparison-section.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Upload,
  Download,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import {
  compareOrangePpd,
  compareOrangePpdSummary,
  listOrangeImports,
  listOrangePpdOptions,
} from "@/services/dossiersApi";

import type {
  OrangePpdComparison,
  OrangePpdImportSummary,
  OrangePpdCompareSummary,
} from "@/services/dossiersApi";

const PAGE_SIZE = 300;
const ORANGE_UI_STATE_KEY = "kyntus_orange_ui_state_v2";
const ORANGE_DATA_STATE_KEY = "kyntus_orange_data_state_v2";

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
      <button
        className="border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
        onClick={onPrev}
        disabled={page <= 1}
      >
        Précédent
      </button>
      <span className="text-gray-700">
        Page <b>{page}</b> / {pageCount}
      </span>
      <button
        className="border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
        onClick={onNext}
        disabled={page >= pageCount}
      >
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

function normalizeNds(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "object") {
    return Object.values(v as Record<string, unknown>)
      .map((x) => String(x).trim())
      .filter(Boolean);
  }

  const s = String(v).trim();
  if (!s) return [];

  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean);
    } catch {}
  }

  if (s.startsWith("{") && s.endsWith("}")) {
    return s
      .slice(1, -1)
      .split(",")
      .map((x) => x.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }

  if (s.includes("|")) return s.split("|").map((x) => x.trim()).filter(Boolean);
  if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);

  return [s];
}

function resolveReleveAndNds(row: OrangePpdComparison): { releveText: string; ndList: string[] } {
  const releveRaw = typeof row.releve === "string" ? row.releve.trim() : "";
  const ndList = normalizeNds(row.nds ?? row.numero_ots);
  return {
    releveText: releveRaw || "—",
    ndList,
  };
}

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
    case "CAC_ABSENT_PIDI":
      return "CAC absent PIDI";
    case "ABSENT_PIDI":
      return "Absent PIDI";
    case "OK":
      return "OK";
    default:
      return r || "—";
  }
}

function orangeRowBg(reason: string) {
  const r = (reason || "").toUpperCase();
  if (r === "RELEVE_ABSENT_PIDI" || r === "CAC_ABSENT_PIDI" || r === "ABSENT_PIDI") {
    return "bg-red-50/40 hover:bg-red-100/50";
  }
  if (r === "OT_INEXISTANT" || r === "CROISEMENT_INCOMPLET" || r === "COMPARAISON_INCOHERENTE") {
    return "bg-amber-50/40 hover:bg-amber-100/50";
  }
  return "bg-green-50/30 hover:bg-green-100/50";
}

function orangeReasonBadgeKind(reason: string): BadgeKind {
  const r = (reason || "").toUpperCase();
  if (r === "OK") return "green";
  if (r === "RELEVE_ABSENT_PIDI" || r === "CAC_ABSENT_PIDI" || r === "ABSENT_PIDI") return "red";
  if (r === "COMPARAISON_INCOHERENTE") return "yellow";
  return "yellow";
}

function amountPillClass(kind: "orange" | "kyntus" | "diff", value?: number | null) {
  if (kind === "orange") return "bg-orange-100 text-orange-900 border border-orange-300";
  if (kind === "kyntus") return "bg-blue-50 text-blue-800 border border-blue-200";
  if (kind === "diff") {
    const n = Number(value ?? 0);
    if (n > 0) return "bg-green-100 text-green-800 border border-green-300";
    if (n < 0) return "bg-red-100 text-red-800 border border-red-300";
    return "bg-gray-100 text-gray-500 border border-gray-200";
  }
  return "bg-gray-100 text-gray-800";
}

function AmountPill({ v, kind }: { v: any; kind: "orange" | "kyntus" | "diff" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold ${amountPillClass(
        kind,
        kind === "diff" ? v : undefined
      )}`}
    >
      {fmtNum(v)} €
    </span>
  );
}

export default function OrangeComparisonSection({
  visible,
  onImportOrange,
  onScrapeMissing,
}: {
  visible: boolean;
  onImportOrange: () => void;
  onScrapeMissing: (rows: OrangePpdComparison[]) => void;
}) {
  const [orangeRows, setOrangeRows] = useState<OrangePpdComparison[]>([]);
  const [orangeImports, setOrangeImports] = useState<OrangePpdImportSummary[]>([]);
  const [selectedOrangeImportId, setSelectedOrangeImportId] = useState<string>("");
  const [orangePpdOptions, setOrangePpdOptions] = useState<string[]>([]);
  const [selectedOrangePpd, setSelectedOrangePpd] = useState<string>("");

  const [expandedCacKeys, setExpandedCacKeys] = useState<Set<string>>(new Set());

  const [orangeReasonFilter, setOrangeReasonFilter] = useState<string>("ALL");
  const [orangeCroisementFilter, setOrangeCroisementFilter] = useState<string>("ALL");
  const [orangeOtSearch, setOrangeOtSearch] = useState<string>("");
  const [orangeReleveSearch, setOrangeReleveSearch] = useState<string>("");
  const [orangeNdSearch, setOrangeNdSearch] = useState<string>("");

  const [loadingOrange, setLoadingOrange] = useState(false);
  const [exportingOrange, setExportingOrange] = useState(false);
  const [orangePage, setOrangePage] = useState(1);
  const [orangeSummary, setOrangeSummary] = useState<OrangePpdCompareSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrangeComparison = useCallback(
    async (opts?: { importId?: string; ppd?: string; preserveFilters?: boolean }) => {
      setLoadingOrange(true);
      setError(null);

      try {
        const importId = opts?.importId ?? selectedOrangeImportId;
        const ppd = opts?.ppd ?? selectedOrangePpd;

        const [rows, imports, ppds, summary] = await Promise.all([
          compareOrangePpd({ importId, ppd: ppd || undefined }),
          listOrangeImports(30),
          listOrangePpdOptions(importId || undefined),
          compareOrangePpdSummary({ importId, ppd: ppd || undefined }),
        ]);

        setOrangeRows(rows);
        setOrangeImports(imports);
        setOrangePpdOptions(ppds);
        setOrangeSummary(summary);
        setExpandedCacKeys(new Set());

        if (!opts?.preserveFilters) {
          setOrangePage(1);
          setOrangeReasonFilter("ALL");
          setOrangeCroisementFilter("ALL");
          setOrangeOtSearch("");
          setOrangeReleveSearch("");
          setOrangeNdSearch("");
        }

        if (!selectedOrangeImportId && imports.length > 0) {
          setSelectedOrangeImportId(imports[0].import_id);
        }
      } catch (e: any) {
        setError(e?.message || "Erreur chargement comparaison Orange.");
      } finally {
        setLoadingOrange(false);
      }
    },
    [selectedOrangeImportId, selectedOrangePpd]
  );

  useEffect(() => {
    if (!visible) return;

    const rawUi = sessionStorage.getItem(ORANGE_UI_STATE_KEY);
    if (rawUi) {
      try {
        const s = JSON.parse(rawUi);
        if (s.selectedOrangeImportId) setSelectedOrangeImportId(String(s.selectedOrangeImportId));
        if (s.selectedOrangePpd !== undefined) setSelectedOrangePpd(String(s.selectedOrangePpd || ""));
        if (s.orangeCroisementFilter) setOrangeCroisementFilter(String(s.orangeCroisementFilter));
        if (s.orangeReasonFilter) setOrangeReasonFilter(String(s.orangeReasonFilter));
        if (s.orangeOtSearch) setOrangeOtSearch(String(s.orangeOtSearch));
        if (s.orangeReleveSearch) setOrangeReleveSearch(String(s.orangeReleveSearch));
        if (s.orangeNdSearch) setOrangeNdSearch(String(s.orangeNdSearch));
        if (s.orangePage) setOrangePage(Number(s.orangePage) || 1);
      } catch {}
    }

    const rawData = sessionStorage.getItem(ORANGE_DATA_STATE_KEY);
    if (rawData) {
      try {
        const s = JSON.parse(rawData);
        if (Array.isArray(s.orangeRows)) setOrangeRows(s.orangeRows);
        if (Array.isArray(s.orangeImports)) setOrangeImports(s.orangeImports);
        if (Array.isArray(s.orangePpdOptions)) setOrangePpdOptions(s.orangePpdOptions);
        if (s.orangeSummary) setOrangeSummary(s.orangeSummary);
      } catch {}
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    sessionStorage.setItem(
      ORANGE_UI_STATE_KEY,
      JSON.stringify({
        selectedOrangeImportId,
        selectedOrangePpd,
        orangeCroisementFilter,
        orangeReasonFilter,
        orangeOtSearch,
        orangeReleveSearch,
        orangeNdSearch,
        orangePage,
      })
    );
  }, [
    visible,
    selectedOrangeImportId,
    selectedOrangePpd,
    orangeCroisementFilter,
    orangeReasonFilter,
    orangeOtSearch,
    orangeReleveSearch,
    orangeNdSearch,
    orangePage,
  ]);

  useEffect(() => {
    if (!visible) return;

    sessionStorage.setItem(
      ORANGE_DATA_STATE_KEY,
      JSON.stringify({
        orangeRows,
        orangeImports,
        orangePpdOptions,
        orangeSummary,
      })
    );
  }, [visible, orangeRows, orangeImports, orangePpdOptions, orangeSummary]);

  useEffect(() => {
    if (!visible) return;
    if (orangeRows.length === 0 && !loadingOrange) {
      loadOrangeComparison({ preserveFilters: true });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const uniqueCroisementStatus = useMemo(() => {
    const s = new Set<string>();
    orangeRows.forEach((r) => {
      if (r.statut_croisement) s.add(r.statut_croisement);
    });
    return Array.from(s).sort();
  }, [orangeRows]);

  const uniqueOrangeReasons = useMemo(() => {
    const s = new Set<string>();
    orangeRows.forEach((r) => {
      if (r.reason) s.add(String(r.reason).toUpperCase());
    });
    return Array.from(s).sort();
  }, [orangeRows]);

  const orangeCountByReason = useMemo(() => {
    const m = new Map<string, number>();
    orangeRows.forEach((r) => {
      const key = String(r.reason || "INCONNU").toUpperCase();
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [orangeRows]);

  const orangeRowsFiltered = useMemo(() => {
    const enriched = orangeRows.map((row) => {
      const ndList = normalizeNds(row.nds ?? row.numero_ots);
      const hasKyntus = row.facturation_kyntus_ht !== null && row.facturation_kyntus_ht !== undefined;

      const reason = (() => {
        if (row.reason) return String(row.reason).toUpperCase();
        if (!hasKyntus) return "OT_INEXISTANT";
        if (row.statut_croisement !== "OK") return "CROISEMENT_INCOMPLET";
        if (Math.abs(Number(row.diff_ht ?? 0)) >= 0.01) return "COMPARAISON_INCOHERENTE";
        if (Math.abs(Number(row.diff_ttc ?? 0)) >= 0.01) return "COMPARAISON_INCOHERENTE";
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

    let rows = enriched;

    if (orangeReasonFilter !== "ALL") {
      rows = rows.filter((r) => String(r.reason || "").toUpperCase() === orangeReasonFilter);
    }

    if (orangeCroisementFilter !== "ALL") {
      rows = rows.filter((r) => r.statut_croisement === orangeCroisementFilter);
    }

    if (orangeOtSearch.trim()) {
      const t = orangeOtSearch.trim().toLowerCase();
      rows = rows.filter((r) => String(r.num_ot || "").toLowerCase().includes(t));
    }

    if (orangeReleveSearch.trim()) {
      const t = orangeReleveSearch.trim().toLowerCase();
      rows = rows.filter((r) => String(r.releve || "").toLowerCase().includes(t));
    }

    if (orangeNdSearch.trim()) {
      const t = orangeNdSearch.trim().toLowerCase();
      rows = rows.filter((r) => (r.nds as string[]).some((nd) => nd.toLowerCase().includes(t)));
    }

    return [...rows].sort((a, b) => {
      const aBad = a.reason !== "OK";
      const bBad = b.reason !== "OK";
      if (aBad && !bBad) return -1;
      if (!aBad && bBad) return 1;
      return String(a.num_ot || "").localeCompare(String(b.num_ot || ""));
    });
  }, [
    orangeRows,
    orangeReasonFilter,
    orangeCroisementFilter,
    orangeOtSearch,
    orangeReleveSearch,
    orangeNdSearch,
  ]);

  const orangePageCount = useMemo(
    () => Math.max(1, Math.ceil(orangeRowsFiltered.length / PAGE_SIZE)),
    [orangeRowsFiltered.length]
  );

  const orangeRowsPage = useMemo(() => {
    const start = (orangePage - 1) * PAGE_SIZE;
    return orangeRowsFiltered.slice(start, start + PAGE_SIZE);
  }, [orangeRowsFiltered, orangePage]);

  const toggleCacExpand = (rowKey: string) => {
    setExpandedCacKeys((prev) => {
      const next = new Set(prev);
      next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
      return next;
    });
  };

  const exportOrangeExcel = useCallback(async () => {
    if (!orangeRowsFiltered.length) return;
    setExportingOrange(true);

    try {
      const dataToExport = orangeRowsFiltered.map((r) => {
        const ndList = normalizeNds(r.nds ?? r.numero_ots);
        const releveText = typeof r.releve === "string" && r.releve.trim() ? r.releve.trim() : "—";
        return {
          "Num OT": r.num_ot,
          "Relevé": releveText,
          "ND(s)": ndList.length ? ndList.join(", ") : "—",
          "OT Existant": (r as any).ot_existant ? "Oui" : "Non",
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
      ws["!cols"] = [15, 14, 30, 12, 18, 25, 12, 12, 12, 12, 12, 15].map((wch) => ({ wch }));
      const importInfo = orangeImports.find((i) => i.import_id === selectedOrangeImportId);
      const fileName = `comparaison_orange_${importInfo?.filename ?? "export"}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      XLSX.utils.book_append_sheet(wb, ws, "Comparaison Orange");
      XLSX.writeFile(wb, fileName);
    } catch (e: any) {
      setError(e?.message || "Erreur export Excel Orange");
    } finally {
      setExportingOrange(false);
    }
  }, [orangeRowsFiltered, selectedOrangeImportId, orangeImports]);

  const renderOrangeAmountCells = (r: any) => (
    <>
      <td className="p-3 align-middle">
        <AmountPill v={r.facturation_orange_ht} kind="orange" />
      </td>
      <td className="p-3 align-middle">
        <AmountPill v={r.facturation_kyntus_ht} kind="kyntus" />
      </td>
      <td className="p-3 align-middle">
        <AmountPill v={r.diff_ht} kind="diff" />
      </td>
      <td className="p-3 align-middle">
        <AmountPill v={r.facturation_orange_ttc} kind="orange" />
      </td>
      <td className="p-3 align-middle">
        <AmountPill v={r.facturation_kyntus_ttc} kind="kyntus" />
      </td>
      <td className="p-3 align-middle">
        <AmountPill v={r.diff_ttc} kind="diff" />
      </td>
    </>
  );

  if (!visible) return null;

  return (
    <div className="mx-2 rounded-lg border bg-white p-4 space-y-3">
      {error && (
        <div className="p-2 rounded border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Comparaison Kyntus vs Orange (Num OT)</div>
          <div className="text-xs text-gray-500">
            Comparaison PPD + facturation (HT/TTC) entre Orange et Kyntus (par import).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onImportOrange}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
          >
            <Upload className="h-4 w-4" />
            Orange PPD
          </button>

          <button
            onClick={() => onScrapeMissing(orangeRowsFiltered)}
            disabled={orangeRowsFiltered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-sky-400 text-white hover:bg-sky-500 disabled:opacity-60 text-sm font-medium"
          >
            <Sparkles className="h-4 w-4" />
            Scraper les manquants
          </button>

          <button
            onClick={exportOrangeExcel}
            disabled={exportingOrange || orangeRowsFiltered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-sm"
          >
            <Download className="h-4 w-4" />
            {exportingOrange ? "Export..." : "Exporter Orange"}
          </button>

          <button
            onClick={() => loadOrangeComparison({ preserveFilters: true })}
            disabled={loadingOrange}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingOrange ? "animate-spin" : ""}`} />
            {loadingOrange ? "Chargement..." : "Actualiser Orange"}
          </button>
        </div>
      </div>

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

        <button
          onClick={() =>
            loadOrangeComparison({
              importId: selectedOrangeImportId,
              ppd: selectedOrangePpd,
              preserveFilters: true,
            })
          }
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Lancer la comparaison
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {orangeCountByReason.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <Badge txt={reasonLabel(k)} kind={orangeReasonBadgeKind(k)} />
            <span className="text-sm text-gray-700">{v}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
        <div className="text-xs font-medium text-gray-700 mr-1">Filtres tableau :</div>

        <select
          className="border rounded px-2 py-2 text-sm min-w-[220px]"
          value={orangeReasonFilter}
          onChange={(e) => {
            setOrangeReasonFilter(e.target.value);
            setOrangePage(1);
          }}
        >
          <option value="ALL">Toutes les raisons</option>
          {uniqueOrangeReasons.map((r) => (
            <option key={r} value={r}>
              {reasonLabel(r)}
            </option>
          ))}
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
          {uniqueCroisementStatus.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
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
            className="border rounded px-3 py-2 text-sm min-w-[180px]"
          />
          {orangeOtSearch && (
            <button
              onClick={() => {
                setOrangeOtSearch("");
                setOrangePage(1);
              }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Rechercher relevé..."
            value={orangeReleveSearch}
            onChange={(e) => {
              setOrangeReleveSearch(e.target.value);
              setOrangePage(1);
            }}
            className="border rounded px-3 py-2 text-sm min-w-[180px]"
          />
          {orangeReleveSearch && (
            <button
              onClick={() => {
                setOrangeReleveSearch("");
                setOrangePage(1);
              }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Rechercher ND..."
            value={orangeNdSearch}
            onChange={(e) => {
              setOrangeNdSearch(e.target.value);
              setOrangePage(1);
            }}
            className="border rounded px-3 py-2 text-sm min-w-[180px]"
          />
          {orangeNdSearch && (
            <button
              onClick={() => {
                setOrangeNdSearch("");
                setOrangePage(1);
              }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {orangeSummary && (
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-lg border">
          {[
            {
              label: "Orange Total HT",
              val: orangeSummary.orange_total_ht,
              cls: "bg-orange-100 text-orange-900 border border-orange-300",
            },
            {
              label: "Orange Total TTC",
              val: orangeSummary.orange_total_ttc,
              cls: "bg-orange-100 text-orange-900 border border-orange-300",
            },
            {
              label: "Kyntus Total HT",
              val: orangeSummary.kyntus_total_ht,
              cls: "bg-blue-50 text-blue-800 border border-blue-300",
            },
            {
              label: "Kyntus Total TTC",
              val: orangeSummary.kyntus_total_ttc,
              cls: "bg-blue-50 text-blue-800 border border-blue-300",
            },
          ].map(({ label, val, cls }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">{label}</span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold ${cls}`}>
                {fmtNum(val)} €
              </span>
            </div>
          ))}

          {[
            { label: "Écart HT", val: orangeSummary.ecart_ht },
            { label: "Écart TTC", val: orangeSummary.ecart_ttc },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">{label}</span>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-mono font-semibold ${
                  Number(val) >= 0
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-red-100 text-red-800 border border-red-300"
                }`}
              >
                {fmtNum(val)} €
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600">
          {orangeRowsFiltered.length} ligne(s)
          {" • "}OK: {orangeRowsFiltered.filter((r) => r.reason === "OK").length}
          {" • "}À vérifier: {orangeRowsFiltered.filter((r) => r.reason !== "OK").length}
          {orangeOtSearch && <span className="ml-2">• OT: "{orangeOtSearch}"</span>}
          {orangeReleveSearch && <span className="ml-2">• Relevé: "{orangeReleveSearch}"</span>}
          {orangeNdSearch && <span className="ml-2">• ND: "{orangeNdSearch}"</span>}
          {orangeReasonFilter !== "ALL" && (
            <span className="ml-2">• Raison: "{reasonLabel(orangeReasonFilter)}"</span>
          )}
        </div>

        <Pagination
          page={orangePage}
          pageCount={orangePageCount}
          onPrev={() => setOrangePage((p) => Math.max(1, p - 1))}
          onNext={() => setOrangePage((p) => Math.min(orangePageCount, p + 1))}
          onGo={setOrangePage}
        />
      </div>

      {loadingOrange ? (
        <div className="text-center py-10 text-gray-500 text-sm">Chargement de la comparaison…</div>
      ) : orangeRowsFiltered.length > 0 ? (
        <div className="overflow-x-auto border rounded mt-2">
          <table className="w-full text-sm" style={{ minWidth: "1400px" }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left border-b">
                <th className="p-3 w-8"></th>
                <th className="p-3 font-semibold text-gray-700">OT (CAC)</th>
                <th className="p-3 font-semibold text-gray-700">Relevé</th>
                <th className="p-3 font-semibold text-gray-700">Raison</th>
                <th className="p-3 font-semibold text-gray-700">Montant brut (HT)</th>
                <th className="p-3 font-semibold text-gray-700">Vision Praxedo (HT)</th>
                <th className="p-3 font-semibold text-gray-700">Diff HT</th>
                <th className="p-3 font-semibold text-gray-700">Montant majoré (TTC)</th>
                <th className="p-3 font-semibold text-gray-700">Vision Praxedo (TTC)</th>
                <th className="p-3 font-semibold text-gray-700">Différence TTC</th>
              </tr>
            </thead>

            <tbody>
              {orangeRowsPage.map((r) => {
                const { releveText, ndList } = resolveReleveAndNds(r);
                const hasMultipleNds = ndList.length > 0;
                const rowKey = `${String(r.num_ot || "")}__${releveText}`;
                const isExpanded = expandedCacKeys.has(rowKey);
                const rowBg = orangeRowBg(r.reason);
                const badgeKind = orangeReasonBadgeKind(r.reason);

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`border-t transition-colors ${rowBg} ${hasMultipleNds ? "cursor-pointer" : ""}`}
                      onClick={() => hasMultipleNds && toggleCacExpand(rowKey)}
                    >
                      <td className="p-3 align-middle w-8">
                        {hasMultipleNds && (
                          <button
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-black/10 transition-colors"
                            title={isExpanded ? "Réduire les NDs" : `Afficher ${ndList.length} ND(s)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCacExpand(rowKey);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                        )}
                      </td>

                      <td className="p-3 align-middle">
                        <div className="font-mono font-semibold text-sm">{r.num_ot || "—"}</div>
                        {hasMultipleNds && !isExpanded && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
                              {ndList.length} ND{ndList.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-3 align-middle">
                        <div className="font-mono text-sm">{releveText}</div>
                      </td>

                      <td className="p-3 align-middle">
                        <Badge txt={reasonLabel(r.reason ?? "")} kind={badgeKind} />
                      </td>

                      {renderOrangeAmountCells(r)}
                    </tr>

                    {isExpanded &&
                      ndList.map((nd, idx) => (
                        <tr key={`${rowKey}__nd__${idx}`} className={`border-t border-dashed ${rowBg} opacity-90`}>
                          <td className="p-3 align-middle">
                            <div className="flex justify-center">
                              <div className="w-0.5 h-5 bg-gray-300 rounded mx-auto" />
                            </div>
                          </td>
                          <td className="p-3 align-middle">
                            <span className="text-gray-400 text-xs font-mono">↳</span>
                          </td>
                          <td className="p-3 align-middle">
                            <div className="font-mono text-sm text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 inline-block">
                              {nd}
                            </div>
                          </td>
                          <td className="p-3 align-middle text-gray-300">—</td>
                          <td className="p-3 align-middle text-gray-400">—</td>
                          <td className="p-3 align-middle text-xs text-blue-700 font-medium">Détail PIDI</td>
                          <td className="p-3 align-middle text-gray-400">—</td>
                          <td className="p-3 align-middle text-gray-400">—</td>
                          <td className="p-3 align-middle text-xs text-blue-700 font-medium">Détail PIDI</td>
                          <td className="p-3 align-middle text-gray-400">—</td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-gray-500 py-6 text-center">
          Aucune ligne à afficher.
        </div>
      )}
    </div>
  );
}