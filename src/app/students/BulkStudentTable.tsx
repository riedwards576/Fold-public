"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RowActions from "../RowActions";

type StudentRow = {
  id: number;
  firstName: string;
  lastName: string | null;
  funnelStage: string;
  createdAt: Date;
};

type Tag = { id: number; name: string; color: string };

type Props = {
  students: StudentRow[];
  allTags: Tag[];
  deleteAction: (formData: FormData) => Promise<void>;
};

export default function BulkStudentTable({ students, allTags, deleteAction }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [pendingTag, setPendingTag] = useState<{ id?: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allSelected = students.length > 0 && students.every((s) => selected.has(s.id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s.id)));
    }
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Tag autocomplete
  const suggestions = allTags.filter(
    (t) =>
      tagInput.length > 0 &&
      t.name.toLowerCase().includes(tagInput.toLowerCase())
  );
  const exactMatch = allTags.find(
    (t) => t.name.toLowerCase() === tagInput.toLowerCase()
  );

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
    // Clear pending tag if user changes text away from it
    if (pendingTag && e.target.value !== pendingTag.name) {
      setPendingTag(null);
    }
  }

  async function applyTag() {
    if (!pendingTag && !tagInput.trim()) return;
    const effectiveTag = pendingTag ?? { name: tagInput.trim() };

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const body: Record<string, unknown> = {
        studentIds: Array.from(selected),
      };
      if (effectiveTag.id !== undefined) {
        body.tagId = effectiveTag.id;
      } else {
        body.tagName = effectiveTag.name;
      }

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

  const showDropdown =
    tagInput.length > 0 && (suggestions.length > 0 || (!exactMatch && tagInput.trim().length > 0));

  return (
    <>
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
              <th>Name</th>
              <th>Stage</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
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
                <td>
                  <Link href={`/students/${s.id}`} className="font-medium hover:underline">
                    {s.firstName} {s.lastName ?? ""}
                  </Link>
                </td>
                <td>
                  <span className="chip">{s.funnelStage}</span>
                </td>
                <td className="text-sm text-black/60">
                  {new Date(s.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                </td>
                <td className="text-right">
                  <RowActions
                    id={s.id}
                    deleteAction={deleteAction}
                    confirmMessage={`Delete ${s.firstName} ${s.lastName ?? ""}? This also removes their attendance and contact history. This can't be undone.`}
                  />
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-black/50 py-8">
                  No students yet. Try{" "}
                  <Link className="underline" href="/import">
                    /import
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Fixed bottom bar — only shown when something is selected */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-900 dark:bg-zinc-950 text-white px-4 py-3"
        >
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

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                Delete selected
              </button>
            ) : (
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-red-400">Delete {selected.size} student{selected.size !== 1 ? "s" : ""}? This can't be undone.</span>
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

            {success && (
              <span className="text-sm text-emerald-400">{success}</span>
            )}
            {error && (
              <span className="text-sm text-red-400">{error}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
