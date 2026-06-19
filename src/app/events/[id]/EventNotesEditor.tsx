"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Props = { eventId: number; initialValue: string };

type Status = "idle" | "saving" | "saved";

export default function EventNotesEditor({ eventId, initialValue }: Props) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<Status>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (text: string) => {
      setStatus("saving");
      try {
        await fetch(`/api/events/${eventId}/notes`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notes: text }),
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("idle");
      }
    },
    [eventId]
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setValue(text);
    setStatus("idle");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text), 1000);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Notes</h2>
        {status === "saving" && (
          <span className="text-xs text-black/40 dark:text-white/40">Saving…</span>
        )}
        {status === "saved" && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
        )}
      </div>
      <textarea
        className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-accent dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
        rows={6}
        placeholder="Add notes about this event…"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
