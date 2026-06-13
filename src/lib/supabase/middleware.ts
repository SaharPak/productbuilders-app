import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  let setAllCalled = false;
  let setAllCookieNames: string[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          setAllCalled = true;
          setAllCookieNames = cookiesToSet.map(
            (c) => `${c.name}=${c.value ? "set" : "CLEAR(maxAge=0)"}`
          );
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
    }
  );

  const authCookieNames = request.cookies
    .getAll()
    .filter((c) => c.name.includes("auth-token"))
    .map((c) => c.name);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(
    `[proxy] ${pathname} | cookies: [${authCookieNames.join(", ")}] | user: ${user?.id ?? "none"} | setAll: ${setAllCalled ? `YES [${setAllCookieNames.join(", ")}]` : "no"}`
  );

  const protectedRoutes = ["/submit", "/settings", "/admin"];
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  ) || /^\/p\/[^/]+\/edit/.test(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
