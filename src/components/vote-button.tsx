"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/mock-data";

interface VoteButtonProps {
  productId: string;
  productName: string;
  initialCount: number;
  initialVoted: boolean;
}

export function VoteButton({
  productId,
  productName,
  initialCount,
  initialVoted,
}: VoteButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mock = isMockMode();
  const voteLabel = `${voted ? "Remove vote from" : "Vote for"} ${productName}. ${count} ${
    count === 1 ? "vote" : "votes"
  }`;

  function handleVote() {
    if (mock) {
      setVoted((v) => !v);
      setCount((c) => (voted ? c - 1 : c + 1));
      return;
    }

    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (voted) {
        const { error: voteError } = await supabase
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (voteError) {
          setError(voteError.message);
          return;
        }
        setVoted(false);
        setCount((c) => c - 1);
      } else {
        const { error: voteError } = await supabase
          .from("votes")
          .insert({ user_id: user.id, product_id: productId });
        if (voteError) {
          setError(voteError.message);
          return;
        }
        setVoted(true);
        setCount((c) => c + 1);
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleVote}
        disabled={isPending}
        aria-label={voteLabel}
        aria-pressed={voted}
        className={`flex flex-none flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xs transition-all ${
          voted
            ? "border-sage/30 bg-sage-light text-sage"
            : "border-border bg-paper-bg text-ink-faint hover:border-border-strong hover:text-ink-muted"
        }`}
      >
        <span className="text-base">{voted ? "❤️" : "🤍"}</span>
        <span className="font-mono tabular-nums">{count}</span>
      </button>
      {error && (
        <span className="max-w-[8rem] text-center text-[10px] leading-tight text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
