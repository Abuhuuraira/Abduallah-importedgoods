import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (formerly "middleware") — runs before every /admin request.
 *
 * 1. Refreshes the Supabase auth session cookies.
 * 2. Sends signed-out visitors to /admin/login.
 *
 * This is only the FIRST line of defense. Every admin page and Server Action
 * also verifies the user AND their admin role on the server (src/lib/auth.ts),
 * and the database enforces Row Level Security.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage)\/v1$/i, "")
    .replace(/\/+$/, "");
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();

  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");

  if (!url || !key) {
    if (isLoginPage) return response;
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);

  if (!isSignedIn && !isLoginPage) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    // Keep any cookie changes (e.g. a cleared expired session)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
