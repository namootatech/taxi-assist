import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const token = request.nextUrl.searchParams.get("token") ?? ""

  if (!url || !anonKey) {
    return NextResponse.json(
      { data: null, error: { code: "CONFIG_MISSING", message: "Missing Supabase env vars" } },
      { status: 500 },
    )
  }

  if (!token) {
    return NextResponse.redirect(new URL("/signup?error=missing_invite", request.url))
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url))

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

  const { error } = await supabase.rpc("accept_partner_invite", { p_token: token })
  if (error) {
    return NextResponse.redirect(new URL(`/signup?invite=${encodeURIComponent(token)}&error=${encodeURIComponent(error.message)}`, request.url))
  }

  return response
}

