"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useClerk } from "@clerk/nextjs"

export function ResetPasswordSuccessClient() {
  const searchParams = useSearchParams()
  const { setActive } = useClerk()
  const [status, setStatus] = useState<ResetPasswordStatus>("activating")

  const createdSessionId = useMemo(() => {
    const raw = searchParams.get("createdSessionId")
    return raw && raw.trim().length > 0 ? raw : null
  }, [searchParams])

  useEffect(() => {
    if (!createdSessionId) {
      setStatus("missing-session")
      return
    }

    let isCancelled = false

    Promise.resolve()
      .then(async () => {
        setStatus("activating")
        await setActive({ session: createdSessionId })
        if (isCancelled) return
        setStatus("exchanging")
        window.location.href = "/dashboard"
      })
      .catch(() => {
        if (isCancelled) return
        setStatus("failed")
      })

    return () => {
      isCancelled = true
    }
  }, [createdSessionId, setActive])

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/5 p-4">
      {status === "missing-session" ? (
        <>
          <p className="text-sm text-white/90">Your password was updated, but we could not confirm your session.</p>
          <p className="mt-2 text-sm muted">
            Please{" "}
            <Link href="/login" className="font-bold text-white underline-offset-4 hover:underline">
              sign in
            </Link>{" "}
            to continue.
          </p>
        </>
      ) : status === "failed" ? (
        <>
          <p className="text-sm text-white/90">We could not finish signing you in.</p>
          <p className="mt-2 text-sm muted">
            Please{" "}
            <Link href="/login" className="font-bold text-white underline-offset-4 hover:underline">
              sign in again
            </Link>{" "}
            to continue.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-white/90">
            {status === "activating" ? "Confirming your updated login…" : "Setting up your dashboard session…"}
          </p>
          <p className="mt-2 text-sm muted">You’ll be redirected automatically.</p>
        </>
      )}
    </div>
  )
}

type ResetPasswordStatus = "activating" | "exchanging" | "missing-session" | "failed"

