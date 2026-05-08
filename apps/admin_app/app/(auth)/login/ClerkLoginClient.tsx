"use client"

import { SignIn, SignedIn, useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

export function ClerkLoginClient() {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  if (!hasClerkKey) {
    return (
      <div className="rounded-2xl border border-token bg-[color:var(--surface-2)] p-4 text-sm">
        Missing <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. Add it to your environment to enable sign-in.
      </div>
    )
  }

  return <ClerkLoginEnabled />
}

function ClerkLoginEnabled() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const next = useMemo(() => {
    const raw = searchParams.get("next") ?? ""
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard"
    return raw
  }, [searchParams])

  const [isExchanging, setIsExchanging] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return
    if (isExchanging) return

    setIsExchanging(true)
    router.push(next)
  }, [isSignedIn, isExchanging, next, router])

  return (
    <>
      <SignIn routing="path" path="/login" signUpUrl="/register" />
      <SignedIn>
        <div className="mt-6 text-sm muted">Setting up your session…</div>
      </SignedIn>
    </>
  )
}

