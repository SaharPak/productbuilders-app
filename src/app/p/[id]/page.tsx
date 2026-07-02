import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { VoteButton } from "@/components/vote-button";
import { StageDot } from "@/components/stage-dot";
import { CommentSection } from "@/components/comment-section";
import { isMockMode, MOCK_PRODUCTS, MOCK_COMMENTS } from "@/lib/mock-data";
import type { Comment, ProductBuilder, ProductWithCounts } from "@/types/database";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

interface ProductPageData {
  product: ProductWithCounts | null;
  userHasVoted: boolean;
  isOwner: boolean;
  comments: Comment[];
}

async function getProduct(id: string): Promise<ProductPageData> {
  if (isMockMode()) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    const comments = MOCK_COMMENTS[id] ?? [];
    return { product: product ?? null, userHasVoted: product?.user_has_voted ?? false, isOwner: true, comments };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data } = await supabase
    .from("product_with_counts")
    .select("*")
    .eq("id", id)
    .single();
  const product = data as ProductWithCounts | null;

  const { data: { user } } = await supabase.auth.getUser();

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

function parseBuilder(builder: ProductWithCounts["builder"]): ProductBuilder | null {
  if (typeof builder !== "string") return builder;

  try {
    return JSON.parse(builder) as ProductBuilder;
  } catch {
    return null;
  }
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

  const builder = parseBuilder(product.builder);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">
              {product.name}
            </h1>
            {product.demo_type === "live_demo" && (
              <span className="shrink-0 rounded-full bg-persimmon-light px-3 py-1 text-xs font-semibold text-persimmon">
                🎤 Live demo
                {product.demo_language && (
                  <> · {product.demo_language === "farsi" ? "فارسی" : "EN"}</>
                )}
              </span>
            )}
          </div>
          <p className="mt-2 text-lg text-ink-muted">{product.tagline}</p>
        </div>
        <VoteButton
          productId={product.id}
          productName={product.name}
          initialCount={product.vote_count}
          initialVoted={userHasVoted}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StageDot stage={product.stage} />
        <span className="rounded-md border border-border px-2 py-0.5 font-mono text-xs text-ink-faint">
          {product.category}
        </span>
        {builder?.handle && (
          <Link
            href={`/u/${builder.handle}`}
            className="text-sm text-ink-muted transition-colors hover:text-persimmon"
          >
            by <span className="font-medium">@{builder.handle}</span>
          </Link>
        )}
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-muted transition-all hover:border-border-strong hover:text-ink"
          >
            Visit →
          </a>
        )}
      </div>

      {isOwner && product.demo_type === "live_demo" && (
        <Link
          href={`/p/${product.id}/prep`}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-persimmon/30 bg-persimmon-light px-4 py-2 text-sm font-medium text-persimmon transition-all hover:scale-[1.02] hover:border-persimmon/50"
        >
          🎤 Demo prep guide
        </Link>
      )}

      {isOwner && (
        <Link
          href={`/p/${product.id}/edit`}
          className="mt-4 ml-2 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-muted transition-all hover:scale-[1.02] hover:border-border-strong hover:text-ink"
        >
          Edit project
        </Link>
      )}

      {product.image_url && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <Image
            src={product.image_url}
            alt={product.name}
            width={800}
            height={400}
            className="w-full object-cover"
          />
        </div>
      )}

      {(product.problem || product.audience) && (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card-bg p-5">
          {product.problem && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Problem it solves
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {product.problem}
              </p>
            </div>
          )}
          {product.audience && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Built for
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {product.audience}
              </p>
            </div>
          )}
        </div>
      )}

      {product.description && (
        <div className="mt-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {product.description}
          </p>
        </div>
      )}

      <hr className="my-8 border-border" />

      <CommentSection productId={product.id} mockComments={comments} />
    </div>
  );
}
