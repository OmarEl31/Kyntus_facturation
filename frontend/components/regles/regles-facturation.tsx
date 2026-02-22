"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, RefreshCw, Edit2, Trash2, Tag, RotateCcw, Layers } from "lucide-react";
import { reglesApi } from "@/services/reglesApi";

/* =========================
   Types (UI interne)
========================= */
type DbRegleFacturation = {
  id: number;
  code: string | null;
  libelle: string | null;
  condition_sql?: string | null;
  condition_json?: any | null;

  statut_facturation: string | null;

  code_activite?: string | null;
  code_produit?: string | null;
  plp_applicable?: boolean | null;
  categorie?: string | null;

  is_active?: boolean;
  deleted_at?: string | null;
};

type FormState = {
  code: string;
  libelle: string;
  condition_sql: string;
  statut_facturation: string;

  code_activite: string;
  code_produit: string;
  plp_applicable: boolean | null;
  categorie: string;
};

type ActionFilter = "ALL" | "FACTURABLE" | "NON_FACTURABLE" | "CONDITIONNEL" | "A_VERIFIER";
type ViewMode = "LIST" | "GROUPED";

/* =========================
   Helpers UI
========================= */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Pill({
  label,
  className,
  icon,
  title,
}: {
  label: string;
  className?: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
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

function familleParts(r: DbRegleFacturation) {
  const a = (r.code_activite ?? "").trim();
  const p = (r.code_produit ?? "").trim();
  return {
    a: a || "—",
    p: p || "—",
  };
}

function familleKey(r: DbRegleFacturation) {
  const { a, p } = familleParts(r);
  return `${a} / ${p}`;
}

function normalizeUpper(x?: string | null) {
  return (x ?? "").trim().toUpperCase();
}

function isTrivialSql(sql?: string | null) {
  const s = normalizeUpper(sql);
  return !s || s === "TRUE" || s === "1=1";
}

function formatCondition(r: DbRegleFacturation) {
  // priorité: JSON si présent
  if (r.condition_json != null) {
    try {
      const s = typeof r.condition_json === "string" ? r.condition_json : JSON.stringify(r.condition_json, null, 2);
      return { label: "Condition (JSON)", content: s };
    } catch {
      return { label: "Condition (JSON)", content: String(r.condition_json) };
    }
  }

  // sinon SQL
  if (isTrivialSql(r.condition_sql)) {
    return { label: "Condition", content: "— (Toujours vrai)" };
  }
  return { label: "Condition (SQL)", content: r.condition_sql ?? "—" };
}

function plpLabel(v: boolean | null | undefined) {
  if (v == null) return "—";
  return v ? "Oui" : "Non";
}

/* =========================
   Page
========================= */
export default function ReglesFacturationPage() {
  const [regles, setRegles] = useState<DbRegleFacturation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [famille, setFamille] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [includeInactive, setIncludeInactive] = useState(false);

  // UX
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");

  // CRUD UI
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DbRegleFacturation | null>(null);

  const [form, setForm] = useState<FormState>({
    code: "",
    libelle: "",
    condition_sql: "",
    statut_facturation: "FACTURABLE",

    code_activite: "",
    code_produit: "",
    plp_applicable: null,
    categorie: "",
  });

  const fetchRegles = async () => {
    setLoading(true);
    setError(null);
    try {
      const ui = await reglesApi.list({ includeInactive });
      const mapped: DbRegleFacturation[] = ui.map((x: any) => ({
        id: Number(x.id),
        code: x.nom ?? null,
        libelle: x.description ?? null,
        condition_sql: x.condition ?? null,
        condition_json: x.condition_json ?? null,
        statut_facturation: x.action ?? null,
        code_activite: x.code_activite ?? null,
        code_produit: x.code_produit ?? null,
        plp_applicable: x.plp_applicable ?? null,
        categorie: x.categorie ?? null,
        is_active: x.actif !== false,
        deleted_at: x.deleted_at ?? null,
      }));
      setRegles(mapped);
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
  }, [includeInactive]);

  const familles = useMemo(() => {
    const m = new Map<string, { count: number; active: number; inactive: number }>();
    for (const r of regles) {
      const k = familleKey(r);
      const cur = m.get(k) ?? { count: 0, active: 0, inactive: 0 };
      cur.count += 1;
      if (r.is_active === false) cur.inactive += 1;
      else cur.active += 1;
      m.set(k, cur);
    }
    return Array.from(m.entries())
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [regles]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return regles.filter((r) => {
      if (famille !== "ALL" && familleKey(r) !== famille) return false;

      const action = normalizeUpper(r.statut_facturation);
      if (actionFilter !== "ALL" && action !== actionFilter) return false;

      if (!qq) return true;

      const hay = `${r.code ?? ""} ${r.libelle ?? ""} ${r.code_activite ?? ""} ${r.code_produit ?? ""} ${
        r.statut_facturation ?? ""
      } ${r.condition_sql ?? ""} ${r.categorie ?? ""}`.toLowerCase();

      return hay.includes(qq);
    });
  }, [regles, q, famille, actionFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, DbRegleFacturation[]>();
    for (const r of filtered) {
      const k = familleKey(r);
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }

    const out = Array.from(m.entries())
      .map(([k, items]) => {
        const active = items.filter((x) => x.is_active !== false).length;
        const inactive = items.length - active;
        return { famille: k, items, active, inactive, total: items.length };
      })
      .sort((a, b) => b.total - a.total);

    // tri interne des items : actives d'abord, puis code
    for (const g of out) {
      g.items.sort((x, y) => {
        const ax = x.is_active === false ? 1 : 0;
        const ay = y.is_active === false ? 1 : 0;
        if (ax !== ay) return ax - ay;
        return String(x.code ?? "").localeCompare(String(y.code ?? ""));
      });
    }
    return out;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = regles.length;
    const active = regles.filter((r) => r.is_active !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [regles]);

  function resetForm() {
    setForm({
      code: "",
      libelle: "",
      condition_sql: "",
      statut_facturation: "FACTURABLE",
      code_activite: "",
      code_produit: "",
      plp_applicable: null,
      categorie: "",
    });
  }

  async function onCreate() {
    if (!form.code_activite.trim() || !form.code_produit.trim()) {
      alert("Famille obligatoire : code_activite et code_produit.");
      return;
    }
    if (!form.code.trim()) {
      alert("Code obligatoire.");
      return;
    }
    if (!form.libelle.trim()) {
      alert("Libellé obligatoire.");
      return;
    }

    setSaving(true);
    try {
      await reglesApi.create({
        nom: form.code.trim(),
        description: form.libelle.trim(),
        condition: form.condition_sql?.trim() || "", // tu peux laisser vide => TRUE implicite côté métier
        action: form.statut_facturation,

        code_activite: form.code_activite.trim(),
        code_produit: form.code_produit.trim(),
        plp_applicable: form.plp_applicable,
        categorie: form.categorie?.trim() || "",
      } as any);

      setOpenCreate(false);
      resetForm();
      await fetchRegles();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? "Erreur création");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate() {
    if (!editing) return;

    if (!form.code_activite.trim() || !form.code_produit.trim()) {
      alert("Famille obligatoire : code_activite et code_produit.");
      return;
    }
    if (!form.code.trim()) {
      alert("Code obligatoire.");
      return;
    }
    if (!form.libelle.trim()) {
      alert("Libellé obligatoire.");
      return;
    }

    setSaving(true);
    try {
      await reglesApi.update(String(editing.id), {
        nom: form.code.trim(),
        description: form.libelle.trim(),
        condition: form.condition_sql?.trim() || "",
        action: form.statut_facturation,

        code_activite: form.code_activite.trim(),
        code_produit: form.code_produit.trim(),
        plp_applicable: form.plp_applicable,
        categorie: form.categorie?.trim() || "",
      } as any);

      setEditing(null);
      resetForm();
      await fetchRegles();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? "Erreur mise à jour");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(r: DbRegleFacturation) {
    if (!confirm(`Désactiver la règle ${r.code ?? r.id} ? (elle ne sera plus appliquée)`)) return;
    try {
      await reglesApi.remove(String(r.id));
      await fetchRegles();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? "Erreur désactivation");
    }
  }

  async function onRestore(r: DbRegleFacturation) {
    try {
      await reglesApi.restore(String(r.id));
      await fetchRegles();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? e?.message ?? "Erreur restauration");
    }
  }

  function openEdit(r: DbRegleFacturation) {
    setEditing(r);
    setOpenCreate(false);
    setForm({
      code: r.code ?? "",
      libelle: r.libelle ?? "",
      condition_sql: isTrivialSql(r.condition_sql) ? "" : (r.condition_sql ?? ""),
      statut_facturation: normalizeUpper(r.statut_facturation) || "FACTURABLE",

      code_activite: r.code_activite ?? "",
      code_produit: r.code_produit ?? "",
      plp_applicable: r.plp_applicable ?? null,
      categorie: r.categorie ?? "",
    });
  }

  function openCreateModal() {
    setEditing(null);
    resetForm();
    setOpenCreate(true);
  }

  const helpText = (
    <div className="text-xs text-gray-500 leading-5">
      <div className="font-medium text-gray-600">Aide rapide</div>
      <ul className="list-disc pl-4 mt-1 space-y-1">
        <li>
          <b>Famille</b> = <code>code_activite</code> + <code>code_produit</code>. Une règle s’applique si l’intervention a
          ces mêmes codes.
        </li>
        <li>
          <b>Condition = “Toujours vrai”</b> signifie que la règle ne filtre pas plus (équivalent à <code>TRUE</code>).
        </li>
        <li>
          <b>PLP applicable</b> est un paramètre de la règle (ce n’est pas le “force PLP” détecté dans le commentaire).
        </li>
        <li>
          <b>Désactiver</b> = soft delete : la règle reste en base mais n’est plus utilisée par la view.
        </li>
      </ul>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Règles de facturation</h1>
          <p className="text-gray-600 mt-1">Référentiel des règles (famille = code_activite + code_produit).</p>
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
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nouvelle règle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 border-blue-200 bg-blue-50">
          <div className="text-sm font-medium text-blue-900">Total</div>
          <div className="mt-2 text-3xl font-bold text-blue-900">{stats.total}</div>
          <div className="mt-1 text-xs text-blue-800">
            (Si DB a plus : vérifie le <code>limit</code> backend + l’appel front)
          </div>
        </div>
        <div className="rounded-xl border p-4 border-green-200 bg-green-50">
          <div className="text-sm font-medium text-green-900">Actives</div>
          <div className="mt-2 text-3xl font-bold text-green-900">{stats.active}</div>
        </div>
        <div className="rounded-xl border p-4 border-gray-200 bg-gray-50">
          <div className="text-sm font-medium text-gray-900">Désactivées</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.inactive}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (code, libellé, famille, action, condition...)"
                className="w-full rounded-lg border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {filtered.length} règle(s) affichée(s) sur {stats.total}.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={famille}
              onChange={(e) => setFamille(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">Toutes familles</option>
              {familles.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.key} ({f.count} / {f.active} actives)
                </option>
              ))}
            </select>

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

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Inclure désactivées
            </label>

            <button
              onClick={() => setViewMode(viewMode === "LIST" ? "GROUPED" : "LIST")}
              className="inline-flex items-center gap-2 rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              title="Basculer en affichage groupé par famille"
            >
              <Layers className="h-4 w-4" />
              {viewMode === "LIST" ? "Vue groupée" : "Vue liste"}
            </button>
          </div>
        </div>

        {helpText}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Content */}
      {viewMode === "GROUPED" ? (
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-500">Chargement…</div>
          ) : grouped.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-500">Aucune règle trouvée.</div>
          ) : (
            grouped.map((g) => (
              <div key={g.famille} className="rounded-xl border bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 border-b">
                  <div className="flex items-center gap-2">
                    <Pill label={g.famille} className="bg-slate-100 text-slate-900 border-slate-200" />
                    <span className="text-xs text-gray-600">
                      {g.total} règle(s) · {g.active} actives · {g.inactive} désactivées
                    </span>
                  </div>
                  <button
                    className="text-sm text-blue-700 hover:underline"
                    onClick={() => setFamille(g.famille)}
                    title="Filtrer uniquement cette famille"
                  >
                    Filtrer
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full text-sm">
                    <thead className="bg-white">
                      <tr className="text-left text-xs font-semibold text-gray-600">
                        <th className="p-4">Code</th>
                        <th className="p-4">Description</th>
                        <th className="p-4">PLP</th>
                        <th className="p-4">Condition</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">État</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((r) => {
                        const cond = formatCondition(r);
                        return (
                          <tr key={r.id} className="border-t hover:bg-gray-50/50">
                            <td className="p-4">
                              <div className="font-semibold text-gray-900">{r.code ?? "—"}</div>
                              {r.categorie ? <div className="text-xs text-gray-500">{r.categorie}</div> : null}
                            </td>

                            <td className="p-4">
                              <div className="text-gray-900">{r.libelle ?? "—"}</div>
                            </td>

                            <td className="p-4">
                              <Pill
                                label={plpLabel(r.plp_applicable)}
                                className="bg-amber-100 text-amber-900 border-amber-200"
                                title="Paramètre de la règle : PLP applicable"
                              />
                            </td>

                            <td className="p-4">
                              <div className="text-xs text-gray-500 mb-1">{cond.label}</div>
                              <pre className="whitespace-pre-wrap break-words rounded-lg border bg-slate-50 p-3 text-xs leading-5 text-slate-800">
                                {cond.content}
                              </pre>
                            </td>

                            <td className="p-4">
                              <Pill
                                label={(r.statut_facturation ?? "—").toUpperCase()}
                                className={actionPillClass(r.statut_facturation)}
                              />
                            </td>

                            <td className="p-4">
                              <Pill
                                label={r.is_active === false ? "Désactivée" : "Active"}
                                className={
                                  r.is_active === false
                                    ? "bg-gray-100 text-gray-700 border-gray-200"
                                    : "bg-green-100 text-green-800 border-green-200"
                                }
                              />
                            </td>

                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openEdit(r)} className="rounded-lg p-2 hover:bg-gray-100" title="Modifier">
                                  <Edit2 className="h-4 w-4 text-gray-700" />
                                </button>

                                {r.is_active === false ? (
                                  <button onClick={() => onRestore(r)} className="rounded-lg p-2 hover:bg-blue-100" title="Restaurer">
                                    <RotateCcw className="h-4 w-4 text-blue-600" />
                                  </button>
                                ) : (
                                  <button onClick={() => onDelete(r)} className="rounded-lg p-2 hover:bg-red-100" title="Désactiver">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Table (LIST) */
        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="p-4">Code</th>
                <th className="p-4">Famille</th>
                <th className="p-4">Description</th>
                <th className="p-4">PLP</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Action</th>
                <th className="p-4">État</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500">
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500">
                    Aucune règle trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const cond = formatCondition(r);
                  return (
                    <tr key={r.id} className="border-t hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{r.code ?? "—"}</div>
                        {r.categorie ? <div className="text-xs text-gray-500">{r.categorie}</div> : null}
                      </td>

                      <td className="p-4">
                        <Pill label={familleKey(r)} className="bg-slate-100 text-slate-900 border-slate-200" />
                      </td>

                      <td className="p-4">
                        <div className="text-gray-900">{r.libelle ?? "—"}</div>
                      </td>

                      <td className="p-4">
                        <Pill
                          label={plpLabel(r.plp_applicable)}
                          className="bg-amber-100 text-amber-900 border-amber-200"
                          title="Paramètre de la règle : PLP applicable"
                        />
                      </td>

                      <td className="p-4">
                        <div className="text-xs text-gray-500 mb-1">{cond.label}</div>
                        <pre className="whitespace-pre-wrap break-words rounded-lg border bg-slate-50 p-3 text-xs leading-5 text-slate-800">
                          {cond.content}
                        </pre>
                      </td>

                      <td className="p-4">
                        <Pill
                          label={(r.statut_facturation ?? "—").toUpperCase()}
                          className={actionPillClass(r.statut_facturation)}
                        />
                      </td>

                      <td className="p-4">
                        <Pill
                          label={r.is_active === false ? "Désactivée" : "Active"}
                          className={
                            r.is_active === false
                              ? "bg-gray-100 text-gray-700 border-gray-200"
                              : "bg-green-100 text-green-800 border-green-200"
                          }
                        />
                      </td>

                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(r)} className="rounded-lg p-2 hover:bg-gray-100" title="Modifier">
                            <Edit2 className="h-4 w-4 text-gray-700" />
                          </button>

                          {r.is_active === false ? (
                            <button onClick={() => onRestore(r)} className="rounded-lg p-2 hover:bg-blue-100" title="Restaurer">
                              <RotateCcw className="h-4 w-4 text-blue-600" />
                            </button>
                          ) : (
                            <button onClick={() => onDelete(r)} className="rounded-lg p-2 hover:bg-red-100" title="Désactiver">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create/Edit */}
      {(openCreate || editing) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{editing ? "Modifier une règle" : "Créer une règle"}</div>
                <div className="text-xs text-gray-500">
                  Pour qu’une règle soit appliquée, la <b>famille</b> doit correspondre (code_activite + code_produit).
                </div>
              </div>
              <button
                className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setOpenCreate(false);
                  setEditing(null);
                  resetForm();
                }}
              >
                Fermer
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">Code activité</div>
                  <input
                    value={form.code_activite}
                    onChange={(e) => setForm({ ...form, code_activite: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="ex: LMC"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">Code produit</div>
                  <input
                    value={form.code_produit}
                    onChange={(e) => setForm({ ...form, code_produit: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="ex: IQP"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">Code règle</div>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="ex: REMU_xxxxx"
                  />
                  <div className="text-[11px] text-gray-500">Doit être unique et lisible.</div>
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
                    placeholder="ex: ACCES FTT OPTIQUES"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">PLP applicable</div>
                  <select
                    value={form.plp_applicable === null ? "NULL" : form.plp_applicable ? "TRUE" : "FALSE"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        plp_applicable: e.target.value === "NULL" ? null : e.target.value === "TRUE",
                      })
                    }
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  >
                    <option value="NULL">—</option>
                    <option value="TRUE">Oui</option>
                    <option value="FALSE">Non</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">Catégorie</div>
                  <input
                    value={form.categorie}
                    onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="(optionnel)"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <div className="text-xs font-medium text-gray-700">Condition SQL (optionnel)</div>
                  <textarea
                    value={form.condition_sql}
                    onChange={(e) => setForm({ ...form, condition_sql: e.target.value })}
                    className="w-full min-h-[120px] rounded-lg border px-3 py-2 text-sm font-mono"
                    placeholder="Si vide → la règle est considérée comme 'Toujours vraie'."
                  />
                </div>
              </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-2">
              <button
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  setOpenCreate(false);
                  setEditing(null);
                  resetForm();
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