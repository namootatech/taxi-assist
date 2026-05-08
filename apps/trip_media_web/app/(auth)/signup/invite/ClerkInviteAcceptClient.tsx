"use client"

import { SignIn, SignedIn, useAuth } from "@clerk/nextjs"
import { useMemo, useState, useEffect } from "react"

export function ClerkInviteAcceptClient({ token }: { token: string }) {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { isSignedIn } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const next = useMemo(() => {
    const params = new URLSearchParams()
    params.set("token", token)
    return `/api/partner/accept-invite?${params.toString()}`
  }, [token])

  useEffect(() => {
    if (!isSignedIn) return
    if (isRedirecting) return
    setIsRedirecting(true)
    window.location.href = next
  }, [isSignedIn, isRedirecting, next])

  return (
    <>
      <div className="mt-6">
        {hasClerkKey ? (
          <SignIn routing="path" path="/signup" signUpUrl={`/signup?invite=${encodeURIComponent(token)}`} />
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4 text-sm text-white/80">
            Missing <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. Add it to your environment to accept invites.
          </div>
        )}
      </div>
      <SignedIn>
        <div className="mt-6 text-sm muted">Accepting invite…</div>
      </SignedIn>
    </>
  )
}

