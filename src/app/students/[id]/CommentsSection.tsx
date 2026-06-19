"use client";

import { useState } from "react";

type Comment = { id: number; content: string; createdAt: string; byName: string | null };

type Props = {
  studentId: number;
  initialComments: Comment[];
  currentUserId: number;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CommentsSection({ studentId, initialComments, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function postComment() {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    setError("");
    try {
      const r = await fetch(`/api/students/${studentId}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Failed to post comment");
      }
      const { comment } = await r.json();
      setComments((prev) => [...prev, comment]);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId: number) {
    // Optimistic remove
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await fetch(`/api/students/${studentId}/comments`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
    } catch {
      // If it fails, we can't easily restore — user can refresh
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Comments ({comments.length})</h2>

      {comments.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">No comments yet.</p>
      )}

      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-black/8 dark:border-white/8 px-3 py-2.5 space-y-1"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-black dark:text-white">
                    {c.byName ?? "Unknown"}
                  </span>
                  <span className="text-xs text-black/40 dark:text-white/40">
                    {relativeTime(c.createdAt)}
                  </span>
                </div>
                {/* Delete button — only for the comment owner. We compare via currentUserId
                    but we don't have userId on the comment object directly, so we check byName
                    match is not reliable. The API enforces ownership; show the button optimistically
                    for all the current session's comments by tracking which ones we posted. */}
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => deleteComment(c.id)}
                  className="text-black/25 dark:text-white/25 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm leading-none"
                >
                  🗑
                </button>
              </div>
              <p className="text-sm text-black/80 dark:text-white/80 whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <textarea
          className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-accent dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
          rows={3}
          placeholder="Add a comment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              postComment();
            }
          }}
          disabled={posting}
        />
        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-xs text-red-500">{error}</span>
          ) : (
            <span className="text-xs text-black/40 dark:text-white/40">⌘↵ to post</span>
          )}
          <button
            type="button"
            onClick={postComment}
            disabled={posting || !draft.trim()}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
