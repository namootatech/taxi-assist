const resendApiUrl = "https://api.resend.com/emails"

export interface ProviderSendInput {
  from: string
  html: string
  requestId?: string
  subject: string
  to: string[]
}

export interface ProviderSendResult {
  errorCode?: string
  errorMessage?: string
  messageId?: string
  ok: boolean
  provider: string
  retryable?: boolean
  status?: number
}

interface EmailProvider {
  name: string
  sendEmail: (input: ProviderSendInput) => Promise<ProviderSendResult>
}

interface SendWithProvidersInput {
  maxAttemptsPerProvider?: number
  providers: EmailProvider[]
  sendInput: ProviderSendInput
}

export function createConfiguredProviders() {
  const configuredOrder = Deno.env.get("EMAIL_PROVIDER_ORDER")?.trim() || "resend"
  const providerNames = [...new Set(configuredOrder.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean))]
  const providers: EmailProvider[] = []

  for (const providerName of providerNames) {
    if (providerName === "resend") {
      providers.push(createResendProvider())
      continue
    }

    console.warn(`[send-email] Unsupported provider configured: ${providerName}`)
  }

  if (providers.length === 0) {
    throw new Error("No supported email providers are configured. Set EMAIL_PROVIDER_ORDER=resend and RESEND_API_KEY.")
  }

  return providers
}

export async function sendWithProviders({
  maxAttemptsPerProvider = 2,
  providers,
  sendInput,
}: SendWithProvidersInput): Promise<ProviderSendResult> {
  let lastFailure: ProviderSendResult | null = null

  for (const provider of providers) {
    const result = await sendWithRetry({
      maxAttempts: maxAttemptsPerProvider,
      provider,
      sendInput,
    })

    if (result.ok) {
      return result
    }

    lastFailure = result
  }

  return lastFailure ?? {
    ok: false,
    provider: "unknown",
    errorCode: "PROVIDER_UNAVAILABLE",
    errorMessage: "No email provider could send this message.",
  }
}

async function sendWithRetry({
  maxAttempts,
  provider,
  sendInput,
}: {
  maxAttempts: number
  provider: EmailProvider
  sendInput: ProviderSendInput
}) {
  let latestResult: ProviderSendResult = {
    ok: false,
    provider: provider.name,
    errorCode: "SEND_FAILED",
    errorMessage: "Email send failed.",
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    latestResult = await provider.sendEmail(sendInput)
    if (latestResult.ok) {
      return latestResult
    }

    const shouldRetry = Boolean(latestResult.retryable) && attempt < maxAttempts
    if (!shouldRetry) {
      return latestResult
    }
  }

  return latestResult
}

function createResendProvider(): EmailProvider {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim()

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY for Resend provider")
  }

  return {
    name: "resend",
    sendEmail: async (input) => {
      try {
        const response = await fetch(resendApiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(input.requestId ? { "Idempotency-Key": input.requestId } : {}),
          },
          body: JSON.stringify({
            from: input.from,
            to: input.to,
            subject: input.subject,
            html: input.html,
          }),
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          const errorMessage = parseResendErrorMessage(payload) || `Resend returned ${response.status}`
          return {
            ok: false,
            provider: "resend",
            status: response.status,
            retryable: isTransientStatus(response.status),
            errorCode: "RESEND_SEND_FAILED",
            errorMessage,
          }
        }

        const messageId = parseResendMessageId(payload)
        return {
          ok: true,
          provider: "resend",
          messageId,
        }
      } catch (error) {
        return {
          ok: false,
          provider: "resend",
          retryable: true,
          errorCode: "RESEND_NETWORK_ERROR",
          errorMessage: error instanceof Error ? error.message : "Unknown network error while calling Resend.",
        }
      }
    },
  }
}

function parseResendMessageId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined
  }

  const value = (payload as Record<string, unknown>).id
  return typeof value === "string" ? value : undefined
}

function parseResendErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const record = payload as Record<string, unknown>

  if (typeof record.message === "string" && record.message.trim().length > 0) {
    return record.message
  }

  if (record.error && typeof record.error === "object") {
    const nestedMessage = (record.error as Record<string, unknown>).message
    if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
      return nestedMessage
    }
  }

  return null
}

function isTransientStatus(status: number) {
  if (status === 408 || status === 425 || status === 429) {
    return true
  }

  return status >= 500
}
