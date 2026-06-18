import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { DemoCountdownBanner } from "@/components/demo-countdown-banner";
import { isMockMode, mockPublicProducts } from "@/lib/mock-data";
import { currentWeekOf } from "@/lib/week";
import type { ProductWithCounts } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "This Week's Favorites",
  description: "The community's favorite projects this week. Top picks demo live every Friday.",
};

async function getProducts(): Promise<ProductWithCounts[]> {
  if (isMockMode()) {
    return mockPublicProducts().sort((a, b) => b.vote_count - a.vote_count);
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("product_with_counts")
    .select("*")
    .eq("week_of", currentWeekOf())
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let result = (products ?? []) as ProductWithCounts[];

  if (user && products && products.length > 0) {
    const { data: userVotes } = await supabase
      .from("votes")
      .select("product_id")
      .eq("user_id", user.id);
    const votedSet = new Set(userVotes?.map((v) => v.product_id));
    result = result.map((p) => ({ ...p, user_has_voted: votedSet.has(p.id) }));
  }

  return result;
}

export default async function LeaderboardPage() {
  const allProducts = await getProducts();
  const top3 = allProducts.slice(0, 3);
  const rest = allProducts.slice(3);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-4xl font-black text-ink">
        This week&apos;s favorites
      </h1>
      <DemoCountdownBanner />

      {top3.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-display text-xl font-bold text-ink">No projects yet this week</p>
          <p className="mt-2 text-sm text-ink-muted">
            Be the first to share something — even rough ideas are welcome here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[1, 0, 2].map((idx) => {
              const product = top3[idx];
              if (!product) return <div key={idx} />;
              const isFirst = idx === 0;
              const builder =
                typeof product.builder === "string"
                  ? JSON.parse(product.builder)
                  : product.builder;
              const orderClass = idx === 0 ? "order-1" : idx === 1 ? "order-0" : "order-2";

              return (
                <Link
                  key={product.id}
                  href={`/p/${product.id}`}
                  className={`${orderClass} flex flex-col items-center rounded-2xl border p-6 text-center transition-all hover:scale-[1.02] ${
                    isFirst
                      ? "border-ink bg-ink text-paper-bg sm:-mt-4"
                      : "border-border bg-card-bg"
                  }`}
                >
                  <span className={`text-2xl ${isFirst ? "" : "opacity-60"}`}>
                    {idx === 0 ? "🏅" : idx === 1 ? "✨" : "💡"}
                  </span>
                  <h3 className={`mt-2 font-display text-lg font-bold ${isFirst ? "text-paper-bg" : "text-ink"}`}>
                    {product.name}
                  </h3>
                  <p className={`mt-1 text-sm line-clamp-2 ${isFirst ? "text-paper-bg/70" : "text-ink-muted"}`}>
                    {product.tagline}
                  </p>
                  {builder?.handle && (
                    <p className={`mt-2 text-xs ${isFirst ? "text-paper-bg/50" : "text-ink-faint"}`}>
                      @{builder.handle}
                    </p>
                  )}
                  <p className={`mt-3 text-sm ${isFirst ? "text-paper-bg/60" : "text-ink-faint"}`}>
                    ❤️ {product.vote_count} likes
                  </p>
                </Link>
              );
            })}
          </div>

          {rest.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-xl font-bold text-ink">Also in the running</h2>
              <div className="mt-4 space-y-3">
                {rest.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
