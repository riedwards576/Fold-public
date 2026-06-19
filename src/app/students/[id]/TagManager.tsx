"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tag = { id: number; name: string; color: string };

type Props = {
  studentId: number;
  currentTags: Tag[];
  allTags: Tag[];
};

export default function TagManager({ studentId, currentTags, allTags }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const appliedIds = new Set(currentTags.map((t) => t.id));

  const suggestions = allTags.filter(
    (t) =>
      !appliedIds.has(t.id) &&
      t.name.toLowerCase().includes(input.toLowerCase())
  );

  const exactMatch = allTags.find(
    (t) => t.name.toLowerCase() === input.toLowerCase()
  );

  async function addTag(tagId: number) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/students/${studentId}/tags`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Failed");
      }
      setInput("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tagId: number) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/students/${studentId}/tags`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function createAndAddTag(name: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tags", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Failed");
      }
      const newTag: Tag = await r.json();
      await addTag(newTag.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!input.trim()) return;
    if (exactMatch && !appliedIds.has(exactMatch.id)) {
      addTag(exactMatch.id);
    } else if (!exactMatch) {
      createAndAddTag(input.trim());
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Tags</h2>

      {/* Applied tags */}
      <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
        {currentTags.length === 0 && (
          <span className="text-sm text-black/50 dark:text-white/50">No tags yet.</span>
        )}
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              disabled={busy}
              className="ml-0.5 hover:opacity-70 disabled:opacity-40 leading-none"
              aria-label={`Remove tag ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          className="input w-full"
          placeholder="Add a tag…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
        />
        {/* Suggestions dropdown */}
        {input.length > 0 && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg py-1 text-sm">
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-left"
                  onClick={() => addTag(tag.id)}
                  disabled={busy}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              </li>
            ))}
            {!exactMatch && input.trim() && (
              <li>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-left text-black/60 dark:text-white/60"
                  onClick={() => createAndAddTag(input.trim())}
                  disabled={busy}
                >
                  <span className="text-xs">Create</span>
                  <span className="font-medium text-black dark:text-white">"{input.trim()}"</span>
                </button>
              </li>
            )}
          </ul>
        )}
        {input.length > 0 && suggestions.length === 0 && !exactMatch && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg py-1 text-sm">
            <li>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-left text-black/60 dark:text-white/60"
                onClick={() => createAndAddTag(input.trim())}
                disabled={busy}
              >
                <span className="text-xs">Create</span>
                <span className="font-medium text-black dark:text-white">"{input.trim()}"</span>
              </button>
            </li>
          </ul>
        )}
      </div>

      <p className="text-xs text-black/50 dark:text-white/40">
        Select an existing tag or press Enter to create a new one.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
