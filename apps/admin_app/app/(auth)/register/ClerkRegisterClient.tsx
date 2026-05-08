"use client"

import { SignUp, SignedIn, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function ClerkRegisterClient() {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  if (!hasClerkKey) {
    return (
      <div className="rounded-2xl border border-token bg-[color:var(--surface-2)] p-4 text-sm">
        Missing <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. Add it to your environment to enable sign-up.
      </div>
    )
  }

  return <ClerkRegisterEnabled />
}

function ClerkRegisterEnabled() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [isExchanging, setIsExchanging] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return
    if (isExchanging) return

    setIsExchanging(true)
    router.push("/dashboard")
  }, [isSignedIn, isExchanging, router])

  return (
    <>
      <SignUp routing="path" path="/register" signInUrl="/login" />
      <SignedIn>
        <div className="mt-6 text-sm muted">Setting up your session…</div>
      </SignedIn>
    </>
  )
}

