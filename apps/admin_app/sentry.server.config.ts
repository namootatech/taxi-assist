import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",

  sendDefaultPii: process.env.SENTRY_SEND_PII === "true",
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,
  includeLocalVariables: process.env.NODE_ENV === "development",

  enableLogs: true,
})

