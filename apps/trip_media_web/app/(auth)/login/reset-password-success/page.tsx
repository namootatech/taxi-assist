import Link from "next/link"
import { ResetPasswordSuccessClient } from "./ResetPasswordSuccessClient"

export const dynamic = "force-dynamic"

export default function ResetPasswordSuccessPage() {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-10">
      <section className="panel w-full max-w-md rounded-[1.5rem] p-6">
        <Link href="/" className="focus-ring rounded-lg text-sm font-black uppercase tracking-[0.24em]">
          Trip Media
        </Link>
        <h1 className="mt-8 text-3xl font-black tracking-[-0.04em]">Password updated.</h1>
        <p className="mt-3 leading-7 muted">We’ll sign you in and take you back to your dashboard.</p>
        <ResetPasswordSuccessClient />
        <p className="mt-6 text-sm muted">
          If nothing happens,{" "}
          <Link href="/login" className="focus-ring rounded-lg font-bold text-white underline-offset-4 hover:underline">
            go to sign in
          </Link>
          .
        </p>
      </section>
    </main>
  )
}

