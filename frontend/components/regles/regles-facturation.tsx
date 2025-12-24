"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, RefreshCw, Edit2, Trash2, Tag } from "lucide-react";
import { regleApi } from "@/lib/api";

/* =========================
   Types JSON condition
========================= */
type ConditionRule =
  | { field: string; op: "="; value: string }
  | { field: string; op: "in"; value: string[] };

type ConditionJson = {
  all: ConditionRule[];
};

/* =========================
   Types DB / Form
========================= */
type DbRegleFacturation = {
  id: number;
  code: string | null;
  libelle: string | null;

  // ✅ Condition JSON (source)
  condition_json?: ConditionJson | null;

  // ⚠️ SQL uniquement debug (optionnel)
  condition_sql?: string | null;

  statut_facturation: string | null;

  code_activite?: string | null;
  code_produit?: string | null;
  plp_applicable?: boolean | null;
  categorie?: string | null;
};

type FormState = {
  code: string;
  libelle: string;
  // ⚠️ si ton backend accepte encore SQL en création/édition
  condition_sql: string;
  statut_facturation: string;

  code_activite?: string;
  code_produit?: string;
  plp_applicable?: boolean;
  categorie?: string;
};

type ActionFilter =
  | "ALL"
  | "FACTURABLE"
  | "NON_FACTURABLE"
  | "CONDITIONNEL"
  | "A_VERIFIER";

/* =========================
   Grouping
========================= */
type GroupKey =
  | "ALL"
  | "PRO"
  | "GP"
  | "FTTH"
  | "WHOLESALE"
  | "DIVERS"
  | "TRAVAUX"
  | "OTHER";

const GROUP_ORDER: GroupKey[] = [
  "ALL",
  "PRO",
  "GP",
  "FTTH",
  "WHOLESALE",
  "DIVERS",
  "TRAVAUX",
  "OTHER",
];

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/* =========================
   🎨 THEMES
========================= */
type Theme = {
  pill: string;
  ring: string;
  card: string;
  title: string;
  select: string;
  dot: string;
};

const TOTAL_THEME: Theme = {
  pill: "bg-blue-100 text-blue-900 border-blue-200",
  ring: "ring-blue-300",
  card: "border-blue-200 bg-blue-50",
  title: "text-blue-900",
  select: "focus:ring-blue-200 focus:border-blue-300",
  dot: "text-blue-500",
};

const OTHER_THEME: Theme = {
  pill: "bg-gray-100 text-gray-900 border-gray-200",
  ring: "ring-gray-300",
  card: "border-gray-200 bg-gray-50",
  title: "text-gray-900",
  select: "focus:ring-gray-200 focus:border-gray-300",
  dot: "text-gray-500",
};

const GROUP_THEMES: Record<GroupKey, Theme> = {
  ALL: {
    pill: "bg-slate-100 text-slate-900 border-slate-200",
    ring: "ring-slate-300",
    card: "border-slate-200 bg-slate-50",
    title: "text-slate-900",
    select: "focus:ring-slate-200 focus:border-slate-300",
    dot: "text-slate-600",
  },
  // PRO = orange
  PRO: {
    pill: "bg-orange-100 text-orange-900 border-orange-200",
    ring: "ring-orange-300",
    card: "border-orange-200 bg-orange-50",
    title: "text-orange-900",
    select: "focus:ring-orange-200 focus:border-orange-300",
    dot: "text-orange-500",
  },
  // GP = teal
  GP: {
    pill: "bg-teal-100 text-teal-900 border-teal-200",
    ring: "ring-teal-300",
    card: "border-teal-200 bg-teal-50",
    title: "text-teal-900",
    select: "focus:ring-teal-200 focus:border-teal-300",
    dot: "text-teal-500",
  },
  // FTTH = indigo
  FTTH: {
    pill: "bg-indigo-100 text-indigo-900 border-indigo-200",
    ring: "ring-indigo-300",
    card: "border-indigo-200 bg-indigo-50",
    title: "text-indigo-900",
    select: "focus:ring-indigo-200 focus:border-indigo-300",
    dot: "text-indigo-500",
  },
  // WHOLESALE = violet
  WHOLESALE: {
    pill: "bg-violet-100 text-violet-900 border-violet-200",
    ring: "ring-violet-300",
    card: "border-violet-200 bg-violet-50",
    title: "text-violet-900",
    select: "focus:ring-violet-200 focus:border-violet-300",
    dot: "text-violet-500",
  },
  // DIVERS = lime
  DIVERS: {
    pill: "bg-lime-100 text-lime-950 border-lime-200",
    ring: "ring-lime-300",
    card: "border-lime-200 bg-lime-50",
    title: "text-lime-950",
    select: "focus:ring-lime-200 focus:border-lime-300",
    dot: "text-lime-600",
  },
  // TRAVAUX = rose
  TRAVAUX: {
    pill: "bg-rose-100 text-rose-900 border-rose-200",
    ring: "ring-rose-300",
    card: "border-rose-200 bg-rose-50",
    title: "text-rose-900",
    select: "focus:ring-rose-200 focus:border-rose-300",
    dot: "text-rose-500",
  },
  OTHER: OTHER_THEME,
};

