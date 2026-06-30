import { NextResponse } from "next/server"
import { confirmPayfastPayment } from "@/lib/payfast/confirm-payment"
import { parsePayfastPaymentRef } from "@/lib/payfast/payment-ref"
import { verifyPayfastSignature } from "@/lib/payfast/signature"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const body = await request.text()
  const fields = Object.fromEntries(new URLSearchParams(body))
  const passphrase = process.env.PAYFAST_PASSPHRASE

  if (!verifyPayfastSignature(fields, passphrase)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 })
  }

  const parsed = parsePayfastPaymentRef(String(fields.m_payment_id || ""))
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "invalid_payment_ref" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const eventId = String(fields.pf_payment_id || fields.m_payment_id)
  const paymentStatus = String(fields.payment_status || "").toUpperCase()

  const { data: campaign } = await admin
    .from("ad_campaigns")
    .select("partner_id")
    .eq("campaign_id", parsed.campaignId)
    .maybeSingle()

  const { error: eventError } = await admin.from("partner_billing_events").insert({
    provider: "payfast",
    event_id: eventId,
    type: paymentStatus || "UNKNOWN",
    partner_id: campaign?.partner_id ?? null,
    payload_json: fields,
  })

  if (eventError && !eventError.message.includes("duplicate key")) {
    return NextResponse.json({ ok: false, error: "event_save_failed" }, { status: 500 })
  }

  if (eventError) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const { data, error } = await confirmPayfastPayment(admin, parsed, fields)

  if (error) {
    const errorCode = parsed.kind === "campaign" ? "confirm_failed" : "topup_confirm_failed"
    return NextResponse.json({ ok: false, error: errorCode }, { status: 500 })
  }

  return NextResponse.json({ ok: true, result: data })
}
