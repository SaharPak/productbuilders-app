"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/mock-data";

interface VoteButtonProps {
  productId: string;
  initialCount: number;
  initialVoted: boolean;
}

export function VoteButton({
  productId,
  initialCount,
  initialVoted,
}: VoteButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const mock = isMockMode();

  function handleVote() {
    if (mock) {
      setVoted((v) => !v);
      setCount((c) => (voted ? c - 1 : c + 1));
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (voted) {
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (!error) {
          setVoted(false);
          setCount((c) => c - 1);
        }
      } else {
        const { error } = await supabase
          .from("votes")
          .insert({ user_id: user.id, product_id: productId });
        if (!error) {
          setVoted(true);
          setCount((c) => c + 1);
        }
      }
    });
  }

  return (
    <button
      onClick={handleVote}
      disabled={isPending}
      className={`flex flex-none flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xs transition-all ${
        voted
          ? "border-sage/30 bg-sage-light text-sage"
          : "border-border bg-paper-bg text-ink-faint hover:border-border-strong hover:text-ink-muted"
      }`}
    >
      <span className="text-base">{voted ? "❤️" : "🤍"}</span>
      <span className="font-mono tabular-nums">{count}</span>
    </button>
  );
}
