"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();

  function handleVote() {
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      className={`flex flex-none flex-col items-center gap-0.5 rounded-xl border px-3 py-2 font-mono text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${
        voted
          ? "border-persimmon bg-persimmon-light text-persimmon"
          : "border-border bg-paper-bg-deep text-ink-muted hover:border-border-strong"
      }`}
    >
      <svg
        className={`h-4 w-4 ${voted ? "text-persimmon" : "text-ink-faint"}`}
        viewBox="0 0 24 24"
        fill={voted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M12 4 L3 14 h6 v6 h6 v-6 h6 z" />
      </svg>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
