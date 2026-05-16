"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { Comment } from "@/types/database";

export function CommentSection({ productId }: { productId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadComments();
  }, []);

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select(
        "*, author:profiles!author_id(display_name, handle, avatar_url)"
      )
      .eq("product_id", productId)
      .eq("status", "live")
      .order("created_at", { ascending: true });

    if (data) setComments(data as unknown as Comment[]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    startTransition(async () => {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const { error: insertError } = await supabase.from("comments").insert({
        product_id: productId,
        author_id: user.id,
        body: body.trim(),
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setBody("");
      await loadComments();
    });
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">
        Comments ({comments.length})
      </h2>

      <div className="mt-4 space-y-4">
        {comments.map((comment) => {
          const author = comment.author as unknown as {
            display_name: string;
            handle: string | null;
            avatar_url: string | null;
          };

          return (
            <div
              key={comment.id}
              className="rounded-xl border border-border bg-card-bg p-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-bg-deep text-xs font-semibold text-ink-muted">
                  {author?.display_name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                {author?.handle ? (
                  <Link
                    href={`/u/${author.handle}`}
                    className="text-sm font-medium text-ink transition-colors hover:text-persimmon"
                  >
                    @{author.handle}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-ink">
                    {author?.display_name ?? "Anonymous"}
                  </span>
                )}
                <span className="font-mono text-xs text-ink-faint">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{comment.body}</p>
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-faint">
            No comments yet. Be the first.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts..."
          maxLength={500}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-xs text-ink-faint">
            {body.length}/500
          </span>
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="rounded-full bg-persimmon px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Posting..." : "Post comment"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
