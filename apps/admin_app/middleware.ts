import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasCapability, type Capability } from "@/lib/permissions";

const protectedRoutes: Array<{ prefix: string; capability?: Capability }> = [
  { prefix: "/dashboard" },
  { prefix: "/drivers", capability: "view_drivers" },
  { prefix: "/riders", capability: "view_riders" },
  { prefix: "/vehicles", capability: "view_vehicles" },
  { prefix: "/verification", capability: "view_verification" },
  { prefix: "/trips", capability: "view_trips" },
  { prefix: "/payments", capability: "view_payments" },
  { prefix: "/wallets", capability: "view_wallets" },
  { prefix: "/ratings", capability: "view_ratings" },
  { prefix: "/ads", capability: "view_ads" },
  { prefix: "/support", capability: "view_support" },
  { prefix: "/admins", capability: "manage_admins" },
  { prefix: "/analytics", capability: "view_analytics" },
  { prefix: "/settings", capability: "manage_settings" },
  { prefix: "/audit", capability: "view_audit" },
];

const matchProtectedRoute = (pathname: string) =>
  protectedRoutes.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`));

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicAsset =
    pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/icons");

  const protectedRoute = matchProtectedRoute(pathname);

  if (!user && protectedRoute && !isPublicAsset) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/dashboard";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  if (user && protectedRoute && !isPublicAsset) {
    const { data: adminProfile, error } = await supabase
      .from("admin_profiles")
      .select("role, disabled_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !adminProfile || adminProfile.disabled_at) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "not_admin");
      return NextResponse.redirect(loginUrl);
    }

    if (
      protectedRoute.capability &&
      !hasCapability(adminProfile.role, protectedRoute.capability)
    ) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "?error=forbidden";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

