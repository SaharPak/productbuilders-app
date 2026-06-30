import { NextResponse } from "next/server";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSupabaseEnv } from "@/lib/supabase/env";

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

      const forwardedHost = request.headers.get("x-forwarded-host");
      const host =
        forwardedHost && process.env.NODE_ENV !== "development"
          ? `https://${forwardedHost.split(",")[0].trim()}`
          : origin;
      const redirectTo = `${host}${redirectPath}`;

      const response = NextResponse.redirect(redirectTo);
      for (const { name, value, options } of collectedCookies) {
        response.cookies.set(name, value, options);
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
