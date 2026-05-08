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

  if (passphrase) {
    pairs.push(`passphrase=${encodeValue(passphrase)}`)
  }

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

  const [partnerId, packageId] = String(fields.m_payment_id || "").split(":")
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const eventId = String(fields.pf_payment_id || fields.token || fields.m_payment_id)
  const paymentStatus = String(fields.payment_status || "").toUpperCase()
  const subscriptionStatus = paymentStatus === "COMPLETE" ? "active" : paymentStatus === "FAILED" ? "past_due" : "trialing"

  const { error } = await supabase.from("partner_billing_events").insert({
    provider: "payfast",
    event_id: eventId,
    type: paymentStatus || "UNKNOWN",
    partner_id: partnerId,
    payload_json: fields,
  })

  if (!error) {
    await supabase
      .from("partner_subscriptions")
      .update({
        status: subscriptionStatus,
        provider_subscription_id: String(fields.token || fields.pf_payment_id || ""),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("partner_id", partnerId)
      .eq("package_id", packageId)
  }

  return Response.json({ ok: true })
})
