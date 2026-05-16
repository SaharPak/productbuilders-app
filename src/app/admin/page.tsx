"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { Product } from "@/types/database";

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "live" | "hidden" | "removed">(
    "all"
  );
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      await loadProducts();
      setLoading(false);
    }
    init();
  }, []);

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProducts(data);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("products").update({ status }).eq("id", id);
    await loadProducts();
  }

  async function triggerSnapshot() {
    setSnapshotLoading(true);
    setMessage(null);

    const { data: topProducts } = await supabase
      .from("product_with_counts")
      .select("id, vote_count, week_of")
      .order("vote_count", { ascending: false })
      .limit(3);

    if (!topProducts || topProducts.length === 0) {
      setMessage("No products found for current week.");
      setSnapshotLoading(false);
      return;
    }

    const weekOf = topProducts[0].week_of;

    // Upsert demo day
    await supabase.from("demo_days").upsert({
      week_of: weekOf,
      demo_date: new Date().toISOString(),
      status: "completed",
    });

    // Insert winners
    for (let i = 0; i < topProducts.length; i++) {
      await supabase.from("demo_day_winners").upsert({
        week_of: weekOf,
        rank: i + 1,
        product_id: topProducts[i].id,
        vote_count: topProducts[i].vote_count,
      });
    }

    setMessage(`Snapshot completed for week of ${weekOf}. ${topProducts.length} winners recorded.`);
    setSnapshotLoading(false);
  }

  const filtered =
    filter === "all"
      ? products
      : products.filter((p) => p.status === filter);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-3xl font-black text-ink">Admin</h1>

      <div className="mt-6 rounded-2xl border border-border bg-card-bg p-4">
        <h2 className="font-display text-lg font-bold text-ink">
          Demo Day Snapshot
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Manually trigger the winner snapshot for the current week.
        </p>
        <button
          onClick={triggerSnapshot}
          disabled={snapshotLoading}
          className="mt-3 rounded-full bg-persimmon px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98] disabled:opacity-50"
        >
          {snapshotLoading ? "Running..." : "Take snapshot now"}
        </button>
        {message && (
          <p className="mt-2 text-sm text-stage-launched">{message}</p>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">
            Submissions ({filtered.length})
          </h2>
          <div className="flex gap-1 rounded-lg border border-border bg-paper-bg-deep p-0.5">
            {(["all", "live", "hidden", "removed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-card-bg text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card-bg p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{product.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {product.tagline}
                </p>
                <p className="mt-1 font-mono text-xs text-ink-faint">
                  {format(new Date(product.created_at), "MMM d, HH:mm")} ·{" "}
                  {product.status}
                </p>
              </div>
              <div className="flex gap-1">
                {product.status !== "live" && (
                  <button
                    onClick={() => updateStatus(product.id, "live")}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-stage-launched hover:bg-paper-bg-deep"
                  >
                    Show
                  </button>
                )}
                {product.status !== "hidden" && (
                  <button
                    onClick={() => updateStatus(product.id, "hidden")}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-stage-idea hover:bg-paper-bg-deep"
                  >
                    Hide
                  </button>
                )}
                {product.status !== "removed" && (
                  <button
                    onClick={() => updateStatus(product.id, "removed")}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-red-500 hover:bg-paper-bg-deep"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
