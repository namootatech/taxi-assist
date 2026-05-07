import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isPublicRoute = request.nextUrl.pathname === "/landing";
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon") ||
    request.nextUrl.pathname.startsWith("/icons");

  if (!user && !isAuthRoute && !isPublicRoute && !isPublicAsset) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  if (user && !isAuthRoute && !isPublicRoute && !isPublicAsset) {
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
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

