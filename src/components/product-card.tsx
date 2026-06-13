"use client";

import Link from "next/link";
import { VoteButton } from "./vote-button";
import { StageDot } from "./stage-dot";
import type { ProductWithCounts } from "@/types/database";

interface ProductCardProps {
  product: ProductWithCounts;
  rank?: number;
}

export function ProductCard({ product, rank }: ProductCardProps) {
  const builder =
    typeof product.builder === "string"
      ? JSON.parse(product.builder)
      : product.builder;

  return (
    <div className="group flex items-start gap-4 rounded-2xl border border-border bg-card-bg p-4 transition-all hover:border-border-strong">
      <div className="min-w-0 flex-1">
        <Link href={`/p/${product.id}`} className="block">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-ink leading-snug">
              {product.name}
            </h3>
            {product.demo_type === "live_demo" && (
              <span className="shrink-0 rounded-full bg-persimmon-light px-2 py-0.5 text-[10px] font-semibold text-persimmon">
                🎤 {product.demo_language === "farsi" ? "فارسی" : "EN"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted line-clamp-2">
            {product.tagline}
          </p>
        </Link>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <StageDot stage={product.stage} />
          <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-ink-faint">
            {product.category}
          </span>
          {builder?.handle && (
            <Link
              href={`/u/${builder.handle}`}
              className="text-ink-faint transition-colors hover:text-persimmon"
            >
              @{builder.handle}
            </Link>
          )}
          {product.comment_count > 0 && (
            <span className="text-ink-faint">
              💬 {product.comment_count}
            </span>
          )}
        </div>
      </div>

      <VoteButton
        productId={product.id}
        initialCount={product.vote_count}
        initialVoted={product.user_has_voted ?? false}
      />
    </div>
  );
}
