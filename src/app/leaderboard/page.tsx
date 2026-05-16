import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { DemoCountdownBanner } from "@/components/demo-countdown-banner";
import type { ProductWithCounts } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "The top products this week. Top 3 demo live every Friday.",
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("product_with_counts")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let productsWithVotes: ProductWithCounts[] =
    (products ?? []) as ProductWithCounts[];

  if (user && products && products.length > 0) {
    const { data: userVotes } = await supabase
      .from("votes")
      .select("product_id")
      .eq("user_id", user.id);

    const votedSet = new Set(userVotes?.map((v) => v.product_id));
    productsWithVotes = productsWithVotes.map((p) => ({
      ...p,
      user_has_voted: votedSet.has(p.id),
    }));
  }

  const top3 = productsWithVotes.slice(0, 3);
  const rest = productsWithVotes.slice(3);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-4xl font-black text-ink">
        The Top Three
      </h1>
      <DemoCountdownBanner />

      {top3.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-display text-xl font-bold text-ink">
            No products yet this week
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Submit yours to claim the top spot.
          </p>
        </div>
      ) : (
        <>
          {/* Podium: desktop side-by-side, mobile stacked */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[1, 0, 2].map((idx) => {
              const product = top3[idx];
              if (!product) return <div key={idx} />;
              const isFirst = idx === 0;
              const builder =
                typeof product.builder === "string"
                  ? JSON.parse(product.builder)
                  : product.builder;

              return (
                <div
                  key={product.id}
                  className={`order-${idx === 0 ? 1 : idx === 1 ? 0 : 2} flex flex-col items-center rounded-2xl border p-6 text-center transition-all ${
                    isFirst
                      ? "border-ink bg-ink text-paper-bg sm:-mt-4"
                      : "border-border bg-card-bg"
                  }`}
                >
                  <span
                    className={`font-mono text-3xl font-bold ${isFirst ? "text-persimmon" : "text-ink-faint"}`}
                  >
                    #{idx + 1}
                  </span>
                  <h3
                    className={`mt-2 font-display text-lg font-bold ${isFirst ? "text-paper-bg" : "text-ink"}`}
                  >
                    {product.name}
                  </h3>
                  <p
                    className={`mt-1 text-sm line-clamp-2 ${isFirst ? "text-paper-bg/70" : "text-ink-muted"}`}
                  >
                    {product.tagline}
                  </p>
                  {builder?.handle && (
                    <p
                      className={`mt-2 text-xs ${isFirst ? "text-paper-bg/50" : "text-ink-faint"}`}
                    >
                      @{builder.handle}
                    </p>
                  )}
                  <p
                    className={`mt-3 font-mono text-xl font-bold ${isFirst ? "text-persimmon" : "text-ink"}`}
                  >
                    {product.vote_count}
                    <span
                      className={`ml-1 text-xs font-normal ${isFirst ? "text-paper-bg/50" : "text-ink-faint"}`}
                    >
                      votes
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          {rest.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-xl font-bold text-ink">
                Also in the running
              </h2>
              <div className="mt-4 space-y-3">
                {rest.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    rank={i + 4}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
