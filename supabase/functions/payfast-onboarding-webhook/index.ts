import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const encodeValue = (value: string) => encodeURIComponent(value.trim()).replace(/%20/g, "+")

async function md5(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest("MD5", bytes)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function verifySignature(fields: Record<string, string>, passphrase?: string) {
  const pairs = Object.entries(fields)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${encodeValue(value)}`)

  if (passphrase) pairs.push(`passphrase=${encodeValue(passphrase)}`)
  return fields.signature?.toLowerCase() === await md5(pairs.join("&"))
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const body = await request.text()
  const fields = Object.fromEntries(new URLSearchParams(body))
  const passphrase = Deno.env.get("PAYFAST_PASSPHRASE")

  if (!(await verifySignature(fields, passphrase))) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 400 })
  }

  const mPaymentId = String(fields.m_payment_id || "")
  const parts = mPaymentId.split(":")
  if (parts[0] !== "onboarding" || parts.length < 3) {
    return Response.json({ ok: false, error: "invalid_payment_ref" }, { status: 400 })
  }

  const paymentId = parts[2]
  const eventId = String(fields.pf_payment_id || fields.m_payment_id)
  const paymentStatus = String(fields.payment_status || "").toUpperCase()
  const amountCents = Math.round(parseFloat(String(fields.amount_gross || fields.amount || "0")) * 100)

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  const { error } = await admin.rpc("driver_confirm_onboarding_payment", {
    p_payment_id: paymentId,
    p_provider_payment_id: eventId,
    p_amount_cents: amountCents,
    p_status: paymentStatus,
  })

  if (error) {
    return Response.json({ ok: false, error: "confirm_failed" }, { status: 500 })
  }

  return Response.json({ ok: true })
})
