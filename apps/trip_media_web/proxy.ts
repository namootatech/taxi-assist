import { createServerClient } from "@supabase/ssr"
import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"

const clerkProxy = clerkMiddleware(async (_auth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.next({ request })
  }

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

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isPartnerSetup =
    request.nextUrl.pathname === "/signup" && request.nextUrl.searchParams.get("setup") === "partner"
  const hasInviteToken = request.nextUrl.pathname === "/signup" && request.nextUrl.searchParams.has("invite")
  const isLoginInvite = request.nextUrl.pathname === "/login" && request.nextUrl.searchParams.has("invite")

  if (
    user &&
    ((request.nextUrl.pathname === "/login" && !isLoginInvite) ||
      (request.nextUrl.pathname === "/signup" && !isPartnerSetup && !hasInviteToken))
  ) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  return response
})

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkProxy(request, event)
}

export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
}
