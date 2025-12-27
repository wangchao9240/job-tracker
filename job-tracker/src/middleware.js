import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware to:
 * 1. Refresh/rehydrate cookie session
 * 2. Redirect unauthenticated users to /sign-in for protected routes
 */
export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const isPublicRoute =
    pathname === "/sign-in" ||
    pathname === "/callback" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") || // static files (favicon, etc.)
    pathname === "/favicon.ico";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail safe: if env is missing, do not allow access to protected routes.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      JSON.stringify({
        level: "error",
        code: "SUPABASE_ENV_MISSING",
        missingUrl: !supabaseUrl,
        missingAnonKey: !supabaseAnonKey,
      })
    );

    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for cookie-based auth)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to sign-in
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from sign-in page
  if (user && pathname === "/sign-in") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
