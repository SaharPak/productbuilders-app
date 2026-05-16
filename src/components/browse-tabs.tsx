"use client";

import Link from "next/link";

export function BrowseTabs({ activeSort }: { activeSort: "hot" | "new" }) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-paper-bg-deep p-1">
      <Link
        href="/?sort=hot"
        className={`flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-semibold transition-all ${
          activeSort === "hot"
            ? "bg-card-bg text-ink shadow-sm"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        🔥 Hot
      </Link>
      <Link
        href="/?sort=new"
        className={`flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-semibold transition-all ${
          activeSort === "new"
            ? "bg-card-bg text-ink shadow-sm"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        ✨ New
      </Link>
    </div>
  );
}
