// frontend/components/dossiers/dossiers-list.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Upload, Download, X, ChevronRight, Info, Layers } from "lucide-react";

import { listDossiers, statutsFinal } from "@/services/dossiersApi";
import type { DossierFacturable } from "@/types/dossier";
import type { DossiersFilters } from "@/services/dossiersApi";

import FiltersBar from "./filters-bar";
import FileUploadModal from "./file-upload-modal";

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
  | "lime";

// ✅ Bouton Détails : clair + élégant + pas déjà utilisé (STONE)
// ✅ Avec ! pour écraser un éventuel style global noir
const DETAILS_BTN_CLASS =
  "inline-flex items-center justify-center rounded-md " +
  "!border !border-stone-200 !bg-stone-50 " +
  "px-2.5 py-1 text-[11px] font-semibold " +
  "!text-stone-800 whitespace-nowrap " +
  "shadow-sm transition-colors " +
  "hover:!bg-stone-100 hover:!border-stone-300 " +
  "focus:outline-none focus:ring-2 focus:ring-stone-200 focus:ring-offset-1";

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

function formatFrDate(v?: string | null) {
  if (!v) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) return v;

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  if (m.includes("IMM")) return "indigo";     // IMMEUBLE
  if (m.includes("SOUT")) return "cyan";      // SOUTERRAIN
  if (m.includes("AER")) return "fuchsia";    // AERIEN
  return "slate";
}

function articleVsKind(s?: string | null): BadgeKind {
  if (s === "OK") return "green";
  if (s === "A_VERIFIER") return "orange";
  if (s === "INCONNU") return "gray";
  return "gray";
}

function parseCsvList(v?: string | null): string[] {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function computeArticleVerdict(proposed: string[], expected: string[]) {
  if (expected.length === 0) return "INCONNU";
  const ok = proposed.every((p) => expected.some((e) => p === e || p.startsWith(e)));
  return ok ? "OK" : "A_VERIFIER";
}

function Chip({ txt }: { txt: string }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2 py-1 text-xs font-medium text-gray-700">
      {txt}
    </span>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {right}
    </div>
  );
}

function KeyValue({ k, v }: { k: string; v: React.ReactNode }) {
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
    if (!hasPidi) {
      key = "— (sans PIDI)";
    } else {
      const raw = (d.numero_ppd ?? "").trim();
      key = raw.length ? raw : "SANS_PPD";
    }

    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(d);
  }

  const entries = Array.from(m.entries()).sort((a, b) => {
    const aSansPidi = a[0].startsWith("— (sans PIDI)");
    const bSansPidi = b[0].startsWith("— (sans PIDI)");
    if (aSansPidi && !bSansPidi) return 1;
    if (!aSansPidi && bSansPidi) return -1;

    const aSansPpd = a[0] === "SANS_PPD";
    const bSansPpd = b[0] === "SANS_PPD";
    if (aSansPpd && !bSansPpd) return 1;
    if (!aSansPpd && bSansPpd) return -1;

    return a[0].localeCompare(b[0]);
  });

  return entries;
}

