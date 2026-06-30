import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login", "/onboarding", "/auth"];

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value as string)
          );
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedRoutes = ["/submit", "/settings", "/admin"];
  const isProtected =
    protectedRoutes.some((route) => pathname.startsWith(route)) ||
    /^\/p\/[^/]+\/edit/.test(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return redirectWithCookies(url, supabaseResponse);
  }

  const isPublicAuthPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (user && !isPublicAuthPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.handle) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}

/**
 * Issue a NextResponse.redirect while forwarding any auth cookies that
 * `setAll` attached to `supabaseResponse` during this request. Without this,
 * a session refresh inside `getUser()` would be silently discarded on any
 * redirect (e.g. anonymous user hits /settings, or signed-in user without a
 * handle visits /), causing the very next request to repeat the refresh —
 * and in the worst case, the user appears to "lose" their session.
 */
function redirectWithCookies(url: URL, source: NextResponse): NextResponse {
  const response = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}
