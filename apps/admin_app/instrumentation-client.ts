import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "",

  // Keep PII off by default; opt-in only when you need it.
  sendDefaultPii: process.env.NEXT_PUBLIC_SENTRY_SEND_PII === "true",

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,

  replaysSessionSampleRate: process.env.NODE_ENV === "development" ? 0.2 : 0.05,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [Sentry.replayIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