export default function DossiersList() {
  const [items, setItems] = useState<DossierFacturable[]>([]);
  const [filters, setFilters] = useState<DossiersFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importType, setImportType] = useState<"PRAXEDO" | "PIDI" | null>(null);
  const [exporting, setExporting] = useState(false);

  const [grouped, setGrouped] = useState(false);

  const [articlesOpen, setArticlesOpen] = useState(false);
  const [articlesTarget, setArticlesTarget] = useState<DossierFacturable | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DossierFacturable | null>(null);
  const [showRawTerrain, setShowRawTerrain] = useState(false);

  const [rawItems, setRawItems] = useState<DossierFacturable[]>([]);

  const load = useCallback(
    async (f?: DossiersFilters) => {
      const activeFilters = f ?? filters;
      setLoading(true);
      setError(null);

      try {
        const data = await listDossiers(activeFilters);
        setRawItems(data);

        const ppdNeedle = (activeFilters.ppd ?? "").trim();
        const filtered =
          ppdNeedle.length > 0
            ? data.filter((d) => (d.numero_ppd ?? "").trim().toLowerCase().includes(ppdNeedle.toLowerCase()))
            : data;

        setItems(filtered);
        if (f) setFilters(f);
      } catch (e: any) {
        setRawItems([]);
        setItems([]);
        setError(e?.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (articlesOpen) {
          setArticlesOpen(false);
          setArticlesTarget(null);
        } else if (drawerOpen) {
          setDrawerOpen(false);
          setSelected(null);
          setShowRawTerrain(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [articlesOpen, drawerOpen]);

  const ppdOptions = useMemo(() => {
    const xs = rawItems
      .map((d) => (d.numero_ppd ?? "").trim())
      .filter((x) => x.length > 0);
    return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
  }, [rawItems]);

  const countByCroisement = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = it.statut_croisement ?? "INCONNU";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  // ✅ PPD: compter seulement les dossiers PIDI
  const countByPpd = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      if (!it.statut_pidi) continue;
      const k = (it.numero_ppd ?? "").trim() || "SANS_PPD";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const hasAnyPidi = useMemo(() => rawItems.some((d) => !!d.statut_pidi), [rawItems]);

  const countByArticles = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = it.statut_article_vs_regle ?? "INCONNU";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  function exportCSV() {
    setExporting(true);
    try {
      const headers = [
        "ot_key",
        "nd_global",
        "numero_ppd",
        "attachement_valide",
        "activite_code",
        "produit_code",
        "code_cible",
        "code_cloture_code",
        "regle_code",
        "libelle_regle",
        "statut_final",
        "statut_croisement",
        "statut_praxedo",
        "statut_pidi",
        "mode_passage",
        "type_site_terrain",
        "type_pbo_terrain",
        "article_facturation_propose",
        "statut_article_vs_regle",
        "date_planifiee",
      ];

      const rows = items.map((d) =>
        headers
          .map((h) => {
            const v = (d as any)[h];
            const s = v === null || v === undefined ? "" : Array.isArray(v) ? JSON.stringify(v) : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dossiers_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  function openArticles(d: DossierFacturable) {
    setArticlesTarget(d);
    setArticlesOpen(true);
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

  const selectedCompare = useMemo(() => {
    if (!selected) return null;
    const proposed = uniq(parseCsvList(selected.article_facturation_propose));
    const expected = uniq((selected.regle_articles_attendus ?? []).map((x) => String(x).trim()).filter(Boolean));
    const verdict = computeArticleVerdict(proposed, expected);
    return { proposed, expected, verdict };
  }, [selected]);

  const modalCompare = useMemo(() => {
    if (!articlesTarget) return null;
    const proposed = uniq(parseCsvList(articlesTarget.article_facturation_propose));
    const expected = uniq((articlesTarget.regle_articles_attendus ?? []).map((x) => String(x).trim()).filter(Boolean));
    const verdict = computeArticleVerdict(proposed, expected);
    return { proposed, expected, verdict };
  }, [articlesTarget]);

  const groupedEntries = useMemo(() => groupByPpd(items), [items]);

  return (
    <div className="space-y-4">
      <FiltersBar onSearch={(f) => load(f)} loading={loading} statuts={statutsFinal} ppds={ppdOptions} />

      {error && <div className="mx-2 p-2 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-600">{loading ? "Chargement…" : `${items.length} dossiers`}</div>

        <div className="flex items-center gap-2">
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
            onClick={() => setImportType("PIDI")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            PIDI
          </button>

          <button
            onClick={exportCSV}
            disabled={exporting || items.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      <div className="px-2 space-y-3">
        <div>
          <div className="text-sm text-gray-700 mb-2">Répartition (croisement) :</div>
          <div className="flex flex-wrap gap-2">
            {countByCroisement.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <Badge txt={k.replace("_", " ")} kind={croisementKind(k)} />
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

        <div>
          <div className="text-sm text-gray-700 mb-2">Répartition (articles vs règle) :</div>
          <div className="flex flex-wrap gap-2">
            {countByArticles.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <Badge txt={k.replaceAll("_", " ")} kind={articleVsKind(k)} />
                <span className="text-sm text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-white mx-2">
        <table className="min-w-[1900px] w-full text-sm">
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
              <th className="p-3">Articles</th>
              <th className="p-3">Planifiée</th>
              <th className="p-3"></th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={17} className="p-6 text-center text-gray-500">
                  {loading ? "Chargement…" : "Aucun dossier à afficher."}
                </td>
              </tr>
            ) : !grouped ? (
              items.map((d) => {
                const sf = d.statut_final ?? "NON_FACTURABLE";
                const cro = d.statut_croisement ?? "INCONNU";
                const terrainLabel = d.mode_passage ? d.mode_passage : "—";
                const artVs = d.statut_article_vs_regle ?? "INCONNU";

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
                      <Badge txt={sf.replaceAll("_", " ")} kind={statutFinalKind(sf)} />
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
                      <div className="flex items-center gap-2 min-w-[210px]">
                        <Badge txt={artVs.replaceAll("_", " ")} kind={articleVsKind(artVs)} />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(d);
                          }}
                          className={`${DETAILS_BTN_CLASS} ml-auto`}
                          title="Ouvrir les détails du dossier"
                        >
                          Détails
                        </button>
                      </div>
                    </td>

                    <td className="p-3">{formatFrDate(d.date_planifiee)}</td>

                    <td className="p-3">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </td>
                  </tr>
                );
              })
            ) : (
              groupedEntries.map(([ppd, rows]) => {
                const nb = rows.length;
                const ok = rows.filter((r) => r.statut_final === "FACTURABLE").length;
                const av = rows.filter((r) => r.statut_final === "A_VERIFIER").length;

                return (
                  <tr key={ppd} className="border-t">
                    <td colSpan={17} className="p-0">
                      <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900">
                            PPD: <span className="font-mono">{ppd}</span>
                          </span>
                          <span className="text-xs text-gray-600">{nb} dossiers</span>
                          <span className="text-xs text-green-700">FACTURABLE: {ok}</span>
                          <span className="text-xs text-orange-700">A_VERIFIER: {av}</span>
                        </div>
                      </div>

                      <div className="overflow-auto">
                        <table className="min-w-[1900px] w-full text-sm">
                          <tbody>
                            {rows.map((d) => {
                              const sf = d.statut_final ?? "NON_FACTURABLE";
                              const cro = d.statut_croisement ?? "INCONNU";
                              const terrainLabel = d.mode_passage ? d.mode_passage : "—";
                              const artVs = d.statut_article_vs_regle ?? "INCONNU";

                              return (
                                <tr
                                  key={d.key_match}
                                  className="border-b hover:bg-gray-50/50 cursor-pointer"
                                  onClick={() => openDrawer(d)}
                                  title="Clique pour ouvrir les détails"
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
                                      <Badge txt={d.code_cloture_code} kind={clotureKind(d.code_cloture_code)} />
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
                                    <div className="max-w-[520px] truncate" title={d.libelle_regle ?? ""}>
                                      {d.libelle_regle ?? "—"}
                                    </div>
                                  </td>

                                  <td className="p-3 w-[140px]">
                                    <Badge txt={sf.replaceAll("_", " ")} kind={statutFinalKind(sf)} />
                                  </td>

                                  <td className="p-3 w-[140px]">
                                    <Badge txt={cro.replaceAll("_", " ")} kind={croisementKind(cro)} />
                                  </td>

                                  <td className="p-3 w-[140px]">
                                    {d.statut_praxedo ? (
                                      <Badge
                                        txt={praxedoLabel(d)}
                                        kind={d.statut_praxedo.toLowerCase().includes("valid") ? "green" : "gray"}
                                      />
                                    ) : (
                                      "—"
                                    )}
                                  </td>

                                  <td className="p-3 w-[160px]">
                                    <span className="text-purple-700 font-medium">{pidiLabel(d)}</span>
                                  </td>

                                  <td className="p-3">
                                    <div className="flex items-center gap-2 min-w-[210px]">
                                      <Badge txt={artVs.replaceAll("_", " ")} kind={articleVsKind(artVs)} />

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDrawer(d);
                                        }}
                                        className={`${DETAILS_BTN_CLASS} ml-auto`}
                                        title="Ouvrir les détails du dossier"
                                      >
                                        Détails
                                      </button>
                                    </div>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer Détails */}
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
                  <Badge txt={(selected.statut_final ?? "—").replaceAll("_", " ")} kind={statutFinalKind(selected.statut_final)} />
                  <Badge txt={(selected.statut_croisement ?? "INCONNU").replaceAll("_", " ")} kind={croisementKind(selected.statut_croisement)} />
                  <Badge txt={(selected.statut_article_vs_regle ?? "INCONNU").replaceAll("_", " ")} kind={articleVsKind(selected.statut_article_vs_regle)} />
                </div>
              </div>

              <button onClick={closeDrawer} className="text-gray-500 hover:text-gray-800" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-5">
              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle title="Résumé" right={<Info className="h-4 w-4 text-gray-400" />} />
                <div className="space-y-2">
                  <KeyValue
                    k="Activité / Produit"
                    v={<span className="font-medium">{selected.activite_code ?? "—"} / {selected.produit_code ?? "—"}</span>}
                  />
                  <KeyValue k="Code cible" v={selected.code_cible ?? "—"} />
                  <KeyValue k="PPD" v={<span className="font-mono">{selected.numero_ppd ?? "—"}</span>} />
                  <KeyValue k="Attachement validé" v={selected.attachement_valide ?? "—"} />
                  <KeyValue
                    k="Clôture"
                    v={selected.code_cloture_code ? <Badge txt={selected.code_cloture_code} kind={clotureKind(selected.code_cloture_code)} /> : "—"}
                  />
                  <KeyValue k="Planifiée" v={formatFrDate(selected.date_planifiee)} />
                  <KeyValue k="Technicien" v={selected.technicien ?? "—"} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle
                  title="Terrain (PBO / passage)"
                  right={
                    <button className="text-xs text-blue-700 hover:underline" onClick={() => setShowRawTerrain((x) => !x)}>
                      {showRawTerrain ? "Masquer texte source" : "Voir texte source"}
                    </button>
                  }
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="text-xs text-gray-500 mb-1">Mode passage</div>
                    <div className="text-sm font-medium">
                      {selected.mode_passage ? (
                        <Badge txt={selected.mode_passage} kind={terrainKind(selected.mode_passage)} />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="text-xs text-gray-500 mb-1">Type site</div>
                    <div className="text-sm font-medium">{selected.type_site_terrain ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3 col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Type PBO</div>
                    <div className="text-sm font-medium">{selected.type_pbo_terrain ?? "—"}</div>
                  </div>
                </div>

                {showRawTerrain && (
                  <div className="space-y-2">
                    <div className="rounded border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500 mb-1">desc_site (source)</div>
                      <pre className="whitespace-pre-wrap break-words text-xs text-gray-800">{selected.desc_site ?? "—"}</pre>
                    </div>
                    <div className="rounded border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500 mb-1">description (source)</div>
                      <pre className="whitespace-pre-wrap break-words text-xs text-gray-800">{selected.description ?? "—"}</pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle title="Règle appliquée" />
                <div className="space-y-2">
                  <KeyValue k="Code règle" v={<span className="font-mono">{selected.regle_code ?? "—"}</span>} />
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

                <div className="pt-2">
                  <div className="text-xs text-gray-500 mb-2">Articles attendus (règle)</div>
                  {selected.regle_articles_attendus?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {selected.regle_articles_attendus.map((a) => (
                        <Chip key={a} txt={a} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">— (règle sans attendus)</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4 space-y-3">
                <SectionTitle
                  title="Articles (comparaison)"
                  right={
                    <button className="text-xs text-blue-700 hover:underline" onClick={() => openArticles(selected)}>
                      Ouvrir en grand
                    </button>
                  }
                />

                {selectedCompare && (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge txt={selectedCompare.verdict} kind={articleVsKind(selectedCompare.verdict)} />
                      <div className="text-sm text-gray-700">
                        {selectedCompare.verdict === "OK" && "Les articles proposés matchent la règle."}
                        {selectedCompare.verdict === "A_VERIFIER" && "Au moins un article proposé ne match pas les attendus."}
                        {selectedCompare.verdict === "INCONNU" && "Pas d’articles attendus sur la règle."}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-gray-50 p-3">
                        <div className="text-xs text-gray-500 mb-2">Proposé</div>
                        {selectedCompare.proposed.length ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedCompare.proposed.map((p) => (
                              <Chip key={p} txt={p} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">—</div>
                        )}
                      </div>

                      <div className="rounded-lg border bg-gray-50 p-3">
                        <div className="text-xs text-gray-500 mb-2">Attendus</div>
                        {selectedCompare.expected.length ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedCompare.expected.map((e) => (
                              <Chip key={e} txt={e} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">—</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded border bg-gray-50 p-3">
                      <div className="text-xs text-gray-500 mb-2">Liste articles PIDI (brut)</div>
                      <pre className="whitespace-pre-wrap break-words text-xs text-gray-800">{selected.liste_articles ?? "—"}</pre>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t p-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">Clique une ligne pour changer • ESC pour fermer</div>
              <button onClick={closeDrawer} className="border rounded px-3 py-2 hover:bg-gray-50">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {articlesOpen && articlesTarget && modalCompare && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Comparer les articles</h2>
                <div className="text-xs text-gray-500">
                  OT: <span className="font-mono">{articlesTarget.ot_key ?? "—"}</span> • ND:{" "}
                  <span className="font-mono">{articlesTarget.nd_global ?? "—"}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setArticlesOpen(false);
                  setArticlesTarget(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Badge txt={modalCompare.verdict} kind={articleVsKind(modalCompare.verdict)} />
              <div className="text-sm text-gray-700">
                {modalCompare.verdict === "OK" && "Match OK."}
                {modalCompare.verdict === "A_VERIFIER" && "Mismatch / à contrôler."}
                {modalCompare.verdict === "INCONNU" && "Règle sans attendus."}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-xs text-gray-500 mb-2">Articles proposés</div>
                {modalCompare.proposed.length ? (
                  <div className="flex flex-wrap gap-1">
                    {modalCompare.proposed.map((p) => (
                      <Chip key={p} txt={p} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">—</div>
                )}
              </div>

              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-xs text-gray-500 mb-2">Articles attendus (règle)</div>
                {modalCompare.expected.length ? (
                  <div className="flex flex-wrap gap-1">
                    {modalCompare.expected.map((e) => (
                      <Chip key={e} txt={e} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">—</div>
                )}
              </div>
            </div>

            <div className="rounded border bg-gray-50 p-3 text-sm">
              <div className="text-xs text-gray-500 mb-2">Liste des articles (PIDI brut)</div>
              <pre className="whitespace-pre-wrap break-words text-gray-800">{articlesTarget.liste_articles ?? "—"}</pre>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setArticlesOpen(false);
                  setArticlesTarget(null);
                }}
                className="border rounded px-3 py-2 hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {importType && (
        <FileUploadModal
          type={importType}
          onImported={() => {
            setImportType(null);
            load(filters);
          }}
          onClose={() => setImportType(null)}
        />
      )}
    </div>
  );
}
