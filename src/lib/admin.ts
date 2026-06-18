import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only admin helpers.
 *
 * Admin authority lives in `profiles.is_admin` (enforced by RLS). To make admin
 * bootstrap reproducible without hand-editing the database, you can list trusted
 * emails in the `ADMIN_EMAILS` env var (comma-separated). When such a user signs
 * in, they are promoted to admin automatically.
 *
 * This file must never be imported by client components — it can read the
 * service role key.
 */

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * Promotes a user to admin when their email is in ADMIN_EMAILS. Uses the service
 * role key (server-only) so it works even before any admin exists. Safe no-op
 * when the allowlist or service role key is not configured.
 */
export async function promoteAdminIfAllowlisted(
  userId: string,
  email: string | null | undefined
): Promise<void> {
  if (!isAllowlistedAdminEmail(email)) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  try {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (profile && !profile.is_admin) {
      await admin.from("profiles").update({ is_admin: true }).eq("id", userId);
    }
  } catch (err) {
    console.error("[admin] promoteAdminIfAllowlisted failed:", err);
  }
}
