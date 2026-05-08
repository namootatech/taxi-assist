import { createConfiguredProviders, sendWithProviders } from "./providers.ts"
import { isSupportedTemplate, renderTemplate, supportedTemplates, type SupportedTemplate } from "./templates.ts"
import { renderBrandedWrapper } from "./wrapper.ts"

interface SendEmailPayload {
  data: Record<string, unknown>
  requestId?: string
  subject: string
  template: SupportedTemplate
  to: string[]
}

const maxRecipients = 25
const maxSubjectLength = 180
const maxDataPayloadBytes = 24_000

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST requests are supported.")
  }

  const expectedSecret = Deno.env.get("EMAIL_INTERNAL_SECRET")
  if (!expectedSecret) {
    return errorResponse(500, "CONFIG_MISSING", "Missing EMAIL_INTERNAL_SECRET.")
  }

  const providedSecret = request.headers.get("x-internal-email-secret")
  if (!providedSecret || providedSecret !== expectedSecret) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid email service secret.")
  }

  const body = await request.json().catch(() => null)
  const parsedPayload = parsePayload(body)
  if (!parsedPayload.ok) {
    return errorResponse(400, parsedPayload.error.code, parsedPayload.error.message)
  }

  const emailFrom = Deno.env.get("EMAIL_FROM")?.trim()
  if (!emailFrom) {
    return errorResponse(500, "CONFIG_MISSING", "Missing EMAIL_FROM.")
  }

  let providers
  try {
    providers = createConfiguredProviders()
  } catch (error) {
    return errorResponse(
      500,
      "PROVIDER_CONFIG_INVALID",
      error instanceof Error ? error.message : "Invalid email provider configuration.",
    )
  }

  const templateContent = renderTemplate({
    data: parsedPayload.value.data,
    template: parsedPayload.value.template,
  })

  const html = renderBrandedWrapper({
    brandName: Deno.env.get("EMAIL_BRAND_NAME")?.trim() || "Taxi Assist Media",
    contentHtml: templateContent.bodyHtml,
    previewText: templateContent.previewText,
    subject: parsedPayload.value.subject,
    supportEmail: Deno.env.get("EMAIL_SUPPORT_EMAIL")?.trim() || "support@taxiassist.co.za",
  })

  const providerResult = await sendWithProviders({
    providers,
    sendInput: {
      from: emailFrom,
      html,
      requestId: parsedPayload.value.requestId,
      subject: parsedPayload.value.subject,
      to: parsedPayload.value.to,
    },
  })

  if (!providerResult.ok) {
    console.error("[send-email] provider_send_failed", providerResult)
    return errorResponse(
      502,
      providerResult.errorCode || "PROVIDER_SEND_FAILED",
      providerResult.errorMessage || "Failed to send email with configured providers.",
    )
  }

  return Response.json({
    data: {
      id: providerResult.messageId,
      provider: providerResult.provider,
    },
    error: null,
  })
})

function parsePayload(payload: unknown): {
  ok: true
  value: SendEmailPayload
} | {
  ok: false
  error: {
    code: string
    message: string
  }
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payloadError("INVALID_PAYLOAD", "Request body must be a JSON object.")
  }

  const record = payload as Record<string, unknown>
  const recipients = normalizeRecipients(record.to)
  if (!recipients) {
    return payloadError("INVALID_RECIPIENTS", `Field "to" must be a valid email or list of emails (max ${maxRecipients}).`)
  }

  const subject = normalizeSubject(record.subject)
  if (!subject) {
    return payloadError("INVALID_SUBJECT", `Field "subject" is required and must be at most ${maxSubjectLength} characters.`)
  }

  if (typeof record.template !== "string" || !isSupportedTemplate(record.template.trim())) {
    return payloadError("INVALID_TEMPLATE", `Field "template" must be one of: ${supportedTemplates.join(", ")}.`)
  }
  const template = record.template.trim() as SupportedTemplate

  if (!record.data || typeof record.data !== "object" || Array.isArray(record.data)) {
    return payloadError("INVALID_DATA", "Field \"data\" must be an object.")
  }

  const data = record.data as Record<string, unknown>
  const dataBytes = new TextEncoder().encode(JSON.stringify(data)).length
  if (dataBytes > maxDataPayloadBytes) {
    return payloadError("DATA_TOO_LARGE", `Field "data" exceeds ${maxDataPayloadBytes} bytes.`)
  }

  const requestId = normalizeRequestId(record.requestId)
  if (record.requestId !== undefined && !requestId) {
    return payloadError("INVALID_REQUEST_ID", "Field \"requestId\" must be a non-empty string up to 120 characters.")
  }

  return {
    ok: true,
    value: {
      to: recipients,
      subject,
      template,
      data,
      requestId,
    },
  }
}

function normalizeRecipients(value: unknown) {
  const rawRecipients = Array.isArray(value) ? value : [value]
  if (rawRecipients.length === 0 || rawRecipients.length > maxRecipients) {
    return null
  }

  const normalized = rawRecipients
    .map((recipient) => typeof recipient === "string" ? recipient.trim().toLowerCase() : "")
    .filter((recipient) => recipient.length > 0)

  if (normalized.length === 0 || normalized.length > maxRecipients) {
    return null
  }

  const hasInvalidEmail = normalized.some((recipient) => !isValidEmail(recipient))
  if (hasInvalidEmail) {
    return null
  }

  return [...new Set(normalized)]
}

function normalizeSubject(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const subject = value.trim()
  if (subject.length === 0 || subject.length > maxSubjectLength) {
    return null
  }

  return subject
}

function normalizeRequestId(value: unknown) {
  if (typeof value !== "string") {
    return undefined
  }

  const requestId = value.trim()
  if (requestId.length === 0 || requestId.length > 120) {
    return null
  }

  return requestId
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    {
      data: null,
      error: { code, message },
    },
    { status },
  )
}

function payloadError(code: string, message: string) {
  return {
    ok: false as const,
    error: { code, message },
  }
}
