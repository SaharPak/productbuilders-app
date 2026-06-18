"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format, startOfWeek } from "date-fns";
import { upcomingDemoFridays } from "@/lib/week";
import { StatusBadge } from "@/components/status-badge";
import type {
  Product,
  DemoDay,
  DemoDayProjectWithProduct,
} from "@/types/database";

type ProductFilter = "pending" | "live" | "all" | "hidden" | "rejected";

const PRODUCT_FILTERS: ProductFilter[] = [
  "pending",
  "live",
  "hidden",
  "rejected",
  "all",
];

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductFilter>("pending");
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [demoDays, setDemoDays] = useState<DemoDay[]>([]);
  const [lineups, setLineups] = useState<
    Record<string, DemoDayProjectWithProduct[]>
  >({});
  const [newDemoDate, setNewDemoDate] = useState("");
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const router = useRouter();
  const supabase = createClient();
  const fridays = upcomingDemoFridays(6);

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
        .maybeSingle();

      if (!profile?.is_admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      await Promise.all([loadProducts(), loadDemoDays(), loadLineups()]);
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

  async function loadLineups() {
    const { data } = await supabase
      .from("demo_day_projects")
      .select("*, product:products(id, name, tagline, stage, category, demo_type, demo_language)")
      .order("display_order", { ascending: true });
    const grouped: Record<string, DemoDayProjectWithProduct[]> = {};
    (data as DemoDayProjectWithProduct[] | null)?.forEach((row) => {
      (grouped[row.week_of] ??= []).push(row);
    });
    setLineups(grouped);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", id);
    if (error) {
      setMessage(`Failed to update project: ${error.message}`);
      return;
    }
    await loadProducts();
  }

  async function createDemoDay() {
    setMessage(null);
    if (!newDemoDate) {
      setMessage("Pick a date for the demo day.");
      return;
    }
    const weekOf = mondayOf(newDemoDate);
    const demoDate = new Date(`${newDemoDate}T12:30:00Z`).toISOString();
    const { error } = await supabase
      .from("demo_days")
      .upsert({ week_of: weekOf, demo_date: demoDate, status: "upcoming" });
    if (error) {
      setMessage(`Failed to create demo day: ${error.message}`);
      return;
    }
    setNewDemoDate("");
    setExpandedWeek(weekOf);
    await loadDemoDays();
  }

  async function setDemoDayStatus(weekOf: string, status: string) {
    const { error } = await supabase
      .from("demo_days")
      .update({ status })
      .eq("week_of", weekOf);
    if (error) {
      setMessage(`Failed to update demo day: ${error.message}`);
      return;
    }
    await loadDemoDays();
  }

  async function addToLineup(weekOf: string, productId: string) {
    const existing = lineups[weekOf] ?? [];
    if (existing.some((r) => r.product_id === productId)) return;
    const order = existing.length;
    const { error } = await supabase
      .from("demo_day_projects")
      .insert({ week_of: weekOf, product_id: productId, display_order: order });
    if (error) {
      setMessage(`Failed to add project: ${error.message}`);
      return;
    }
    await loadLineups();
  }

  async function removeFromLineup(weekOf: string, productId: string) {
    const { error } = await supabase
      .from("demo_day_projects")
      .delete()
      .eq("week_of", weekOf)
      .eq("product_id", productId);
    if (error) {
      setMessage(`Failed to remove project: ${error.message}`);
      return;
    }
    await loadLineups();
  }

  async function setLineupStatus(
    weekOf: string,
    productId: string,
    status: string
  ) {
    const { error } = await supabase
      .from("demo_day_projects")
      .update({ status })
      .eq("week_of", weekOf)
      .eq("product_id", productId);
    if (error) {
      setMessage(`Failed to update line-up: ${error.message}`);
      return;
    }
    await loadLineups();
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
      setMessage("No approved products found for the current week.");
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
      const { error: winnerError } = await supabase
        .from("demo_day_winners")
        .upsert({
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

    setMessage(
      `Snapshot completed for week of ${weekOf}. ${topProducts.length} winners recorded.`
    );
    setSnapshotLoading(false);
    await Promise.all([loadDemoDays(), loadLineups()]);
  }

  const counts = {
    pending: products.filter((p) => p.status === "pending").length,
    live: products.filter((p) => p.status === "live").length,
  };
  const filtered =
    filter === "all" ? products : products.filter((p) => p.status === filter);
  const approvedProducts = products.filter((p) => p.status === "live");

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

      {message && (
        <p className="mt-4 rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-ink">
          {message}
        </p>
      )}

      {/* Review queue */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">
            Review submissions
            {counts.pending > 0 && (
              <span className="ml-2 rounded-full bg-stage-idea/15 px-2 py-0.5 text-xs font-semibold text-stage-idea">
                {counts.pending} pending
              </span>
            )}
          </h2>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-paper-bg-deep p-0.5">
            {PRODUCT_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-card-bg text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-ink-muted">
              Nothing here right now.
            </div>
          ) : (
            filtered.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card-bg p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/p/${product.id}`}
                      className="font-medium text-ink hover:text-persimmon"
                    >
                      {product.name}
                    </Link>
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="truncate text-xs text-ink-muted">
                    {product.tagline}
                  </p>
                  <p className="mt-1 font-mono text-xs text-ink-faint">
                    {format(new Date(product.created_at), "MMM d, HH:mm")} ·{" "}
                    {product.category} · {product.demo_type === "live_demo" ? "live demo" : "feedback"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {product.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(product.id, "live")}
                        className="rounded-lg bg-stage-launched px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(product.id, "rejected")}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-red-500 hover:bg-paper-bg-deep"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {product.status !== "live" && product.status !== "pending" && (
                    <button
                      onClick={() => updateStatus(product.id, "live")}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-stage-launched hover:bg-paper-bg-deep"
                    >
                      Approve
                    </button>
                  )}
                  {product.status === "live" && (
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
            ))
          )}
        </div>
      </div>

      {/* Demo day curation */}
      <div className="mt-12">
        <h2 className="font-display text-xl font-bold text-ink">Demo Days</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Create a demo day, then select approved projects for the live line-up.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card-bg p-4">
          <div className="flex-1">
            <label className="mb-1 block font-mono text-xs text-ink-faint">
              New demo day date
            </label>
            <input
              type="date"
              value={newDemoDate}
              onChange={(e) => setNewDemoDate(e.target.value)}
              list="demo-fridays"
              className="w-full rounded-lg border border-border bg-paper-bg px-3 py-2 text-sm text-ink focus:border-persimmon focus:outline-none"
            />
            <datalist id="demo-fridays">
              {fridays.map((f) => (
                <option key={f.date} value={f.date}>
                  {f.label}
                </option>
              ))}
            </datalist>
          </div>
          <button
            onClick={createDemoDay}
            className="rounded-full bg-persimmon px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover active:scale-[0.98]"
          >
            Create demo day
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {demoDays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-ink-muted">
              No demo days yet. Create one above.
            </div>
          ) : (
            demoDays.map((dd) => {
              const lineup = lineups[dd.week_of] ?? [];
              const inLineup = new Set(lineup.map((r) => r.product_id));
              const isExpanded = expandedWeek === dd.week_of;
              return (
                <div
                  key={dd.week_of}
                  className="rounded-2xl border border-border bg-card-bg p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-bold text-ink">
                        {format(new Date(dd.demo_date), "MMMM d, yyyy")}
                      </p>
                      <p className="font-mono text-xs text-ink-faint">
                        Week of {dd.week_of} · {dd.status} · {lineup.length}{" "}
                        selected
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() =>
                          setExpandedWeek(isExpanded ? null : dd.week_of)
                        }
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-ink-muted hover:border-border-strong hover:text-ink"
                      >
                        {isExpanded ? "Close" : "Manage line-up"}
                      </button>
                      <button
                        onClick={() =>
                          setDemoDayStatus(
                            dd.week_of,
                            dd.status === "upcoming" ? "completed" : "upcoming"
                          )
                        }
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-ink-muted hover:border-border-strong hover:text-ink"
                      >
                        Mark {dd.status === "upcoming" ? "completed" : "upcoming"}
                      </button>
                    </div>
                  </div>

                  {/* Recording URL */}
                  <div className="mt-2">
                    {editingWeek === dd.week_of ? (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="YouTube URL"
                          className="min-w-0 flex-1 rounded-lg border border-border bg-paper-bg px-2 py-1 text-xs text-ink placeholder:text-ink-faint focus:border-persimmon focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => updateRecordingUrl(dd.week_of, editUrl)}
                          className="rounded-lg bg-persimmon px-2 py-1 text-xs font-medium text-white hover:bg-persimmon-hover"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingWeek(null);
                            setEditUrl("");
                          }}
                          className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:bg-paper-bg-deep"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingWeek(dd.week_of);
                          setEditUrl(dd.recording_url ?? "");
                        }}
                        className="text-xs text-ink-faint underline-offset-2 hover:underline"
                      >
                        {dd.recording_url
                          ? "Edit recording URL"
                          : "Add recording URL"}
                      </button>
                    )}
                  </div>

                  {/* Selected line-up */}
                  {lineup.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {lineup.map((row, i) => (
                        <div
                          key={row.product_id}
                          className="flex items-center gap-3 rounded-xl bg-paper-bg p-2.5"
                        >
                          <span className="font-mono text-sm font-bold text-ink-faint">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {row.product?.name ?? "Untitled"}
                            </p>
                            <p className="font-mono text-[11px] text-ink-faint">
                              {row.status}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setLineupStatus(
                                dd.week_of,
                                row.product_id,
                                row.status === "presented"
                                  ? "selected"
                                  : "presented"
                              )
                            }
                            className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:bg-paper-bg-deep"
                          >
                            {row.status === "presented"
                              ? "Undo presented"
                              : "Mark presented"}
                          </button>
                          <button
                            onClick={() =>
                              removeFromLineup(dd.week_of, row.product_id)
                            }
                            className="rounded-lg border border-border px-2 py-1 text-xs text-red-500 hover:bg-paper-bg-deep"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add approved projects */}
                  {isExpanded && (
                    <div className="mt-3 rounded-xl border border-dashed border-border p-3">
                      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
                        Add an approved project
                      </p>
                      {approvedProducts.filter((p) => !inLineup.has(p.id))
                        .length === 0 ? (
                        <p className="text-xs text-ink-muted">
                          No approved projects available to add.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {approvedProducts
                            .filter((p) => !inLineup.has(p.id))
                            .map((p) => (
                              <button
                                key={p.id}
                                onClick={() => addToLineup(dd.week_of, p.id)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-muted hover:border-persimmon hover:text-persimmon"
                              >
                                + {p.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Auto snapshot (top-3 by votes) */}
      <div className="mt-12 rounded-2xl border border-border bg-card-bg p-4">
        <h2 className="font-display text-lg font-bold text-ink">
          Auto snapshot (top 3 by votes)
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Records this week&apos;s top 3 approved projects as demo day winners.
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
          className="mt-3 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-paper-bg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {snapshotLoading ? "Running..." : "Take snapshot now"}
        </button>
      </div>
    </div>
  );
}
