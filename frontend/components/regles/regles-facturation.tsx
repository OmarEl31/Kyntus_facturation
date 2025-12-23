"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Edit2, Trash2, Tag } from "lucide-react";
import { regleApi } from "@/lib/api";

type DbRegleFacturation = {
  id: number;
  code: string | null;
  libelle: string | null;
  condition_sql: string | null;
  statut_facturation: string | null;

  code_activite?: string | null;
  code_produit?: string | null;
  plp_applicable?: boolean | null;

  categorie?: string | null;
};

type FormState = {
  code: string;
  libelle: string;
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

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function actionPillClass(action?: string | null) {
  const a = (action ?? "").toUpperCase();
  if (a === "FACTURABLE") return "bg-green-100 text-green-800 border-green-200";
  if (a === "NON_FACTURABLE") return "bg-red-100 text-red-800 border-red-200";
  if (a === "CONDITIONNEL") return "bg-yellow-100 text-yellow-900 border-yellow-200";
  if (a === "A_VERIFIER") return "bg-violet-100 text-violet-800 border-violet-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

/** -------------------------
 * 🎨 Thèmes FIXES par famille
 * -------------------------- */
type FamilyTheme = {
  pill: string;      // badges (étiquettes)
  ring: string;      // ring quand sélectionnée
  card: string;      // carte stats (fond/border)
  title: string;     // texte titre de la carte
};

const FAMILY_THEMES: Record<string, FamilyTheme> = {
  // ✅ PRO PME = ORANGE
  PRO_PME: {
    pill: "bg-orange-100 text-orange-900 border-orange-200",
    ring: "ring-orange-300",
    card: "border-orange-200 bg-orange-50",
    title: "text-orange-900",
  },

   GP_PLP: {
    pill: "bg-teal-100 text-teal-900 border-teal-200",
    ring: "ring-teal-300",
    card: "border-teal-200 bg-teal-50",
    title: "text-teal-900",
  },

  // VIOLET
  GP_IMMEUBLE: {
    pill: "bg-violet-100 text-violet-900 border-violet-200",
    ring: "ring-violet-300",
    card: "border-violet-200 bg-violet-50",
    title: "text-violet-900",
  },

  // VERT (optionnel si tu veux le fixer)
  GP_PAVILLON: {
    pill: "bg-emerald-100 text-emerald-900 border-emerald-200",
    ring: "ring-emerald-300",
    card: "border-emerald-200 bg-emerald-50",
    title: "text-emerald-900",
  },

  // ROSE (optionnel pour une future famille)
  GP_AUTRE: {
    pill: "bg-rose-100 text-rose-900 border-rose-200",
    ring: "ring-rose-300",
    card: "border-rose-200 bg-rose-50",
    title: "text-rose-900",
  },
};

const FALLBACK_THEMES: FamilyTheme[] = [
  { pill: "bg-slate-100 text-slate-800 border-slate-200", ring: "ring-slate-300", card: "border-slate-200 bg-slate-50", title: "text-slate-900" },
  { pill: "bg-indigo-100 text-indigo-800 border-indigo-200", ring: "ring-indigo-300", card: "border-indigo-200 bg-indigo-50", title: "text-indigo-900" },
  { pill: "bg-cyan-100 text-cyan-800 border-cyan-200", ring: "ring-cyan-300", card: "border-cyan-200 bg-cyan-50", title: "text-cyan-900" },
  { pill: "bg-amber-100 text-amber-900 border-amber-200", ring: "ring-amber-300", card: "border-amber-200 bg-amber-50", title: "text-amber-900" },
  { pill: "bg-rose-100 text-rose-800 border-rose-200", ring: "ring-rose-300", card: "border-rose-200 bg-rose-50", title: "text-rose-900" },
  { pill: "bg-lime-100 text-lime-800 border-lime-200", ring: "ring-lime-300", card: "border-lime-200 bg-lime-50", title: "text-lime-900" },
];

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function familyTheme(family: string): FamilyTheme {
  if (FAMILY_THEMES[family]) return FAMILY_THEMES[family];
  const idx = hashString(family) % FALLBACK_THEMES.length;
  return FALLBACK_THEMES[idx];
}

type TagKind = "activity" | "product" | "plp" | "other";

function tagPillClass(kind: TagKind) {
  // 🎨 Couleurs différentes (pas le vert de FACTURABLE)
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

function Pill({
  label,
  className,
  icon,
}: {
  label: string;
  className?: string;
  icon?: React.ReactNode;
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

function getFamilyFromCode(code?: string | null) {
  const c = (code ?? "").trim();
  if (!c) return "INCONNU";
  const parts = c.split("_");
  if (parts.length >= 2) return `${parts[0]}_${parts[1]}`;
  return "INCONNU";
}

function familyLabel(family: string) {
  if (family === "PRO_PME") return "PRO PME";
  if (family === "INCONNU") return "Inconnu";
  return family.replaceAll("_", " ");
}

function formatConditionSql(raw?: string | null) {
  if (!raw) return "—";
  let s = raw.trim();
  s = s.replace(/\s+(AND)\s+/gi, "\nAND ");
  s = s.replace(/\s+(OR)\s+/gi, "\nOR ");
  s = s.replace(/\s+IN\s+\(/gi, " IN (");
  return s;
}

function extractOne(sql: string | null | undefined, re: RegExp) {
  if (!sql) return null;
  const m = sql.match(re);
  return m?.[1] ?? null;
}

function buildTags(r: DbRegleFacturation) {
  const tags: Array<{ label: string; kind: TagKind }> = [];

  const act =
    r.code_activite ??
    extractOne(r.condition_sql, /code_activite\s*=\s*'([^']+)'/i);

  const prod =
    r.code_produit ??
    extractOne(r.condition_sql, /code_produit\s*=\s*'([^']+)'/i);

  const plpTxt =
    r.plp_applicable !== undefined && r.plp_applicable !== null
      ? String(r.plp_applicable)
      : extractOne(r.condition_sql, /plp_applicable\s*=\s*(TRUE|FALSE)/i);

  if (act) tags.push({ label: `Activité: ${act}`, kind: "activity" });
  if (prod) tags.push({ label: `Produit: ${prod}`, kind: "product" });
  if (plpTxt)
    tags.push({
      label: `PLP: ${plpTxt.toUpperCase() === "TRUE" ? "Oui" : "Non"}`,
      kind: "plp",
    });

  return tags;
}

export default function ReglesFacturation() {
  const [regles, setRegles] = useState<DbRegleFacturation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("PRO_PME");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");

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

  const families = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of regles) {
      const fam = getFamilyFromCode(r.code);
      map.set(fam, (map.get(fam) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, label: familyLabel(k), count: v }))
      .sort((a, b) => b.count - a.count);
  }, [regles]);

  // ✅ Famille affichée dans la carte du milieu
  // si "ALL", on garde PRO_PME (comme sur ton écran actuel), sinon la famille sélectionnée.
  const selectedFamilyKey = familyFilter === "ALL" ? "PRO_PME" : familyFilter;

  const stats = useMemo(() => {
    const total = regles.length;

    const selectedCount =
      selectedFamilyKey === "ALL"
        ? total
        : regles.filter((r) => getFamilyFromCode(r.code) === selectedFamilyKey).length;

    const proPme = regles.filter((r) => getFamilyFromCode(r.code) === "PRO_PME").length;
    const other = total - proPme;

    return { total, selectedCount, proPme, other };
  }, [regles, selectedFamilyKey]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return regles.filter((r) => {
      const fam = getFamilyFromCode(r.code);
      if (familyFilter !== "ALL" && fam !== familyFilter) return false;

      const action = (r.statut_facturation ?? "").toUpperCase();
      if (actionFilter !== "ALL" && action !== actionFilter) return false;

      if (!qq) return true;
      const hay = `${r.code ?? ""} ${r.libelle ?? ""} ${r.condition_sql ?? ""} ${r.statut_facturation ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [regles, q, familyFilter, actionFilter]);

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

  const selTheme = familyTheme(selectedFamilyKey);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Règles de facturation</h1>
          <p className="text-gray-600 mt-1">
            Référentiel des règles de classification (PRO PME aujourd’hui, autres familles à venir).
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
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="mt-2 text-3xl font-bold">{stats.total}</div>
        </div>

        {/* ✅ Carte famille : couleur change selon la famille sélectionnée */}
        <div className={classNames("rounded-xl border p-4", selTheme.card)}>
          <div className={classNames("text-sm font-medium", selTheme.title)}>
            {familyLabel(selectedFamilyKey)}
          </div>
          <div className={classNames("mt-2 text-3xl font-bold", selTheme.title)}>
            {stats.selectedCount}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Famille actuellement implémentée
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">Autres familles</div>
          <div className="mt-2 text-3xl font-bold">{stats.other}</div>
          <div className="mt-1 text-xs text-gray-500">À compléter (à venir)</div>
        </div>
      </div>

      {/* Families pills */}
      <div className="rounded-xl border bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFamilyFilter("ALL")}
            className={classNames(
              "rounded-full border px-3 py-1 text-sm",
              familyFilter === "ALL"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white hover:bg-gray-50"
            )}
          >
            Toutes ({regles.length})
          </button>

          {families.map((f) => {
            const th = familyTheme(f.key);
            const isActive = familyFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFamilyFilter(f.key)}
                className={classNames(
                  "rounded-full border px-3 py-1 text-sm transition",
                  th.pill,
                  isActive ? `ring-2 ring-offset-1 ${th.ring}` : "hover:opacity-90"
                )}
              >
                {f.label} ({f.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
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
              {filtered.length} règle(s) affichée(s) • Astuce : filtre par famille + action + recherche.
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
                const cond = formatConditionSql(r.condition_sql);

                const fam = getFamilyFromCode(r.code);
                const famLbl = familyLabel(fam);
                const famTheme = familyTheme(fam);

                return (
                  <tr key={r.id} className="border-t hover:bg-gray-50/50">
                    {/* Code */}
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{r.code ?? "—"}</div>

                      {/* ✅ même couleur que la “grande étiquette” (famille) */}
                      <div className="mt-1">
                        <Pill label={famLbl} className={famTheme.pill} />
                      </div>
                    </td>

                    {/* Description */}
                    <td className="p-4">
                      <div className="text-gray-900">{r.libelle ?? "—"}</div>
                    </td>

                    {/* Tags */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t, idx) => (
                          <Pill key={idx} label={t.label} className={tagPillClass(t.kind)} />
                        ))}
                      </div>
                    </td>

                    {/* Condition */}
                    <td className="p-4">
                      <div className="max-w-[620px]">
                        <pre
                          className="whitespace-pre-wrap break-words rounded-lg border bg-slate-50 p-3 text-xs leading-5 text-slate-800 font-mono"
                          title={r.condition_sql ?? ""}
                        >
                          {cond}
                        </pre>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-4">
                      <Pill
                        label={(r.statut_facturation ?? "—").toUpperCase()}
                        className={actionPillClass(r.statut_facturation)}
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-lg p-2 hover:bg-gray-100"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4 text-gray-700" />
                        </button>

                        <button
                          onClick={() => onDelete(r)}
                          className="rounded-lg p-2 hover:bg-red-100"
                          title="Supprimer"
                        >
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
                <div className="text-lg font-semibold">
                  {editing ? "Modifier une règle" : "Créer une règle"}
                </div>
                <div className="text-xs text-gray-500">
                  Code, libellé, condition SQL, action (statut_facturation)
                </div>
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
                    className="w-full rounded-lg border px-3 py-2 text-sm"
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
                  <div className="text-xs font-medium text-gray-700">Condition SQL</div>
                  <textarea
                    value={form.condition_sql}
                    onChange={(e) => setForm({ ...form, condition_sql: e.target.value })}
                    className="w-full min-h-[120px] rounded-lg border px-3 py-2 text-sm font-mono"
                    placeholder="code_cloture IN (...) AND code_activite = 'LMC' ..."
                  />
                  <div className="text-xs text-gray-500">
                    Conseil : garde des champs cohérents avec ta vue (code_cloture, code_activite, code_produit, plp_applicable…)
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
