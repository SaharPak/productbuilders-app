import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { VoteButton } from "@/components/vote-button";
import { StageDot } from "@/components/stage-dot";
import { CommentSection } from "@/components/comment-section";
import { isMockMode, MOCK_PRODUCTS, MOCK_COMMENTS } from "@/lib/mock-data";
import type { ProductWithCounts } from "@/types/database";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

async function getProduct(id: string) {
  if (isMockMode()) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    const comments = MOCK_COMMENTS[id] ?? [];
    return { product: product ?? null, userHasVoted: product?.user_has_voted ?? false, isOwner: true, comments };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("product_with_counts")
    .select("*")
    .eq("id", id)
    .single();

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let userHasVoted = false;
  if (user) {
    const { data: vote } = await supabase
      .from("votes")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .maybeSingle();
    userHasVoted = !!vote;
  }

  const isOwner = !!user && product?.builder_id === user.id;

  return { product, userHasVoted, isOwner, comments: [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (isMockMode()) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) return { title: "Product not found" };
    return { title: product.name, description: product.tagline };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("name, tagline").eq("id", id).single();
  if (!data) return { title: "Product not found" };
  return { title: data.name, description: data.tagline };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const { product, userHasVoted, isOwner, comments } = await getProduct(id);

  if (!product) notFound();

  const typedProduct = product as ProductWithCounts;
  const builder =
    typeof typedProduct.builder === "string"
      ? JSON.parse(typedProduct.builder)
      : typedProduct.builder;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">
              {typedProduct.name}
            </h1>
            {typedProduct.demo_type === "live_demo" && (
              <span className="shrink-0 rounded-full bg-persimmon-light px-3 py-1 text-xs font-semibold text-persimmon">
                🎤 Live demo
                {typedProduct.demo_language && (
                  <> · {typedProduct.demo_language === "farsi" ? "فارسی" : "EN"}</>
                )}
              </span>
            )}
          </div>
          <p className="mt-2 text-lg text-ink-muted">{typedProduct.tagline}</p>
        </div>
        <VoteButton
          productId={typedProduct.id}
          initialCount={typedProduct.vote_count}
          initialVoted={userHasVoted}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StageDot stage={typedProduct.stage} />
        <span className="rounded-md border border-border px-2 py-0.5 font-mono text-xs text-ink-faint">
          {typedProduct.category}
        </span>
        {builder?.handle && (
          <Link
            href={`/u/${builder.handle}`}
            className="text-sm text-ink-muted transition-colors hover:text-persimmon"
          >
            by <span className="font-medium">@{builder.handle}</span>
          </Link>
        )}
        {typedProduct.url && (
          <a
            href={typedProduct.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-muted transition-all hover:border-border-strong hover:text-ink"
          >
            Visit →
          </a>
        )}
      </div>

      {isOwner && typedProduct.demo_type === "live_demo" && (
        <Link
          href={`/p/${typedProduct.id}/prep`}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-persimmon/30 bg-persimmon-light px-4 py-2 text-sm font-medium text-persimmon transition-all hover:scale-[1.02] hover:border-persimmon/50"
        >
          🎤 Demo prep guide
        </Link>
      )}

      {isOwner && (
        <Link
          href={`/p/${typedProduct.id}/edit`}
          className="mt-4 ml-2 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-muted transition-all hover:scale-[1.02] hover:border-border-strong hover:text-ink"
        >
          Edit project
        </Link>
      )}

      {typedProduct.image_url && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <Image
            src={typedProduct.image_url}
            alt={typedProduct.name}
            width={800}
            height={400}
            className="w-full object-cover"
          />
        </div>
      )}

      {(typedProduct.problem || typedProduct.audience) && (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card-bg p-5">
          {typedProduct.problem && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Problem it solves
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {typedProduct.problem}
              </p>
            </div>
          )}
          {typedProduct.audience && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Built for
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {typedProduct.audience}
              </p>
            </div>
          )}
        </div>
      )}

      {typedProduct.description && (
        <div className="mt-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {typedProduct.description}
          </p>
        </div>
      )}

      <hr className="my-8 border-border" />

      <CommentSection productId={typedProduct.id} mockComments={comments} />
    </div>
  );
}
