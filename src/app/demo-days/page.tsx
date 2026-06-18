import Link from "next/link";
import { format } from "date-fns";
import type { Metadata } from "next";
import {
  isMockMode,
  MOCK_DEMO_DAYS,
  MOCK_DEMO_DAY_PROJECTS,
  MOCK_DEMO_DAY_WINNERS,
} from "@/lib/mock-data";
import type {
  DemoDay,
  DemoDayProjectWithProduct,
  DemoDayWinnerWithProduct,
} from "@/types/database";

const demoDaysDescription =
  "See upcoming Tech Immigrants Demo Days, the selected line-up, and the archive of past sessions and winners.";

export const metadata: Metadata = {
  title: "Demo Days",
  description: demoDaysDescription,
  alternates: { canonical: "/demo-days" },
  openGraph: {
    title: "Demo Days",
    description: demoDaysDescription,
    url: "/demo-days",
  },
};

interface DemoDaysData {
  demoDays: DemoDay[];
  lineups: Map<string, DemoDayProjectWithProduct[]>;
  winners: Map<string, DemoDayWinnerWithProduct[]>;
}

async function getData(): Promise<DemoDaysData> {
  if (isMockMode()) {
    const lineups = new Map<string, DemoDayProjectWithProduct[]>();
    MOCK_DEMO_DAY_PROJECTS.forEach((p) => {
      lineups.set(p.week_of, [...(lineups.get(p.week_of) ?? []), p]);
    });
    const winners = new Map<string, DemoDayWinnerWithProduct[]>();
    MOCK_DEMO_DAY_WINNERS.forEach((w) => {
      winners.set(w.week_of, [...(winners.get(w.week_of) ?? []), w]);
    });
    return { demoDays: MOCK_DEMO_DAYS, lineups, winners };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: demoDays } = await supabase
    .from("demo_days")
    .select("*")
    .order("week_of", { ascending: false });

  const { data: lineupData } = await supabase
    .from("demo_day_projects")
    .select(
      "*, product:products(id, name, tagline, stage, category, demo_type, demo_language)"
    )
    .order("display_order", { ascending: true });

  const { data: winnersData } = await supabase
    .from("demo_day_winners")
    .select("*, product:products(name, tagline, id)")
    .order("rank", { ascending: true });

  const lineups = new Map<string, DemoDayProjectWithProduct[]>();
  ((lineupData ?? []) as DemoDayProjectWithProduct[]).forEach((row) => {
    lineups.set(row.week_of, [...(lineups.get(row.week_of) ?? []), row]);
  });

  const winners = new Map<string, DemoDayWinnerWithProduct[]>();
  ((winnersData ?? []) as DemoDayWinnerWithProduct[]).forEach((w) => {
    winners.set(w.week_of, [...(winners.get(w.week_of) ?? []), w]);
  });

  return { demoDays: (demoDays ?? []) as DemoDay[], lineups, winners };
}

function LineupRow({
  order,
  href,
  name,
  tagline,
  badge,
}: {
  order?: number;
  href?: string;
  name: string;
  tagline?: string | null;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-paper-bg p-3">
      {order !== undefined && (
        <span className="font-mono text-lg font-bold text-ink-faint">
          {order}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="font-medium text-ink transition-colors hover:text-persimmon"
          >
            {name}
          </Link>
        ) : (
          <span className="font-medium text-ink">{name}</span>
        )}
        {tagline && (
          <p className="truncate text-xs text-ink-muted">{tagline}</p>
        )}
      </div>
      {badge && (
        <span className="shrink-0 font-mono text-xs text-ink-faint">{badge}</span>
      )}
    </div>
  );
}

export default async function DemoDaysPage() {
  const { demoDays, lineups, winners } = await getData();

  const upcoming = demoDays.filter((d) => d.status === "upcoming");
  const past = demoDays.filter((d) => d.status !== "upcoming");
  const hasAny = demoDays.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Demo Days</h1>
      <p className="mt-2 text-ink-muted">
        Builders demo live for the Tech Immigrants community and get feedback
        from technical and business advisors.
      </p>

      {!hasAny && (
        <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-display text-xl font-bold text-ink">
            No demo day scheduled yet
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Check back soon, or share your project to be in the running.
          </p>
          <Link
            href="/submit"
            className="mt-4 inline-block rounded-full bg-persimmon px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover"
          >
            Submit your project
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold text-ink">Upcoming</h2>
          <div className="mt-4 space-y-6">
            {upcoming.map((dd) => {
              const lineup = lineups.get(dd.week_of) ?? [];
              return (
                <div
                  key={dd.week_of}
                  className="rounded-2xl border border-persimmon/30 bg-persimmon-light/40 p-6"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-persimmon px-2.5 py-0.5 text-xs font-semibold text-white">
                      Upcoming
                    </span>
                    <h3 className="font-display text-lg font-bold text-ink">
                      {format(new Date(dd.demo_date), "MMMM d, yyyy")}
                    </h3>
                  </div>
                  {dd.notes && (
                    <p className="mt-2 text-sm text-ink-muted">{dd.notes}</p>
                  )}

                  {lineup.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
                        Selected line-up
                      </p>
                      <div className="space-y-2">
                        {lineup.map((row, i) => (
                          <LineupRow
                            key={row.product_id}
                            order={i + 1}
                            href={row.product ? `/p/${row.product.id}` : undefined}
                            name={row.product?.name ?? "To be announced"}
                            tagline={row.product?.tagline}
                            badge={
                              row.product?.demo_type === "live_demo"
                                ? "🎤 live"
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-ink-muted">
                      The line-up is being finalized.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-ink">Archive</h2>
          <div className="mt-4 space-y-6">
            {past.map((dd) => {
              const weekWinners = winners.get(dd.week_of) ?? [];
              const lineup = lineups.get(dd.week_of) ?? [];
              return (
                <div
                  key={dd.week_of}
                  className="rounded-2xl border border-border bg-card-bg p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink">
                        {format(new Date(dd.demo_date), "MMMM d, yyyy")}
                      </h3>
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
                        Watch recording →
                      </a>
                    )}
                  </div>

                  {weekWinners.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {weekWinners.map((w) => (
                        <LineupRow
                          key={w.rank}
                          order={w.rank}
                          href={w.product ? `/p/${w.product.id}` : undefined}
                          name={w.product?.name ?? "Unknown"}
                          tagline={w.product?.tagline}
                          badge={`${w.vote_count} votes`}
                        />
                      ))}
                    </div>
                  )}

                  {weekWinners.length === 0 && lineup.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {lineup.map((row, i) => (
                        <LineupRow
                          key={row.product_id}
                          order={i + 1}
                          href={row.product ? `/p/${row.product.id}` : undefined}
                          name={row.product?.name ?? "Unknown"}
                          tagline={row.product?.tagline}
                        />
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
        </section>
      )}
    </div>
  );
}
