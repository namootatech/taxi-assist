import { escapeAttribute, escapeHtml } from "./wrapper.ts"

export const supportedTemplates = ["payment-failed"] as const

export type SupportedTemplate = (typeof supportedTemplates)[number]

export interface TemplateRenderResult {
  bodyHtml: string
  previewText: string
}

interface PaymentFailedTemplateData {
  amountDue: string
  billingUrl: string | null
  dueDate: string
  partnerName: string
  paymentReference: string | null
  planName: string
  supportEmail: string | null
}

export function isSupportedTemplate(value: string): value is SupportedTemplate {
  return supportedTemplates.includes(value as SupportedTemplate)
}

export function renderTemplate({
  data,
  template,
}: {
  data: Record<string, unknown>
  template: SupportedTemplate
}): TemplateRenderResult {
  if (template === "payment-failed") {
    return renderPaymentFailedTemplate(data)
  }

  return renderPaymentFailedTemplate(data)
}

function renderPaymentFailedTemplate(data: Record<string, unknown>): TemplateRenderResult {
  const details = parsePaymentFailedData(data)
  const safePartnerName = escapeHtml(details.partnerName)
  const safePlanName = escapeHtml(details.planName)
  const safeAmountDue = escapeHtml(details.amountDue)
  const safeDueDate = escapeHtml(details.dueDate)
  const safeReference = details.paymentReference ? escapeHtml(details.paymentReference) : null
  const safeSupportEmail = details.supportEmail ? escapeHtml(details.supportEmail) : null
  const billingCallToAction = details.billingUrl
    ? `<p style="margin:24px 0 8px 0;">
        <a href="${escapeAttribute(details.billingUrl)}" style="display:inline-block;background:#fe0000;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:999px;">
          Update billing details
        </a>
      </p>`
    : ""

  const bodyHtml = `<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.2;color:#122033;">Payment issue detected</h1>
<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#22364e;">
  Hi ${safePartnerName}, we could not process your latest ${safePlanName} payment.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid #e4e8ef;border-radius:12px;margin:0 0 16px 0;">
  <tr>
    <td style="padding:12px 14px;border-bottom:1px solid #e4e8ef;font-size:13px;color:#4c5f78;">Amount due</td>
    <td style="padding:12px 14px;border-bottom:1px solid #e4e8ef;text-align:right;font-size:14px;font-weight:600;color:#122033;">${safeAmountDue}</td>
  </tr>
  <tr>
    <td style="padding:12px 14px;border-bottom:1px solid #e4e8ef;font-size:13px;color:#4c5f78;">Due date</td>
    <td style="padding:12px 14px;border-bottom:1px solid #e4e8ef;text-align:right;font-size:14px;font-weight:600;color:#122033;">${safeDueDate}</td>
  </tr>
  ${safeReference ? `<tr>
    <td style="padding:12px 14px;font-size:13px;color:#4c5f78;">Reference</td>
    <td style="padding:12px 14px;text-align:right;font-size:13px;color:#22364e;">${safeReference}</td>
  </tr>` : ""}
</table>
<p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#22364e;">
  To avoid campaign pauses and delivery interruptions, update your billing details as soon as possible.
</p>
${billingCallToAction}
<p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#4c5f78;">
  ${safeSupportEmail ? `Need help? Reply to this email or contact ${safeSupportEmail}.` : "Need help? Reply to this email and our support team will assist you."}
</p>`

  return {
    previewText: `Payment failed for ${details.planName}. Update billing details to keep campaigns active.`,
    bodyHtml,
  }
}

function parsePaymentFailedData(data: Record<string, unknown>): PaymentFailedTemplateData {
  return {
    partnerName: normalizeNonEmptyString(data.partnerName) ?? "there",
    planName: normalizeNonEmptyString(data.planName) ?? "subscription plan",
    amountDue: normalizeNonEmptyString(data.amountDue) ?? "Outstanding balance",
    dueDate: normalizeNonEmptyString(data.dueDate) ?? "Immediately",
    paymentReference: normalizeNonEmptyString(data.paymentReference),
    supportEmail: normalizeNonEmptyString(data.supportEmail),
    billingUrl: parseHttpsUrl(data.billingUrl),
  }
}

function normalizeNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseHttpsUrl(value: unknown) {
  const rawUrl = normalizeNonEmptyString(value)
  if (!rawUrl) {
    return null
  }

  try {
    const url = new URL(rawUrl)
    if (url.protocol !== "https:") {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}
