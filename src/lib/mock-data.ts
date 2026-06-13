import type { ProductWithCounts, Comment, Profile } from "@/types/database";

export const MOCK_PROFILES: Profile[] = [
  {
    id: "1",
    display_name: "Alex",
    handle: "alexbuilds",
    avatar_url: null,
    bio: "Building tools for builders. Loves side projects.",
    is_admin: true,
    created_at: "2026-05-01T00:00:00Z",
  },
];

export const MOCK_PRODUCTS: ProductWithCounts[] = [
  {
    id: "p1",
    builder_id: "1",
    name: "CV Roast",
    tagline: "AI-powered CV feedback that tells you what recruiters actually think.",
    description:
      "Upload your CV and get brutally honest, actionable feedback powered by AI. Built for developers, PMs, and designers who are tired of sending applications into the void. CV Roast scores your resume, highlights weak spots, and rewrites sections so you stand out.",
    problem:
      "Most job seekers get zero feedback on their CV. They apply to 50+ jobs and hear nothing back — never knowing if the problem is their resume or the market.",
    audience: "Job seekers in tech — developers, product managers, designers, and AI engineers looking for their next role.",
    url: null,
    image_url: null,
    category: "AI",
    stage: "building",
    status: "live",
    demo_type: "live_demo",
    demo_week: "2026-05-23",
    demo_language: "english",
    week_of: "2026-05-18",
    created_at: "2026-05-18T10:00:00Z",
    vote_count: 0,
    comment_count: 0,
    builder: { display_name: "Alex", handle: "alexbuilds", avatar_url: null },
  },
  {
    id: "p2",
    builder_id: "1",
    name: "Product Builders",
    tagline: "A weekly showcase where builders share, demo, and get real feedback.",
    description:
      "Product Builders is a community platform where you submit what you're working on, the community votes and comments, and every Friday the top projects demo live on a casual Google Meet call. It's like a friendly show-and-tell for people who build things.",
    problem:
      "Builders work in isolation. You ship something cool but have no one to show it to. Existing platforms are too noisy or competitive — there's no place that feels like a supportive group of peers.",
    audience: "Indie hackers, side-project builders, early-stage founders, and anyone who loves building things and wants honest feedback from peers.",
    url: "https://productbuilders.app",
    image_url: null,
    category: "Community",
    stage: "building",
    status: "live",
    demo_type: "live_demo",
    demo_week: "2026-05-23",
    demo_language: "farsi",
    week_of: "2026-05-18",
    created_at: "2026-05-18T10:30:00Z",
    vote_count: 0,
    comment_count: 0,
    builder: { display_name: "Alex", handle: "alexbuilds", avatar_url: null },
  },
];

export const MOCK_COMMENTS: Record<string, Comment[]> = {};

export function isMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return !url || url.includes("placeholder") || url.includes("example");
}
