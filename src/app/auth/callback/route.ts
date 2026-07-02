import { NextResponse } from "next/server";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Pick a trusted origin for the post-login redirect.
 *
 * Priority order:
 *   1. NEXT_PUBLIC_SITE_URL (owner-configured, treated as authoritative).
 *   2. Request origin in development (always http://localhost:<port>).
 *   3. Request origin in production (a sane fallback; the request URL on
 *      Cloudflare Pages is the external URL the browser sent).
 *
 * We deliberately do NOT trust x-forwarded-host. Cloudflare sets it to the
 * external host, but attackers can also set it on forged requests. The only
 * safe source of the production host is a value the owner pinned in env,
 * which is why NEXT_PUBLIC_SITE_URL takes priority.
 */
function getSafeRedirectOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      const u = new URL(siteUrl);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return u.origin;
      }
    } catch {
      // Invalid NEXT_PUBLIC_SITE_URL — fall through.
    }
  }

  if (process.env.NODE_ENV === "development") {
    return requestOrigin;
  }

  return requestOrigin;
}

/**
 * One-shot warning if NEXT_PUBLIC_SITE_URL is missing in production. Owner
 * should set this to e.g. https://productbuilders.app so the post-login
 * redirect host is deterministic and not request-shape-dependent.
 */
let warnedMissingSiteUrl = false;
function warnMissingSiteUrlOnce() {
  if (warnedMissingSiteUrl) return;
  if (process.env.NODE_ENV === "development") return;
  if (process.env.NEXT_PUBLIC_SITE_URL) return;
  console.warn(
    "[auth/callback] NEXT_PUBLIC_SITE_URL is not set in production. " +
      "Falling back to the request origin for the post-login redirect host. " +
      "Set NEXT_PUBLIC_SITE_URL to a stable production origin (e.g. https://productbuilders.app) " +
      "to avoid surprises behind proxies."
  );
  warnedMissingSiteUrl = true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = safeRedirectPath(searchParams.get("redirect"));
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    console.error(
      "[auth/callback] Provider error:",
      errorParam,
      errorDescription
    );
    return NextResponse.redirect(`${origin}/login?error=${errorParam}`);
  }

  if (code) {
    const collectedCookies: {
      name: string;
      value: string;
      options: CookieOptions;
    }[] = [];

    const { url, anonKey } = getSupabaseEnv();

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
            (cookie) => ({ name: cookie.name, value: cookie.value ?? "" })
          );
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            collectedCookies.push({ name, value, options });
          });
        },
      },
    });

    const { data, error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(
        "[auth/callback] Code exchange failed:",
        error.message,
        "status:",
        error.status
      );
    }

    if (!error && data.session) {
      const user = data.session.user;
      let redirectPath = redirect;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("handle")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.handle) {
          redirectPath = "/onboarding";
        }
      }

      warnMissingSiteUrlOnce();
      const safeOrigin = getSafeRedirectOrigin(request);
      const redirectTo = `${safeOrigin}${redirectPath}`;

      const response = NextResponse.redirect(redirectTo);
      for (const { name, value, options } of collectedCookies) {
        response.cookies.set(name, value, options);
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}