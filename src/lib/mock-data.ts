import type {
  ProductWithCounts,
  Comment,
  Profile,
  DemoDay,
  DemoDayProjectWithProduct,
  DemoDayWinnerWithProduct,
} from "@/types/database";

/**
 * Demo / mock data.
 *
 * When Supabase env vars are missing or still placeholders, the app runs in a
 * read-only demo mode backed by this data so the whole product can be explored
 * without a database. No real personal data lives here.
 */

export const MOCK_PROFILES: Profile[] = [
  {
    id: "u-admin",
    display_name: "Sam (Demo Admin)",
    handle: "demoadmin",
    avatar_url: null,
    bio: "Running the Tech Immigrants Demo Day. This is demo data.",
    is_admin: true,
    created_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "u-alex",
    display_name: "Alex",
    handle: "alexbuilds",
    avatar_url: null,
    bio: "Building tools for builders. Loves side projects.",
    is_admin: false,
    created_at: "2026-05-02T00:00:00Z",
  },
  {
    id: "u-mina",
    display_name: "Mina",
    handle: "minamakes",
    avatar_url: null,
    bio: "Frontend engineer shipping small useful things.",
    is_admin: false,
    created_at: "2026-05-03T00:00:00Z",
  },
];

export const MOCK_PRODUCTS: ProductWithCounts[] = [
  {
    id: "p1",
    builder_id: "u-alex",
    name: "CV Roast",
    tagline: "AI-powered CV feedback that tells you what recruiters actually think.",
    description:
      "Upload your CV and get brutally honest, actionable feedback powered by AI. Built for developers, PMs, and designers who are tired of sending applications into the void.",
    problem:
      "Most job seekers get zero feedback on their CV. They apply to 50+ jobs and hear nothing back, never knowing if the problem is their resume or the market.",
    audience:
      "Job seekers in tech: developers, product managers, designers, and AI engineers looking for their next role.",
    url: "https://example.com/cvroast",
    image_url: null,
    category: "AI",
    stage: "building",
    status: "live",
    demo_type: "live_demo",
    demo_week: "2026-06-19",
    demo_language: "english",
    week_of: "2026-06-08",
    created_at: "2026-06-08T10:00:00Z",
    vote_count: 24,
    comment_count: 3,
    builder: { display_name: "Alex", handle: "alexbuilds", avatar_url: null },
  },
  {
    id: "p2",
    builder_id: "u-mina",
    name: "StandupSync",
    tagline: "Async standups that actually save your team time.",
    description:
      "Replace the daily 30-minute call with a 2-minute written update. StandupSync nudges your team, collects updates, and posts a clean summary to Slack.",
    problem:
      "Daily standup calls eat focus time and rarely surface blockers in time.",
    audience: "Remote engineering and product teams.",
    url: "https://example.com/standupsync",
    image_url: null,
    category: "Developer Tool",
    stage: "launched",
    status: "live",
    demo_type: "feedback_only",
    demo_week: null,
    demo_language: null,
    week_of: "2026-06-08",
    created_at: "2026-06-08T11:30:00Z",
    vote_count: 17,
    comment_count: 1,
    builder: { display_name: "Mina", handle: "minamakes", avatar_url: null },
  },
  {
    id: "p3",
    builder_id: "u-alex",
    name: "TrailLog",
    tagline: "A simple, private journal for tracking your hikes and runs.",
    description:
      "Log routes, distance, and how you felt. No social feed, no ads, just your own trail history.",
    problem: "Most fitness apps are noisy, social, and want to sell you things.",
    audience: "Hikers and runners who want a calm, private log.",
    url: null,
    image_url: null,
    category: "Mobile",
    stage: "idea",
    status: "live",
    demo_type: "feedback_only",
    demo_week: null,
    demo_language: null,
    week_of: "2026-06-08",
    created_at: "2026-06-08T09:00:00Z",
    vote_count: 9,
    comment_count: 0,
    builder: { display_name: "Alex", handle: "alexbuilds", avatar_url: null },
  },
  {
    id: "p4",
    builder_id: "u-mina",
    name: "InboxZeroBot",
    tagline: "A Telegram bot that summarizes your unread newsletters.",
    description:
      "Forward your newsletters and get a single daily digest. Still cleaning it up before launch.",
    problem: "Newsletter overload buries the few things you actually care about.",
    audience: "People drowning in newsletter subscriptions.",
    url: null,
    image_url: null,
    category: "AI",
    stage: "building",
    status: "pending",
    demo_type: "feedback_only",
    demo_week: null,
    demo_language: null,
    week_of: "2026-06-08",
    created_at: "2026-06-09T08:00:00Z",
    vote_count: 0,
    comment_count: 0,
    builder: { display_name: "Mina", handle: "minamakes", avatar_url: null },
  },
];

export const MOCK_COMMENTS: Record<string, Comment[]> = {
  p1: [
    {
      id: "c1",
      product_id: "p1",
      author_id: "u-mina",
      body: "Love this. The honest feedback angle is exactly what I needed last year.",
      status: "live",
      created_at: "2026-06-08T12:00:00Z",
      author: { display_name: "Mina", handle: "minamakes", avatar_url: null },
    },
  ],
};

const PAST_WEEK = "2026-06-01";
const UPCOMING_WEEK = "2026-06-15";

export const MOCK_DEMO_DAYS: DemoDay[] = [
  {
    week_of: UPCOMING_WEEK,
    demo_date: "2026-06-19T12:30:00Z",
    status: "upcoming",
    notes: "Tech Immigrants Demo Day. Live on Google Meet.",
    recording_url: null,
  },
  {
    week_of: PAST_WEEK,
    demo_date: "2026-06-05T12:30:00Z",
    status: "completed",
    notes: "A great session with three live demos.",
    recording_url: null,
  },
];

export const MOCK_DEMO_DAY_PROJECTS: DemoDayProjectWithProduct[] = [
  {
    week_of: UPCOMING_WEEK,
    product_id: "p1",
    display_order: 0,
    status: "selected",
    created_at: "2026-06-10T00:00:00Z",
    product: {
      id: "p1",
      name: "CV Roast",
      tagline: MOCK_PRODUCTS[0].tagline,
      stage: "building",
      category: "AI",
      demo_type: "live_demo",
      demo_language: "english",
    },
  },
  {
    week_of: UPCOMING_WEEK,
    product_id: "p2",
    display_order: 1,
    status: "selected",
    created_at: "2026-06-10T00:00:00Z",
    product: {
      id: "p2",
      name: "StandupSync",
      tagline: MOCK_PRODUCTS[1].tagline,
      stage: "launched",
      category: "Developer Tool",
      demo_type: "feedback_only",
      demo_language: null,
    },
  },
];

export const MOCK_DEMO_DAY_WINNERS: DemoDayWinnerWithProduct[] = [
  {
    week_of: PAST_WEEK,
    rank: 1,
    product_id: "p2",
    vote_count: 31,
    product: { id: "p2", name: "StandupSync", tagline: MOCK_PRODUCTS[1].tagline },
  },
  {
    week_of: PAST_WEEK,
    rank: 2,
    product_id: "p3",
    vote_count: 22,
    product: { id: "p3", name: "TrailLog", tagline: MOCK_PRODUCTS[2].tagline },
  },
];

/** Publicly visible (approved) products only. */
export function mockPublicProducts(): ProductWithCounts[] {
  return MOCK_PRODUCTS.filter((p) => p.status === "live");
}

/**
 * Enables local demo data when Supabase env vars are absent or still placeholders.
 */
export function isMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    !url ||
    !key ||
    url.includes("placeholder") ||
    url.includes("example")
  );
}
