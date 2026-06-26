import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isMockMode, MOCK_PRODUCTS } from "@/lib/mock-data";
import type { Product } from "@/types/database";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

async function getProductForPrep(id: string): Promise<{
  product: Product | null;
  isOwner: boolean;
}> {
  if (isMockMode()) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id) ?? null;
    return { product: product as Product | null, isOwner: true };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  const { data: { user } } = await supabase.auth.getUser();

  const isOwner = !!user && product?.builder_id === user.id;

  return { product, isOwner };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (isMockMode()) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) return { title: "Product not found" };
    return { title: `Demo Prep — ${product.name}` };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .single();
  if (!data) return { title: "Product not found" };
  return { title: `Demo Prep — ${data.name}` };
}

const STEPS = [
  {
    number: 1,
    title: "THE HOOK",
    time: "30 sec",
    lines: [
      '"Who here has ever [relatable frustration]?"',
      "State the problem in one sentence anyone can understand.",
      "No jargon. Make them nod.",
    ],
  },
  {
    number: 2,
    title: "WHAT YOU BUILT",
    time: "60 sec",
    lines: [
      "One sentence: what it does + who it's for.",
      "Explain it like you're telling a friend at a coffee shop.",
      "Skip the tech stack. Focus on the outcome.",
    ],
  },
  {
    number: 3,
    title: "SHOW, DON'T TELL",
    time: "3 min",
    lines: [
      "Live demo or walkthrough of the core flow.",
      "Pick ONE use case. Don't show everything.",
      "Narrate what you're doing as you do it.",
      "If something breaks, laugh it off and keep going.",
    ],
  },
  {
    number: 4,
    title: "WHY IT MATTERS",
    time: "60 sec",
    lines: [
      "What's different about your approach?",
      "What did you learn building it?",
      "What surprised you?",
    ],
  },
  {
    number: 5,
    title: "WHAT'S NEXT + ASK",
    time: "90 sec",
    lines: [
      "Where are you taking this?",
      "What feedback do you want from the group?",
      'Be specific: "Is the onboarding clear?" not "Any thoughts?"',
    ],
  },
];


export default async function DemoPrepPage({ params }: Props) {
  const { id } = await params;
  const { product, isOwner } = await getProductForPrep(id);

  if (!product) notFound();
  if (product.demo_type !== "live_demo" && !isMockMode()) {
    redirect(`/p/${id}`);
  }

  const steps = STEPS;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16 sm:px-6">
      {/* Success header */}
      <div className="rounded-2xl border border-border bg-card-bg p-6 text-center">
        <span className="text-4xl">🎤</span>
        <h1 className="mt-3 font-display text-3xl font-black text-ink">
          {isOwner ? "You're in!" : "Demo Prep Guide"}
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          {isOwner
            ? `Here's how to make your ${product.name} demo land with the audience.`
            : `Presentation guide for ${product.name}.`}
        </p>
        <p className="mt-1 font-mono text-xs text-ink-faint">
          ~7 minutes total
        </p>
      </div>

      {/* Structure */}
      <div className="mt-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-ink">
          Your 7-minute structure
        </h2>

        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-xl border border-border bg-card-bg p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-bold text-persimmon">
                  {step.number}.
                </span>
                <h3 className="font-display text-base font-bold text-ink">
                  {step.title}
                </h3>
              </div>
              <span className="shrink-0 rounded-full bg-paper-bg-deep px-2.5 py-0.5 font-mono text-xs text-ink-faint">
                {step.time}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {step.lines.map((line, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed text-ink-muted"
                >
                  <span className="mr-2 text-ink-faint">-</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 rounded-2xl border border-border bg-paper-bg-deep p-5">
        <h3 className="font-display text-base font-bold text-ink">
          Quick tips from round 1
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          <li>
            <span className="font-medium text-ink">Problem first, solution second.</span>{" "}
            If people don&apos;t feel the pain, they won&apos;t care about the fix.
          </li>
          <li>
            <span className="font-medium text-ink">Talk like a human.</span>{" "}
            Drop the jargon. Assume your audience isn&apos;t technical.
          </li>
          <li>
            <span className="font-medium text-ink">One path, not everything.</span>{" "}
            Pick one user journey and show it end to end.
          </li>
          <li>
            <span className="font-medium text-ink">Ask specific questions.</span>{" "}
            &quot;Is the pricing page clear?&quot; beats &quot;Any feedback?&quot;
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/p/${id}`}
          className="flex-1 rounded-xl bg-persimmon px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99]"
        >
          View your project page
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-ink-muted transition-all hover:scale-[1.01] hover:border-border-strong active:scale-[0.99]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
