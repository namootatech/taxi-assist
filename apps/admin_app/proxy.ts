import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { hasCapability, type Capability } from "@/lib/permissions"

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
  { prefix: "/creatives", capability: "moderate_creatives" },
  { prefix: "/trip-media/overview", capability: "view_trip_media_overview" },
  { prefix: "/trip-media/advertisers", capability: "view_advertisers" },
  { prefix: "/trip-media/rider-rewards", capability: "view_rider_rewards" },
  { prefix: "/trip-media/fraud", capability: "view_fraud" },
  { prefix: "/trip-media/analytics", capability: "view_trip_media_analytics" },
  { prefix: "/trip-media/reports", capability: "view_reports" },
  { prefix: "/trip-media/settings", capability: "manage_trip_media_settings" },
  { prefix: "/trip-media", capability: "view_trip_media" },
  { prefix: "/support", capability: "view_support" },
  { prefix: "/admins", capability: "manage_admins" },
  { prefix: "/analytics", capability: "view_analytics" },
  { prefix: "/settings", capability: "manage_settings" },
  { prefix: "/audit", capability: "view_audit" },
]

function matchProtectedRoute(pathname: string) {
  return protectedRoutes.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`))
}

const handleProxy = async (request: NextRequest) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return NextResponse.next({ request })

  const response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = request.nextUrl.clone().pathname.startsWith("/login") || request.nextUrl.clone().pathname.startsWith("/register");
  const protectedRoute = matchProtectedRoute(pathname)

  if (!user && protectedRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (!user || !protectedRoute) return response

  const { data: adminProfile, error } = await supabase
    .from("admin_profiles")
    .select("role, disabled_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error || !adminProfile || adminProfile.disabled_at) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("error", "not_admin")
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  if (protectedRoute.capability && !hasCapability(adminProfile.role, protectedRoute.capability)) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.search = "?error=forbidden"
    return NextResponse.redirect(dashboardUrl)
  }

  return response
})

export default handleProxy

export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
}

