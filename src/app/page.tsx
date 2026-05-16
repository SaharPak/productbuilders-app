import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { BrowseTabs } from "@/components/browse-tabs";
import type { ProductWithCounts } from "@/types/database";

interface Props {
  searchParams: Promise<{ sort?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { sort } = await searchParams;
  const supabase = await createClient();
  const sortMode = sort === "new" ? "new" : "hot";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("product_with_counts").select("*");

  if (sortMode === "new") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("vote_count", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data: products } = await query.limit(50);

  let productsWithVoteStatus: ProductWithCounts[] = (products ?? []) as ProductWithCounts[];

  if (user && products && products.length > 0) {
    const { data: userVotes } = await supabase
      .from("votes")
      .select("product_id")
      .eq("user_id", user.id);

    const votedSet = new Set(userVotes?.map((v) => v.product_id));
    productsWithVoteStatus = productsWithVoteStatus.map((p) => ({
      ...p,
      user_has_voted: votedSet.has(p.id),
    }));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <section className="mb-12 text-center">
        <h1 className="font-display text-4xl font-black text-ink sm:text-5xl">
          Ship in public.
          <br />
          <span className="text-persimmon">Get heard.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-ink-muted">
          Builders submit products every week. The community votes. Top 3 demo
          live every Friday.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/submit"
            className="rounded-full bg-persimmon px-6 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98]"
          >
            Submit yours
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-ink-muted transition-all hover:scale-[1.02] hover:border-border-strong active:scale-[0.98]"
          >
            See the leaderboard
          </Link>
        </div>
      </section>

      <BrowseTabs activeSort={sortMode} />

      <div className="mt-6 space-y-3">
        {productsWithVoteStatus.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="font-display text-xl font-bold text-ink">
              No products yet this week
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Be the first to ship something.
            </p>
            <Link
              href="/submit"
              className="mt-4 inline-block rounded-full bg-persimmon px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98]"
            >
              Submit a product
            </Link>
          </div>
        ) : (
          productsWithVoteStatus.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              rank={sortMode === "hot" ? i + 1 : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
