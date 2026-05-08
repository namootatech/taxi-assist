import * as Sentry from "@sentry/nextjs"

export interface ActionLogContext {
  [key: string]: unknown;
}

const normalizeError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { message: String(error ?? "Unknown error") };
  }

  const record = error as Record<string, unknown>;

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" || typeof record.status === "string" ? record.status : undefined,
    message: typeof record.message === "string" ? record.message : "Unknown error",
  };
};

export const logActionInfo = (action: string, event: string, context: ActionLogContext = {}) => {
  console.info(`[action:${action}] ${event}`, context);
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: "action",
      level: "info",
      message: `${action}:${event}`,
      data: context,
    })
  }
};

export const logActionWarn = (action: string, event: string, context: ActionLogContext = {}) => {
  console.warn(`[action:${action}] ${event}`, context);
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: "action",
      level: "warning",
      message: `${action}:${event}`,
      data: context,
    })
  }
};

export const logActionError = (action: string, event: string, error: unknown, context: ActionLogContext = {}) => {
  console.error(`[action:${action}] ${event}`, {
    ...context,
    error: normalizeError(error),
  });
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag("action", action)
      scope.setTag("event", event)
      scope.setContext("action_context", context)
      Sentry.captureException(error instanceof Error ? error : new Error(normalizeError(error).message))
    })
  }
};
