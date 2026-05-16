import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { isMockMode, MOCK_PROFILES, MOCK_PRODUCTS } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";
import type { ProductWithCounts, Profile } from "@/types/database";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ handle: string }>;
}

async function getProfileData(handle: string) {
  if (isMockMode()) {
    const profile = MOCK_PROFILES.find((p) => p.handle === handle);
    const products = MOCK_PRODUCTS.filter(
      (p) => {
        const b = typeof p.builder === "string" ? JSON.parse(p.builder) : p.builder;
        return b?.handle === handle;
      }
    );
    return { profile: profile ?? null, products, isOwnProfile: false };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!profile) return { profile: null, products: [], isOwnProfile: false };

  const { data: products } = await supabase
    .from("product_with_counts")
    .select("*")
    .eq("builder_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();

  let productsWithVotes = (products ?? []) as ProductWithCounts[];
  if (user && products && products.length > 0) {
    const { data: userVotes } = await supabase
      .from("votes")
      .select("product_id")
      .eq("user_id", user.id);
    const votedSet = new Set(userVotes?.map((v) => v.product_id));
    productsWithVotes = productsWithVotes.map((p) => ({ ...p, user_has_voted: votedSet.has(p.id) }));
  }

  return { profile, products: productsWithVotes, isOwnProfile: user?.id === profile.id };
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
  const { profile, products, isOwnProfile } = await getProfileData(handle);

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
    </div>
  );
}