function groupChipClass(g: GroupKey, active: boolean) {
  const th = GROUP_THEMES[g] ?? OTHER_THEME;
  return classNames(
    "rounded-full border px-3 py-1 text-sm transition",
    th.pill,
    active ? `ring-2 ring-offset-1 ${th.ring}` : "hover:opacity-90"
  );
}

/* =========================
   UI Components
========================= */
function Pill({
  label,
  className,
  icon,
}: {
  label: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        className ?? ""
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function actionPillClass(action?: string | null) {
  const a = (action ?? "").toUpperCase();
  if (a === "FACTURABLE") return "bg-green-100 text-green-800 border-green-200";
  if (a === "NON_FACTURABLE") return "bg-red-100 text-red-800 border-red-200";
  if (a === "CONDITIONNEL") return "bg-yellow-100 text-yellow-900 border-yellow-200";
  if (a === "A_VERIFIER") return "bg-violet-100 text-violet-800 border-violet-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

type TagKind = "activity" | "product" | "plp" | "other";
function tagPillClass(kind: TagKind) {
  switch (kind) {
    case "activity":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "product":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "plp":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/* =========================
   Group/Sub parsing
========================= */
function getGroupFromCode(code?: string | null): GroupKey {
  const c = (code ?? "").trim();
  if (!c) return "OTHER";
  const parts = c.split("_");
  const head = (parts[0] ?? "").toUpperCase();

  if (head === "PRO") return "PRO";
  if (head === "GP") return "GP";
  if (head === "FTTH") return "FTTH";
  if (head === "WHOLESALE") return "WHOLESALE";
  if (head === "DIVERS") return "DIVERS";
  if (head === "TRAVAUX") return "TRAVAUX";
  return "OTHER";
}

// Sous-famille = 2e morceau (WHOLESALE_IQP => IQP, PRO_PME => PME)
function getSubFromCode(code?: string | null) {
  const c = (code ?? "").trim();
  if (!c) return "AUTRE";
  const parts = c.split("_");
  return (parts[1] ?? "AUTRE").toUpperCase();
}

function groupLabel(g: GroupKey) {
  if (g === "ALL") return "Toutes";
  if (g === "OTHER") return "Autres";
  return g;
}

function subLabel(s: string) {
  return s.replaceAll("_", " ");
}

/* =========================
   JSON helpers
========================= */
function findRule(condition: ConditionJson | null | undefined, field: string) {
  return condition?.all?.find((r) => r.field === field);
}

function getEqValue(condition: ConditionJson | null | undefined, field: string): string | null {
  const r = findRule(condition, field);
  if (!r) return null;
  if (r.op === "=") return r.value;
  return null;
}

function getInValues(condition: ConditionJson | null | undefined, field: string): string[] | null {
  const r = findRule(condition, field);
  if (!r) return null;
  if (r.op === "in") return r.value;
  return null;
}

function parseBoolLoose(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "oui") return true;
    if (s === "false" || s === "0" || s === "no" || s === "non") return false;
  }
  return null;
}

/* =========================
   Condition rendering (JSON)
========================= */
function renderCondition(
  condition?: ConditionJson | null,
  hasSql: boolean = false
): string {
  // Aucun JSON
  if (!condition || !Array.isArray(condition.all) || condition.all.length === 0) {
    return hasSql ? "Condition SQL (non encore convertie)" : "—";
  }

  const labelOf = (f: string) => {
    if (f === "code_cloture") return "Clôture";
    if (f === "code_activite") return "Activité";
    if (f === "code_produit") return "Produit";
    if (f === "plp_applicable") return "PLP";
    return f;
  };

  return condition.all
    .map((r) => {
      const label = labelOf(r.field);
      if (r.op === "in") {
        return `• ${label} : ${(r.value ?? []).join(" / ")}`;
      }
      return `• ${label} : ${r.value}`;
    })
    .join("\n");
}


/* =========================
   Tags from JSON (preferred)
========================= */
function buildTags(r: DbRegleFacturation) {
  const tags: Array<{ label: string; kind: TagKind }> = [];

  const act = r.code_activite ?? getEqValue(r.condition_json, "code_activite");
  const prod = r.code_produit ?? getEqValue(r.condition_json, "code_produit");

  // PLP: priorité DB, sinon JSON
  const plpFromDb = r.plp_applicable;
  const plpFromJson = parseBoolLoose(getEqValue(r.condition_json, "plp_applicable"));

  const plp =
    plpFromDb !== undefined && plpFromDb !== null
      ? plpFromDb
      : plpFromJson !== null
      ? plpFromJson
      : null;

  if (act) tags.push({ label: `Activité: ${act}`, kind: "activity" });
  if (prod) tags.push({ label: `Produit: ${prod}`, kind: "product" });
  if (plp !== null) tags.push({ label: `PLP: ${plp ? "Oui" : "Non"}`, kind: "plp" });

  return tags;
}

/* =========================
   Page
========================= */
export default function ReglesFacturation() {
  const [regles, setRegles] = useState<DbRegleFacturation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<GroupKey>("ALL");
  const [subFilter, setSubFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");

  // CRUD UI
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DbRegleFacturation | null>(null);
  const [form, setForm] = useState<FormState>({
    code: "",
    libelle: "",
    condition_sql: "",
    statut_facturation: "FACTURABLE",
  });

  const fetchRegles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await regleApi.getAll();
      setRegles(res.data as any);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Erreur chargement règles");
      setRegles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Groups + subs counts
  const { groups, subsForSelectedGroup } = useMemo(() => {
    const groupCount = new Map<GroupKey, number>();
    const subCount = new Map<string, number>();

    for (const r of regles) {
      const g = getGroupFromCode(r.code);
      groupCount.set(g, (groupCount.get(g) ?? 0) + 1);

      if (groupFilter !== "ALL" && g === groupFilter) {
        const s = getSubFromCode(r.code);
        subCount.set(s, (subCount.get(s) ?? 0) + 1);
      }
    }

    const groupsArr = GROUP_ORDER
      .filter((g) => g === "ALL" || (groupCount.get(g) ?? 0) > 0)
      .map((g) => ({
        key: g,
        label: groupLabel(g),
        count: g === "ALL" ? regles.length : (groupCount.get(g) ?? 0),
      }));

    const subsArr =
      groupFilter === "ALL"
        ? []
        : Array.from(subCount.entries())
            .map(([k, v]) => ({ key: k, label: subLabel(k), count: v }))
            .sort((a, b) => b.count - a.count);

    return { groups: groupsArr, subsForSelectedGroup: subsArr };
  }, [regles, groupFilter]);

  // Filtered list
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return regles.filter((r) => {
      const g = getGroupFromCode(r.code);
      if (groupFilter !== "ALL" && g !== groupFilter) return false;

      if (groupFilter !== "ALL" && subFilter !== "ALL") {
        const s = getSubFromCode(r.code);
        if (s !== subFilter) return false;
      }

      const action = (r.statut_facturation ?? "").toUpperCase();
      if (actionFilter !== "ALL" && action !== actionFilter) return false;

      if (!qq) return true;

      const hay = `${r.code ?? ""} ${r.libelle ?? ""} ${JSON.stringify(r.condition_json ?? {})} ${
        r.statut_facturation ?? ""
      }`.toLowerCase();

      return hay.includes(qq);
    });
  }, [regles, q, groupFilter, subFilter, actionFilter]);

  // Stats cards
  const stats = useMemo(() => {
    const total = regles.length;

    let selectedCount = total;
    let selectedTitle = "Toutes familles";
    let themeSelection: Theme = GROUP_THEMES.ALL;

    if (groupFilter !== "ALL") {
      themeSelection = GROUP_THEMES[groupFilter] ?? OTHER_THEME;
      selectedTitle = `Groupe ${groupLabel(groupFilter)}`;

      selectedCount = regles.filter((r) => getGroupFromCode(r.code) === groupFilter).length;

      if (subFilter !== "ALL") {
        selectedTitle = `${groupLabel(groupFilter)} • ${subLabel(subFilter)}`;
        selectedCount = regles.filter(
          (r) => getGroupFromCode(r.code) === groupFilter && getSubFromCode(r.code) === subFilter
        ).length;
      }
    }

    return {
      total,
      selectedCount,
      other: total - selectedCount,
      selectedTitle,
      themeSelection,
    };
  }, [regles, groupFilter, subFilter]);

  async function onCreate() {
    if (!form.code.trim() || !form.libelle.trim()) {
      alert("Code et libellé sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      await regleApi.create(form as any);
      setOpenCreate(false);
      setForm({ code: "", libelle: "", condition_sql: "", statut_facturation: "FACTURABLE" });
      await fetchRegles();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? "Erreur création");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate() {
    if (!editing) return;
    setSaving(true);
    try {
      await regleApi.update(String(editing.id), form as any);
      setEditing(null);
      await fetchRegles();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? "Erreur mise à jour");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(r: DbRegleFacturation) {
    if (!confirm(`Supprimer la règle ${r.code ?? r.id} ?`)) return;
    try {
      await regleApi.delete(String(r.id));
      await fetchRegles();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? "Erreur suppression");
    }
  }

  function openEdit(r: DbRegleFacturation) {
    setEditing(r);
    setForm({
      code: r.code ?? "",
      libelle: r.libelle ?? "",
      condition_sql: r.condition_sql ?? "",
      statut_facturation: (r.statut_facturation ?? "FACTURABLE").toUpperCase(),
      code_activite: r.code_activite ?? undefined,
      code_produit: r.code_produit ?? undefined,
      plp_applicable: r.plp_applicable ?? undefined,
      categorie: r.categorie ?? undefined,
    });
  }

  const currentTheme =
    groupFilter === "ALL" ? GROUP_THEMES.ALL : GROUP_THEMES[groupFilter] ?? OTHER_THEME;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Règles de facturation</h1>
          <p className="text-gray-600 mt-1">
            Référentiel des règles de classification .
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRegles}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>

          <button
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nouvelle règle
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={classNames("rounded-xl border p-4", TOTAL_THEME.card)}>
          <div className={classNames("text-sm font-medium", TOTAL_THEME.title)}>Total</div>
          <div className={classNames("mt-2 text-3xl font-bold", TOTAL_THEME.title)}>{stats.total}</div>
        </div>

        <div className={classNames("rounded-xl border p-4", stats.themeSelection.card)}>
          <div className={classNames("text-sm font-medium", stats.themeSelection.title)}>
            {stats.selectedTitle}
          </div>
          <div className={classNames("mt-2 text-3xl font-bold", stats.themeSelection.title)}>
            {stats.selectedCount}
          </div>
          <div className="mt-1 text-xs text-gray-600">Sélection actuelle</div>
        </div>

        <div className={classNames("rounded-xl border p-4", OTHER_THEME.card)}>
          <div className={classNames("text-sm font-medium", OTHER_THEME.title)}>Autres</div>
          <div className={classNames("mt-2 text-3xl font-bold", OTHER_THEME.title)}>{stats.other}</div>
          <div className="mt-1 text-xs text-gray-600">Hors sélection</div>
        </div>
      </div>

      {/* Groups + Sub-families */}
      <div className="rounded-xl border bg-white p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {groups.map((g) => {
            const isActive = groupFilter === g.key;
            return (
              <button
                key={g.key}
                onClick={() => {
                  setGroupFilter(g.key);
                  setSubFilter("ALL");
                }}
                className={groupChipClass(g.key, isActive)}
              >
                {g.label} ({g.count})
              </button>
            );
          })}
        </div>

        {groupFilter !== "ALL" && (
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className={classNames("text-sm font-semibold flex items-center gap-2", currentTheme.title)}>
              <span className={classNames("text-lg leading-none", currentTheme.dot)}>●</span>
              Sous-famille de {groupLabel(groupFilter)}
            </div>

            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className={classNames(
                "w-full md:w-[320px] rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
                currentTheme.select
              )}
            >
              <option value="ALL">Toutes</option>
              {subsForSelectedGroup.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} ({s.count})
                </option>
              ))}
            </select>

            <div className="md:ml-auto">
              <Pill label={groupLabel(groupFilter)} className={currentTheme.pill} />
            </div>
          </div>
        )}
      </div>

      {/* Search + Action filter */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (code, libellé, condition, action...)"
                className="w-full rounded-lg border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {filtered.length} règle(s) affichée(s) • Astuce : groupe + sous-famille + action + recherche.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">Toutes actions</option>
              <option value="FACTURABLE">FACTURABLE</option>
              <option value="NON_FACTURABLE">NON_FACTURABLE</option>
              <option value="CONDITIONNEL">CONDITIONNEL</option>
              <option value="A_VERIFIER">A_VERIFIER</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="p-4">Code</th>
              <th className="p-4">Description</th>
              <th className="p-4">Tags</th>
              <th className="p-4">Condition</th>
              <th className="p-4">Action</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-500">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-500">
                  Aucune règle trouvée.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const tags = buildTags(r);
                const condText = renderCondition(r.condition_json, !!r.condition_sql);

                const g = getGroupFromCode(r.code);
                const s = getSubFromCode(r.code);
                const th = GROUP_THEMES[g] ?? OTHER_THEME;

                return (
                  <tr key={r.id} className="border-t hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{r.code ?? "—"}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Pill label={groupLabel(g)} className={th.pill} />
                        <span className="text-xs text-gray-600">{subLabel(s)}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-gray-900">{r.libelle ?? "—"}</div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t, idx) => (
                          <Pill key={idx} label={t.label} className={tagPillClass(t.kind)} />
                        ))}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="max-w-[620px]">
                        <pre
                          className="whitespace-pre-wrap break-words rounded-lg border bg-slate-50 p-3 text-xs leading-5 text-slate-800"
                          title="Condition (JSON)"
                        >
                          {condText}
                        </pre>

                        {/* ⚠️ optionnel : debug SQL si tu veux */}
                        {r.condition_sql ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-500"></summary>
                            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg border bg-white p-3 text-[11px] text-gray-700">
                              {r.condition_sql}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </td>

                    <td className="p-4">
                      <Pill
                        label={(r.statut_facturation ?? "—").toUpperCase()}
                        className={actionPillClass(r.statut_facturation)}
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(r)} className="rounded-lg p-2 hover:bg-gray-100" title="Modifier">
                          <Edit2 className="h-4 w-4 text-gray-700" />
                        </button>

                        <button onClick={() => onDelete(r)} className="rounded-lg p-2 hover:bg-red-100" title="Supprimer">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Create/Edit */}
      {(openCreate || editing) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{editing ? "Modifier une règle" : "Créer une règle"}</div>
                <div className="text-xs text-gray-500">Code, libellé, condition, action</div>
              </div>
              <button
                className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setOpenCreate(false);
                  setEditing(null);
                }}
              >
                Fermer
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">Code</div>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="PRO_PME_..."
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">Action</div>
                  <select
                    value={form.statut_facturation}
                    onChange={(e) => setForm({ ...form, statut_facturation: e.target.value })}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  >
                    <option value="FACTURABLE">FACTURABLE</option>
                    <option value="NON_FACTURABLE">NON_FACTURABLE</option>
                    <option value="CONDITIONNEL">CONDITIONNEL</option>
                    <option value="A_VERIFIER">A_VERIFIER</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <div className="text-xs font-medium text-gray-700">Libellé</div>
                  <input
                    value={form.libelle}
                    onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Règle ..."
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <div className="text-xs font-medium text-gray-700">Condition SQL (si utilisé côté backend)</div>
                  <textarea
                    value={form.condition_sql}
                    onChange={(e) => setForm({ ...form, condition_sql: e.target.value })}
                    className="w-full min-h-[120px] rounded-lg border px-3 py-2 text-sm font-mono"
                    placeholder="(optionnel) ..."
                  />
                  <div className="text-xs text-gray-500">
                
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-2">
              <button
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  setOpenCreate(false);
                  setEditing(null);
                }}
                disabled={saving}
              >
                Annuler
              </button>

              <button
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={editing ? onUpdate : onCreate}
                disabled={saving}
              >
                {saving ? "En cours…" : editing ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
