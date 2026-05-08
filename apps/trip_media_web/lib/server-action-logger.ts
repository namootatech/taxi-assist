export interface ActionLogContext {
  [key: string]: unknown
}

const normalizeError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { message: String(error ?? "Unknown error") }
  }

  const record = error as Record<string, unknown>

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" || typeof record.status === "string" ? record.status : undefined,
    message: typeof record.message === "string" ? record.message : "Unknown error",
  }
}

export const logActionInfo = (action: string, event: string, context: ActionLogContext = {}) => {
  console.info(`[action:${action}] ${event}`, context)
}

export const logActionWarn = (action: string, event: string, context: ActionLogContext = {}) => {
  console.warn(`[action:${action}] ${event}`, context)
}

export const logActionError = (action: string, event: string, error: unknown, context: ActionLogContext = {}) => {
  console.error(`[action:${action}] ${event}`, {
    ...context,
    error: normalizeError(error),
  })
}
