"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { Product, DemoDay } from "@/types/database";

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "live" | "hidden" | "removed">(
    "all"
  );
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [demoDays, setDemoDays] = useState<DemoDay[]>([]);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

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
      await Promise.all([loadProducts(), loadDemoDays()]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProducts(data);
  }

  async function loadDemoDays() {
    const { data } = await supabase
      .from("demo_days")
      .select("*")
      .order("week_of", { ascending: false });
    if (data) setDemoDays(data);
  }

  async function updateRecordingUrl(weekOf: string, url: string) {
    const { error } = await supabase
      .from("demo_days")
      .update({ recording_url: url.trim() || null })
      .eq("week_of", weekOf);
    if (error) {
      setMessage(`Failed to update recording URL: ${error.message}`);
      return;
    }
    setEditingWeek(null);
    setEditUrl("");
    await loadDemoDays();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) {
      setMessage(`Failed to update product: ${error.message}`);
      return;
    }
    await loadProducts();
  }

  async function triggerSnapshot() {
    setSnapshotLoading(true);
    setMessage(null);

    const { currentWeekOf } = await import("@/lib/week");
    const weekOf = currentWeekOf();

    const { data: topProducts } = await supabase
      .from("product_with_counts")
      .select("id, vote_count, week_of")
      .eq("week_of", weekOf)
      .order("vote_count", { ascending: false })
      .limit(3);

    if (!topProducts || topProducts.length === 0) {
      setMessage("No products found for current week.");
      setSnapshotLoading(false);
      return;
    }

    const { error: demoError } = await supabase.from("demo_days").upsert({
      week_of: weekOf,
      demo_date: new Date().toISOString(),
      status: "completed",
      recording_url: recordingUrl.trim() || null,
    });

    if (demoError) {
      setMessage(`Failed to create demo day: ${demoError.message}`);
      setSnapshotLoading(false);
      return;
    }

    for (let i = 0; i < topProducts.length; i++) {
      const { error: winnerError } = await supabase.from("demo_day_winners").upsert({
        week_of: weekOf,
        rank: i + 1,
        product_id: topProducts[i].id,
        vote_count: topProducts[i].vote_count,
      });
      if (winnerError) {
        setMessage(`Failed to record winner ${i + 1}: ${winnerError.message}`);
        setSnapshotLoading(false);
        return;
      }
    }

    setMessage(`Snapshot completed for week of ${weekOf}. ${topProducts.length} winners recorded.`);
    await loadDemoDays();
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black text-ink">Admin</h1>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink-muted transition-all hover:border-border-strong hover:text-ink"
        >
          Log out
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card-bg p-4">
        <h2 className="font-display text-lg font-bold text-ink">
          Demo Day Snapshot
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Manually trigger the winner snapshot for the current week.
        </p>
        <input
          type="url"
          value={recordingUrl}
          onChange={(e) => setRecordingUrl(e.target.value)}
          placeholder="YouTube recording URL (optional)"
          className="mt-3 w-full rounded-lg border border-border bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-persimmon focus:outline-none"
        />
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

      {demoDays.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card-bg p-4">
          <h2 className="font-display text-lg font-bold text-ink">
            Past Demo Days
          </h2>
          <div className="mt-3 space-y-2">
            {demoDays.map((dd) => (
              <div
                key={dd.week_of}
                className="flex items-center gap-3 rounded-xl bg-paper-bg p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {format(new Date(dd.demo_date), "MMM d, yyyy")}
                  </p>
                  <p className="font-mono text-xs text-ink-faint">
                    {dd.week_of} · {dd.status}
                  </p>
                  {editingWeek === dd.week_of ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="YouTube URL"
                        className="min-w-0 flex-1 rounded-lg border border-border bg-card-bg px-2 py-1 text-xs text-ink placeholder:text-ink-faint focus:border-persimmon focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => updateRecordingUrl(dd.week_of, editUrl)}
                        className="rounded-lg bg-persimmon px-2 py-1 text-xs font-medium text-white hover:bg-persimmon-hover"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingWeek(null); setEditUrl(""); }}
                        className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:bg-paper-bg-deep"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 truncate text-xs text-ink-muted">
                      {dd.recording_url ? dd.recording_url : "No recording"}
                    </p>
                  )}
                </div>
                {editingWeek !== dd.week_of && (
                  <button
                    onClick={() => { setEditingWeek(dd.week_of); setEditUrl(dd.recording_url ?? ""); }}
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:border-border-strong hover:text-ink"
                  >
                    {dd.recording_url ? "Edit URL" : "Add URL"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
