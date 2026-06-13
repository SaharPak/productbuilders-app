import { NextResponse } from "next/server";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/";
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

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(request.headers.get("Cookie") ?? "");
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              collectedCookies.push({ name, value, options });
            });
          },
        },
      }
    );

    const { data, error } =
      await supabase.auth.exchangeCodeForSession(code);

    console.log(
      "[auth/callback] exchange result:",
      error ? `error=${error.message}` : "ok",
      `cookies collected: ${collectedCookies.length}`,
      `cookie names: [${collectedCookies.map((c) => c.name).join(", ")}]`
    );

    if (!error && data.session) {
      const user = data.session.user;
      let redirectTo = `${origin}${redirect}`;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("handle")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.handle) {
          redirectTo = `${origin}/onboarding`;
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      if (forwardedHost && process.env.NODE_ENV !== "development") {
        redirectTo = `https://${forwardedHost}${redirect}`;
      }

      const response = NextResponse.redirect(redirectTo);
      for (const { name, value, options } of collectedCookies) {
        response.cookies.set(name, value, options);
      }

      console.log(
        "[auth/callback] redirect to:",
        redirectTo,
        `Set-Cookie count: ${response.headers.getSetCookie().length}`
      );
      return response;
    }

    console.error(
      "[auth/callback] Code exchange failed:",
      error?.message ?? "no session returned"
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
