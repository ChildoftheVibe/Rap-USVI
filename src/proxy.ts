import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/adminAllowlist";

/**
 * Gatekeeper for the admin backend. Refreshes the Supabase session cookie on
 * every /admin request and checks the signed-in user against the admin
 * allowlist. Route handlers and Server Components under /admin still re-check
 * authorization themselves — this is the first line of defense, not the only
 * one.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/admin/");

  // Being signed in is not the same as being an admin: Supabase projects
  // accept self-service sign-ups by default, and the project URL and anon key
  // both ship in the client bundle. Someone authenticated but not on the
  // allowlist is treated exactly like a signed-out visitor — except that we
  // never bounce them to /admin, which would loop against the redirect below.
  const isAdmin = !!user && isAdminEmail(user.email);

  if (!isAdmin && isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin && !isLoginPage) {
    const loginUrl = new URL("/admin/login", request.url);
    if (user) loginUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
