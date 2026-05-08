import { NextResponse, type NextRequest } from "next/server"

import { sendEmail } from "@/lib/email/send-email"

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    )
  }

  const expectedSecret = process.env.EMAIL_INTERNAL_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      { data: null, error: { code: "CONFIG_MISSING", message: "Missing EMAIL_INTERNAL_SECRET" } },
      { status: 500 },
    )
  }

  const providedSecret = request.headers.get("x-internal-email-secret")
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Invalid secret" } },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const recipient = readRecipient(body) || process.env.EMAIL_SMOKE_TO
  if (!recipient) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_RECIPIENT", message: "Provide `to` in body or set EMAIL_SMOKE_TO." } },
      { status: 400 },
    )
  }

  try {
    const result = await sendEmail({
      to: recipient,
      subject: "Trip Media email smoke test",
      template: "payment-failed",
      requestId: `smoke-${Date.now()}`,
      data: {
        partnerName: "Smoke Test Partner",
        planName: "Growth Plan",
        amountDue: "R 1,299.00",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        paymentReference: `SMOKE-${Date.now()}`,
        supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@taxiassist.co.za",
        billingUrl: process.env.EMAIL_SMOKE_BILLING_URL || "https://trip.sa/dashboard/billing",
      },
    })

    return NextResponse.json({ data: result, error: null })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "EMAIL_SEND_FAILED",
          message: error instanceof Error ? error.message : "Unknown email smoke test error",
        },
      },
      { status: 502 },
    )
  }
}

function readRecipient(value: unknown) {
  if (!value || typeof value !== "object") {
    return null
  }

  const toValue = (value as Record<string, unknown>).to
  if (typeof toValue !== "string") {
    return null
  }

  const normalized = toValue.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}
