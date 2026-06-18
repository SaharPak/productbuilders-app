import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { StageDot } from "@/components/stage-dot";
import { StatusBadge } from "@/components/status-badge";
import { isMockMode, MOCK_PROFILES, mockPublicProducts } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";
import type { Product, ProductWithCounts } from "@/types/database";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ handle: string }>;
}

interface ProfileData {
  profile: (typeof MOCK_PROFILES)[number] | null;
  products: ProductWithCounts[];
  ownDrafts: Product[];
  isOwnProfile: boolean;
}

async function getProfileData(handle: string): Promise<ProfileData> {
  if (isMockMode()) {
    const profile = MOCK_PROFILES.find((p) => p.handle === handle) ?? null;
    const products = mockPublicProducts().filter((p) => {
      const b = typeof p.builder === "string" ? JSON.parse(p.builder) : p.builder;
      return b?.handle === handle;
    });
    return { profile, products, ownDrafts: [], isOwnProfile: false };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!profile) {
    return { profile: null, products: [], ownDrafts: [], isOwnProfile: false };
  }

  const { data: products } = await supabase
    .from("product_with_counts")
    .select("*")
    .eq("builder_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  const isOwnProfile = user?.id === profile.id;

  let productsWithVotes = (products ?? []) as ProductWithCounts[];
  if (user && products && products.length > 0) {
    const { data: userVotes } = await supabase
      .from("votes")
      .select("product_id")
      .eq("user_id", user.id);
    const votedSet = new Set(userVotes?.map((v) => v.product_id));
    productsWithVotes = productsWithVotes.map((p) => ({ ...p, user_has_voted: votedSet.has(p.id) }));
  }

  // Owners also see their own not-yet-public submissions.
  let ownDrafts: Product[] = [];
  if (isOwnProfile) {
    const { data: drafts } = await supabase
      .from("products")
      .select("*")
      .eq("builder_id", profile.id)
      .in("status", ["pending", "rejected", "hidden"])
      .order("created_at", { ascending: false });
    ownDrafts = (drafts ?? []) as Product[];
  }

  return { profile, products: productsWithVotes, ownDrafts, isOwnProfile };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  if (isMockMode()) {
    const profile = MOCK_PROFILES.find((p) => p.handle === handle);
    if (!profile) return { title: "Profile not found" };
    return { title: `@${handle} — ${profile.display_name}` };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("display_name").eq("handle", handle).single();
  if (!data) return { title: "Profile not found" };
  return { title: `@${handle} — ${data.display_name}` };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const { profile, products, ownDrafts, isOwnProfile } = await getProfileData(handle);

  if (!profile) notFound();

  const totalUpvotes = products.reduce((sum, p) => sum + (p.vote_count || 0), 0);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-paper-bg-deep text-2xl font-bold text-ink-muted">
          {profile.display_name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-black text-ink">{profile.display_name}</h1>
          <p className="text-sm text-ink-faint">@{profile.handle}</p>
          {profile.bio && <p className="mt-2 text-sm text-ink-muted">{profile.bio}</p>}
        </div>
        {isOwnProfile && (
          <a href="/settings" className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-ink-muted transition-all hover:border-border-strong hover:text-ink">
            Edit profile
          </a>
        )}
      </div>

      <div className="mt-6 flex gap-6">
        <div>
          <p className="font-mono text-xl font-bold text-ink">{products.length}</p>
          <p className="text-xs text-ink-faint">projects</p>
        </div>
        <div>
          <p className="font-mono text-xl font-bold text-ink">{totalUpvotes}</p>
          <p className="text-xs text-ink-faint">total likes</p>
        </div>
        <div>
          <p className="font-mono text-sm text-ink-faint">
            Member {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {isOwnProfile && ownDrafts.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-bold text-ink">
            In review &amp; not public
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Only you can see these. They go public once an admin approves them.
          </p>
          <div className="mt-4 space-y-2">
            {ownDrafts.map((p) => (
              <Link
                key={p.id}
                href={`/p/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card-bg p-4 transition-all hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-ink leading-snug">
                      {p.name}
                    </h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-ink-muted">{p.tagline}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <StageDot stage={p.stage} />
                    <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-ink-faint">
                      {p.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {products.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-bold text-ink">Projects</h2>
          <div className="mt-4 space-y-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      {products.length === 0 && ownDrafts.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="font-display text-lg font-bold text-ink">No projects yet</p>
          <p className="mt-2 text-sm text-ink-muted">
            {isOwnProfile
              ? "Share your first project to get feedback from the community."
              : "This builder hasn't shared anything public yet."}
          </p>
          {isOwnProfile && (
            <Link
              href="/submit"
              className="mt-4 inline-block rounded-full bg-persimmon px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-persimmon-hover"
            >
              Submit a project
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
