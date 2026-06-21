"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RowActions from "../RowActions";
import BulkEditModal from "./BulkEditModal";

type StudentRow = {
  id: number;
  firstName: string;
  lastName: string | null;
  funnelStage: string;
  year: string | null;
  gender: string | null;
  email: string | null;
  igHandle: string | null;
  isActive: boolean;
  createdAt: Date;
  tags: { id: number; name: string; color: string }[];
  weeklyAttendance: boolean[];
};

function Sparkline({ weeks }: { weeks: boolean[] }) {
  return (
    <span className="inline-flex items-end gap-px h-4">
      {weeks.map((attended, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm ${attended ? "bg-accent h-4" : "bg-black/15 dark:bg-white/15 h-2"}`}
        />
      ))}
    </span>
  );
}

type Tag = { id: number; name: string; color: string };

type Props = {
  students: StudentRow[];
  allTags: Tag[];
  deleteAction: (formData: FormData) => Promise<void>;
};

// ── Column config ───────────────────────────────────────────────────────────
type ColKey = "name" | "stage" | "year" | "gender" | "email" | "igHandle" | "active" | "tags" | "created" | "attendance";

type ColDef = {
  key: ColKey;
  label: string;
  toggleable: boolean;
  defaultOn: boolean;
  sortable: boolean;
};

const COLUMNS: ColDef[] = [
  { key: "name",     label: "Name",    toggleable: false, defaultOn: true,  sortable: true  },
  { key: "stage",    label: "Stage",   toggleable: true,  defaultOn: true,  sortable: true  },
  { key: "year",     label: "Year",    toggleable: true,  defaultOn: true,  sortable: true  },
  { key: "gender",   label: "Gender",  toggleable: true,  defaultOn: false, sortable: true  },
  { key: "email",    label: "Email",   toggleable: true,  defaultOn: false, sortable: false },
  { key: "igHandle", label: "IG",      toggleable: true,  defaultOn: false, sortable: false },
  { key: "active",   label: "Active",  toggleable: true,  defaultOn: true,  sortable: false },
  { key: "tags",     label: "Tags",    toggleable: true,  defaultOn: true,  sortable: false },
  { key: "created",    label: "Created",    toggleable: true,  defaultOn: true,  sortable: true  },
  { key: "attendance", label: "Attendance", toggleable: true,  defaultOn: true,  sortable: false },
];

const DEFAULT_VISIBILITY = Object.fromEntries(
  COLUMNS.map((c) => [c.key, c.defaultOn])
) as Record<ColKey, boolean>;

// ── Year sort order ─────────────────────────────────────────────────────────
const YEAR_ORDER: Record<string, number> = {
  freshman: 0, sophomore: 1, junior: 2, senior: 3, grad: 4, postgrad: 5,
};

function yearRank(y: string | null): number {
  if (y === null || !(y in YEAR_ORDER)) return 999;
  return YEAR_ORDER[y];
}

// ── Sort types ──────────────────────────────────────────────────────────────
type SortDir = "asc" | "desc" | null;
type SortState = { col: ColKey; dir: Exclude<SortDir, null> } | null;

function nextDir(current: SortState, col: ColKey): SortState {
  if (!current || current.col !== col) return { col, dir: "asc" };
  if (current.dir === "asc") return { col, dir: "desc" };
  return null; // unsorted
}

function sortStudents(students: StudentRow[], sort: SortState): StudentRow[] {
  if (!sort) return students;
  const { col, dir } = sort;
  const mul = dir === "asc" ? 1 : -1;
  return [...students].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "name": {
        const la = (a.lastName ?? "").toLowerCase();
        const lb = (b.lastName ?? "").toLowerCase();
        cmp = la !== lb ? la.localeCompare(lb) : a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
        break;
      }
      case "stage":
        cmp = a.funnelStage.localeCompare(b.funnelStage);
        break;
      case "year":
        cmp = yearRank(a.year) - yearRank(b.year);
        break;
      case "gender":
        cmp = (a.gender ?? "").localeCompare(b.gender ?? "");
        break;
      case "created":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return cmp * mul;
  });
}

// ── Year filter chips ───────────────────────────────────────────────────────
const YEAR_CHIPS = ["freshman", "sophomore", "junior", "senior", "grad", "postgrad"] as const;
type YearChip = (typeof YEAR_CHIPS)[number];
const YEAR_LABEL: Record<YearChip, string> = {
  freshman: "Freshman", sophomore: "Sophomore", junior: "Junior", senior: "Senior", grad: "Grad", postgrad: "PostGrad",
};

// ── Active filter ───────────────────────────────────────────────────────────
type ActiveFilter = "all" | "active" | "inactive";

export default function BulkStudentTable({ students, allTags, deleteAction }: Props) {
  const router = useRouter();

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [pendingTag, setPendingTag] = useState<{ id?: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editPanel, setEditPanel] = useState(false);

  // Column visibility
  const [colVisible, setColVisible] = useState<Record<ColKey, boolean>>(DEFAULT_VISIBILITY);
  const [colPopoverOpen, setColPopoverOpen] = useState(false);
  const colPopoverRef = useRef<HTMLDivElement>(null);

  // Sort
  const [sort, setSort] = useState<SortState>(null);

  // Filters
  const [yearFilter, setYearFilter] = useState<Set<YearChip>>(new Set());
  const [tagFilter, setTagFilter] = useState<Set<number>>(new Set()); // tag ids
  const [tagDropOpen, setTagDropOpen] = useState(false);
  const tagDropRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  // Close popovers on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colPopoverRef.current && !colPopoverRef.current.contains(e.target as Node)) {
        setColPopoverOpen(false);
      }
      if (tagDropRef.current && !tagDropRef.current.contains(e.target as Node)) {
        setTagDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────
  const sorted = sortStudents(students, sort);

  const filtered = sorted.filter((s) => {
    // Year filter
    if (yearFilter.size > 0) {
      if (!s.year || !yearFilter.has(s.year as YearChip)) return false;
    }
    // Tag filter
    if (tagFilter.size > 0) {
      const hasAll = Array.from(tagFilter).every((tid) => s.tags.some((t) => t.id === tid));
      if (!hasAll) return false;
    }
    // Active filter
    if (activeFilter === "active" && !s.isActive) return false;
    if (activeFilter === "inactive" && s.isActive) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSortClick(col: ColKey) {
    const colDef = COLUMNS.find((c) => c.key === col);
    if (!colDef?.sortable) return;
    setSort(nextDir(sort, col));
  }

  function SortIcon({ col }: { col: ColKey }) {
    if (!sort || sort.col !== col) return <span className="ml-1 text-black/30 dark:text-white/30">⇅</span>;
    return <span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>;
  }

  function ThSortable({ col, children }: { col: ColKey; children: React.ReactNode }) {
    const colDef = COLUMNS.find((c) => c.key === col);
    if (!colDef?.sortable) return <th>{children}</th>;
    return (
      <th
        className="cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5"
        onClick={() => handleSortClick(col)}
      >
        <span className="inline-flex items-center">
          {children}
          <SortIcon col={col} />
        </span>
      </th>
    );
  }

  // ── Tag autocomplete (bulk bar) ──────────────────────────────────────────
  const suggestions = allTags.filter(
    (t) => tagInput.length > 0 && t.name.toLowerCase().includes(tagInput.toLowerCase())
  );
  const exactMatch = allTags.find((t) => t.name.toLowerCase() === tagInput.toLowerCase());

  function pickTag(tag: Tag) {
    setPendingTag({ id: tag.id, name: tag.name });
    setTagInput(tag.name);
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!tagInput.trim()) return;
    if (exactMatch) {
      setPendingTag({ id: exactMatch.id, name: exactMatch.name });
    } else {
      setPendingTag({ name: tagInput.trim() });
    }
  }

  function handleTagInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTagInput(e.target.value);
    if (pendingTag && e.target.value !== pendingTag.name) setPendingTag(null);
  }

  async function applyTag() {
    if (!pendingTag && !tagInput.trim()) return;
    const effectiveTag = pendingTag ?? { name: tagInput.trim() };

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const body: Record<string, unknown> = { studentIds: Array.from(selected) };
      if (effectiveTag.id !== undefined) body.tagId = effectiveTag.id;
      else body.tagName = effectiveTag.name;

      const r = await fetch("/api/students/bulk-tag", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Failed");
      }
      setSelected(new Set());
      setTagInput("");
      setPendingTag(null);
      setSuccess(`Tag "${effectiveTag.name}" applied to ${selected.size} student(s).`);
      router.refresh();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const r = await fetch("/api/students/bulk-delete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected) }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Failed");
      }
      const count = selected.size;
      setSelected(new Set());
      setConfirmDelete(false);
      setSuccess(`Deleted ${count} student${count !== 1 ? "s" : ""}.`);
      router.refresh();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function bulkEdit(patch: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const r = await fetch("/api/students/bulk-edit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected), ...patch }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Failed");
      }
      const count = selected.size;
      setSelected(new Set());
      setEditPanel(false);
      setSuccess(`Updated ${count} student${count !== 1 ? "s" : ""}.`);
      router.refresh();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const showDropdown =
    tagInput.length > 0 && (suggestions.length > 0 || (!exactMatch && tagInput.trim().length > 0));

  // Visible columns (always include name; respect toggles for rest)
  const visibleCols = COLUMNS.filter((c) => colVisible[c.key]);
  // +1 for checkbox, +1 for actions
  const colSpan = visibleCols.length + 2;

  return (
    <>
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center mb-2">
        {/* Year chips */}
        {YEAR_CHIPS.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() =>
              setYearFilter((prev) => {
                const next = new Set(prev);
                if (next.has(y)) next.delete(y);
                else next.add(y);
                return next;
              })
            }
            className={`chip cursor-pointer select-none transition-colors ${
              yearFilter.has(y)
                ? "bg-accent text-white"
                : "bg-black/8 dark:bg-white/8 text-black/70 dark:text-white/70 hover:bg-black/15 dark:hover:bg-white/15"
            }`}
          >
            {YEAR_LABEL[y]}
          </button>
        ))}

        {/* Tag filter dropdown */}
        <div className="relative" ref={tagDropRef}>
          <button
            type="button"
            onClick={() => setTagDropOpen((o) => !o)}
            className="chip cursor-pointer select-none bg-black/8 dark:bg-white/8 text-black/70 dark:text-white/70 hover:bg-black/15 dark:hover:bg-white/15 transition-colors"
          >
            Tags {tagFilter.size > 0 ? `(${tagFilter.size})` : ""}
          </button>
          {tagDropOpen && (
            <div className="absolute top-full mt-1 left-0 z-20 min-w-44 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg py-1">
              {allTags.length === 0 ? (
                <p className="px-3 py-2 text-xs text-black/50 dark:text-white/50">No tags yet</p>
              ) : (
                allTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setTagFilter((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      })
                    }
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white"
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="flex-1">{t.name}</span>
                    {tagFilter.has(t.id) && <span className="text-accent text-xs">✓</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected tag chips */}
        {Array.from(tagFilter).map((tid) => {
          const t = allTags.find((x) => x.id === tid);
          if (!t) return null;
          return (
            <span
              key={tid}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
              <button
                type="button"
                onClick={() => setTagFilter((prev) => { const next = new Set(prev); next.delete(tid); return next; })}
                className="hover:opacity-75 leading-none"
                aria-label={`Remove tag filter ${t.name}`}
              >
                ×
              </button>
            </span>
          );
        })}

        {/* Active filter */}
        <div className="flex rounded-md border border-black/10 dark:border-white/10 overflow-hidden text-xs">
          {(["all", "active", "inactive"] as ActiveFilter[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setActiveFilter(v)}
              className={`px-2.5 py-1 capitalize transition-colors ${
                activeFilter === v
                  ? "bg-accent text-white"
                  : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {v === "all" ? "All" : v === "active" ? "Active only" : "Inactive only"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Columns toggle ───────────────────────────────────────────────── */}
      <div className="flex justify-end mb-2" ref={colPopoverRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setColPopoverOpen((o) => !o)}
            className="btn-ghost border border-black/10 dark:border-white/10 text-xs px-2 py-1"
          >
            Columns
          </button>
          {colPopoverOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 min-w-36 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg py-1">
              {COLUMNS.filter((c) => c.toggleable).map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white"
                >
                  <input
                    type="checkbox"
                    checked={colVisible[c.key]}
                    onChange={() =>
                      setColVisible((prev) => ({ ...prev, [c.key]: !prev[c.key] }))
                    }
                    className="cursor-pointer"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all students"
                  className="cursor-pointer"
                />
              </th>
              {visibleCols.map((c) => (
                <ThSortable key={c.key} col={c.key}>
                  {c.label}
                </ThSortable>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleOne(s.id)}
                    aria-label={`Select ${s.firstName} ${s.lastName ?? ""}`}
                    className="cursor-pointer"
                  />
                </td>
                {visibleCols.map((c) => {
                  switch (c.key) {
                    case "name":
                      return (
                        <td key={c.key}>
                          <Link href={`/students/${s.id}`} className="font-medium hover:underline">
                            {s.firstName} {s.lastName ?? ""}
                          </Link>
                        </td>
                      );
                    case "stage":
                      return (
                        <td key={c.key}>
                          <span className="chip">{s.funnelStage}</span>
                        </td>
                      );
                    case "year":
                      return (
                        <td key={c.key} className="text-sm text-black/60 dark:text-white/60">
                          {s.year ?? "—"}
                        </td>
                      );
                    case "gender":
                      return (
                        <td key={c.key} className="text-sm text-black/60 dark:text-white/60">
                          {s.gender ?? "—"}
                        </td>
                      );
                    case "email":
                      return (
                        <td key={c.key} className="text-sm text-black/60 dark:text-white/60">
                          {s.email ?? "—"}
                        </td>
                      );
                    case "igHandle":
                      return (
                        <td key={c.key} className="text-sm text-black/60 dark:text-white/60">
                          {s.igHandle ? `@${s.igHandle}` : "—"}
                        </td>
                      );
                    case "active":
                      return (
                        <td key={c.key}>
                          <span
                            className={`chip ${
                              s.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
                            }`}
                          >
                            {s.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      );
                    case "tags":
                      return (
                        <td key={c.key}>
                          <span className="inline-flex flex-wrap gap-1">
                            {s.tags.length === 0 ? (
                              <span className="text-black/30 dark:text-white/30 text-xs">—</span>
                            ) : (
                              s.tags.map((t) => (
                                <span
                                  key={t.id}
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs text-white"
                                  style={{ backgroundColor: t.color }}
                                >
                                  {t.name}
                                </span>
                              ))
                            )}
                          </span>
                        </td>
                      );
                    case "created":
                      return (
                        <td key={c.key} className="text-sm text-black/60 dark:text-white/60">
                          {new Date(s.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                        </td>
                      );
                    case "attendance":
                      return (
                        <td key={c.key}>
                          <Sparkline weeks={s.weeklyAttendance} />
                        </td>
                      );
                    default:
                      return <td key={c.key} />;
                  }
                })}
                <td className="text-right">
                  <RowActions
                    id={s.id}
                    deleteAction={deleteAction}
                    confirmMessage={`Delete ${s.firstName} ${s.lastName ?? ""}? This also removes their attendance and contact history. This can't be undone.`}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="text-center text-black/50 dark:text-white/50 py-8">
                  {students.length === 0 ? (
                    <>
                      No students yet. Try{" "}
                      <Link className="underline" href="/import">
                        /import
                      </Link>
                      .
                    </>
                  ) : (
                    "No students match the current filters."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bulk edit modal ──────────────────────────────────────────────── */}
      {editPanel && (
        <BulkEditModal
          count={selected.size}
          busy={busy}
          onApply={bulkEdit}
          onClose={() => setEditPanel(false)}
        />
      )}

      {/* ── Fixed bottom bar ─────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-900 dark:bg-zinc-950 text-white px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium shrink-0">
              {selected.size} student{selected.size !== 1 ? "s" : ""} selected
            </span>

            {/* Tag input with autocomplete */}
            <div className="relative flex-1 min-w-48 max-w-72">
              <input
                type="text"
                className="w-full rounded-md border border-white/20 bg-zinc-800 text-white placeholder:text-white/40 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="Tag name…"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagKeyDown}
                disabled={busy}
                aria-label="Tag to apply"
              />
              {showDropdown && (
                <ul className="absolute bottom-full mb-1 w-full rounded-md border border-white/10 bg-zinc-800 shadow-lg py-1 text-sm z-10">
                  {suggestions.map((tag) => (
                    <li key={tag.id}>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-white"
                        onClick={() => pickTag(tag)}
                        disabled={busy}
                        type="button"
                      >
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    </li>
                  ))}
                  {!exactMatch && tagInput.trim() && (
                    <li>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-white/60"
                        onClick={() => setPendingTag({ name: tagInput.trim() })}
                        disabled={busy}
                        type="button"
                      >
                        <span className="text-xs">Create</span>
                        <span className="font-medium text-white">"{tagInput.trim()}"</span>
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={applyTag}
              disabled={busy || !tagInput.trim()}
              className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Applying…" : "Apply tag"}
            </button>

            {/* ── Bulk edit ── */}
            <button
              type="button"
              onClick={() => { setEditPanel(true); setConfirmDelete(false); }}
              disabled={busy}
              className="shrink-0 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40"
            >
              Edit fields
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => { setConfirmDelete(true); setEditPanel(false); }}
                disabled={busy}
                className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                Delete selected
              </button>
            ) : (
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-red-400">
                  Delete {selected.size} student{selected.size !== 1 ? "s" : ""}? This can't be undone.
                </span>
                <button
                  type="button"
                  onClick={bulkDelete}
                  disabled={busy}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  {busy ? "Deleting…" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                  className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10"
                >
                  Cancel
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => { setSelected(new Set()); setConfirmDelete(false); }}
              disabled={busy}
              className="shrink-0 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40"
            >
              Clear selection
            </button>

            {success && <span className="text-sm text-emerald-400">{success}</span>}
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </div>
      )}
    </>
  );
}
