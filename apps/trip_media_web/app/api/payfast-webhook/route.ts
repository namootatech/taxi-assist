import { NextResponse } from "next/server"
import { verifyPayfastSignature } from "@/lib/payfast/signature"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const body = await request.text()
  const fields = Object.fromEntries(new URLSearchParams(body))
  const passphrase = process.env.PAYFAST_PASSPHRASE

  if (!verifyPayfastSignature(fields, passphrase)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 })
  }

  const [partnerId, packageId] = String(fields.m_payment_id || "").split(":")

  if (!partnerId) {
    return NextResponse.json({ ok: false, error: "missing_partner" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const eventId = String(fields.pf_payment_id || fields.token || fields.m_payment_id)
  const paymentStatus = String(fields.payment_status || "").toUpperCase()
  const subscriptionStatus = paymentStatus === "COMPLETE" ? "active" : paymentStatus === "FAILED" ? "past_due" : "trialing"

  const { error: eventError } = await admin.from("partner_billing_events").insert({
    provider: "payfast",
    event_id: eventId,
    type: paymentStatus || "UNKNOWN",
    partner_id: partnerId,
    payload_json: fields,
  })

  if (eventError && !eventError.message.includes("duplicate key")) {
    return NextResponse.json({ ok: false, error: "event_save_failed" }, { status: 500 })
  }

  if (!eventError) {
    await admin
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

  return NextResponse.json({ ok: true })
}
