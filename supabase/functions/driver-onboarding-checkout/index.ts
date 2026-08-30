import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const encodeValue = (value: string) => encodeURIComponent(value.trim()).replace(/%20/g, "+")

async function md5(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest("MD5", bytes)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function buildSignature(fields: Record<string, string>, passphrase?: string) {
  const pairs = Object.entries(fields)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${encodeValue(value)}`)

  if (passphrase) pairs.push(`passphrase=${encodeValue(passphrase)}`)
  return md5(pairs.join("&"))
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const authHeader = request.headers.get("Authorization")
  if (!authHeader) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const vehicleId = String(body.vehicle_id ?? "")
  if (!vehicleId) {
    return Response.json({ ok: false, error: "vehicle_id_required" }, { status: 400 })
  }

  const { data: prep, error: prepError } = await supabase.rpc("driver_prepare_onboarding_payment", {
    p_vehicle_id: vehicleId,
  })

  if (prepError || !prep?.ok) {
    return Response.json({ ok: false, error: prep?.error ?? "prepare_failed" }, { status: 400 })
  }

  const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")
  const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY")
  const passphrase = Deno.env.get("PAYFAST_PASSPHRASE")
  const siteUrl = Deno.env.get("DRIVER_APP_RETURN_URL") ?? Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? ""
  const payfastUrl = Deno.env.get("PAYFAST_CHECKOUT_URL") ?? "https://sandbox.payfast.co.za/eng/process"

  if (!merchantId || !merchantKey) {
    return Response.json({ ok: false, error: "payfast_not_configured" }, { status: 503 })
  }

  const payment = prep as { m_payment_id: string; amount_cents: number; payment_id: string }
  const fields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${siteUrl}?onboarding=return&vehicle=${vehicleId}&payment=${payment.payment_id}`,
    cancel_url: `${siteUrl}?onboarding=cancelled&vehicle=${vehicleId}`,
    notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payfast-onboarding-webhook`,
    m_payment_id: payment.m_payment_id,
    amount: (payment.amount_cents / 100).toFixed(2),
    item_name: "Trip vehicle onboarding fee",
  }

  const signature = await buildSignature(fields, passphrase)
  const checkoutUrl = `${payfastUrl}?${new URLSearchParams({ ...fields, signature }).toString()}`

  return Response.json({ ok: true, checkout_url: checkoutUrl, payment_id: payment.payment_id })
})
