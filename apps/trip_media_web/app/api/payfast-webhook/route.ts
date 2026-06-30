import { NextResponse } from "next/server"
import { verifyPayfastSignature } from "@/lib/payfast/signature"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

function parsePaymentId(mPaymentId: string) {
  const parts = mPaymentId.split(":")
  if (parts[0] === "campaign" && parts.length >= 3) {
    return { kind: "campaign" as const, campaignId: parts[1], paymentId: parts[2] }
  }
  if (parts[0] === "topup" && parts.length >= 3) {
    return { kind: "topup" as const, campaignId: parts[1], paymentId: parts[2] }
  }
  return null
}

export async function POST(request: Request) {
  const body = await request.text()
  const fields = Object.fromEntries(new URLSearchParams(body))
  const passphrase = process.env.PAYFAST_PASSPHRASE

  if (!verifyPayfastSignature(fields, passphrase)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 })
  }

  const parsed = parsePaymentId(String(fields.m_payment_id || ""))
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "invalid_payment_ref" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const eventId = String(fields.pf_payment_id || fields.m_payment_id)
  const paymentStatus = String(fields.payment_status || "").toUpperCase()
  const amountCents = Math.round(parseFloat(String(fields.amount_gross || fields.amount || "0")) * 100)

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

  if (parsed.kind === "campaign") {
    const { data, error } = await admin.rpc("partner_confirm_campaign_payment", {
      p_campaign_id: parsed.campaignId,
      p_payment_id: parsed.paymentId,
      p_provider_payment_id: eventId,
      p_amount_cents: amountCents,
      p_status: paymentStatus,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: "confirm_failed" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, result: data })
  }

  const { data, error } = await admin.rpc("partner_confirm_impression_topup", {
    p_campaign_id: parsed.campaignId,
    p_payment_id: parsed.paymentId,
    p_provider_payment_id: eventId,
    p_amount_cents: amountCents,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: "topup_confirm_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, result: data })
}
