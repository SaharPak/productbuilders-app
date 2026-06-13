import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import type { Metadata } from "next";
import type { DemoDayWinnerWithProduct } from "@/types/database";

export const metadata: Metadata = {
  title: "Demo Days Archive",
  description: "Past demo days and their winners.",
};

export default async function DemoDaysPage() {
  const supabase = await createClient();

  const { data: demoDays } = await supabase
    .from("demo_days")
    .select("*")
    .eq("status", "completed")
    .order("week_of", { ascending: false });

  const { data: winnersData } = await supabase
    .from("demo_day_winners")
    .select("*, product:products(name, tagline, id)")
    .order("rank", { ascending: true });
  const winners = (winnersData ?? []) as DemoDayWinnerWithProduct[];

  const winnersMap = new Map<string, DemoDayWinnerWithProduct[]>();
  winners.forEach((w) => {
    const existing = winnersMap.get(w.week_of) ?? [];
    existing.push(w);
    winnersMap.set(w.week_of, existing);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-4xl font-black text-ink">
        Demo Days Archive
      </h1>
      <p className="mt-2 text-ink-muted">
        Every Friday, the top 3 products demo live. Here&apos;s the history.
      </p>

      {!demoDays || demoDays.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-display text-xl font-bold text-ink">
            No demo days yet
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            The first one is coming this Friday.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {demoDays.map((dd) => {
            const weekWinners = winnersMap.get(dd.week_of) ?? [];
            return (
              <div
                key={dd.week_of}
                className="rounded-2xl border border-border bg-card-bg p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">
                      {format(new Date(dd.demo_date), "MMMM d, yyyy")}
                    </h2>
                    <p className="font-mono text-xs text-ink-faint">
                      Week of {dd.week_of}
                    </p>
                  </div>
                  {dd.recording_url && (
                    <a
                      href={dd.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-muted transition-all hover:border-border-strong hover:text-ink"
                    >
                      Watch on YouTube →
                    </a>
                  )}
                </div>

                {dd.recording_url && (
                  <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl">
                    <iframe
                      src={dd.recording_url
                        .replace("youtu.be/", "www.youtube.com/embed/")
                        .replace("/watch?v=", "/embed/")
                        .replace("&", "?")}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Demo Day recording - ${format(new Date(dd.demo_date), "MMMM d, yyyy")}`}
                    />
                  </div>
                )}

                {weekWinners.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {weekWinners.map((w) => (
                      <div
                        key={w.rank}
                        className="flex items-center gap-3 rounded-xl bg-paper-bg p-3"
                      >
                        <span
                          className={`font-mono text-lg font-bold ${w.rank === 1 ? "text-persimmon" : "text-ink-faint"}`}
                        >
                          #{w.rank}
                        </span>
                        {w.product && (
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/p/${w.product.id}`}
                              className="font-medium text-ink transition-colors hover:text-persimmon"
                            >
                              {w.product.name}
                            </Link>
                            <p className="truncate text-xs text-ink-muted">
                              {w.product.tagline}
                            </p>
                          </div>
                        )}
                        <span className="font-mono text-sm text-ink-faint">
                          {w.vote_count} votes
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {dd.notes && (
                  <p className="mt-4 text-sm text-ink-muted">{dd.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
