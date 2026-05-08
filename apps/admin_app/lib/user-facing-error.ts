/**
 * Plain-language errors for the admin console. Operators still deserve clarity —
 * never raw stack traces or opaque Postgres codes as the only line.
 */
export function userFacingError(error: unknown): string {
  if (error == null) return "Something went wrong. Try again."

  // Supabase/PostgREST errors are often plain objects
  if (typeof error === "object") {
    const anyErr = error as Record<string, unknown>
    const message = typeof anyErr["message"] === "string" ? anyErr["message"].trim() : ""
    const details = typeof anyErr["details"] === "string" ? anyErr["details"].trim() : ""
    const hint = typeof anyErr["hint"] === "string" ? anyErr["hint"].trim() : ""

    const combined = [message, details, hint].filter(Boolean).join(" — ")
    if (combined) return combined
  }

  const msg = error instanceof Error ? error.message : typeof error === "string" ? error : String(error)
  if (!msg.trim()) return "Something went wrong. Try again."
  const lower = msg.toLowerCase();
  if (lower.includes("schema cache") || lower.includes("could not find the '")) {
    return "Profile update failed due to a system configuration issue. Please notify the dev team."
  }
  if (
    lower.includes("fetch") ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("load failed")
  ) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (lower.includes("timeout")) {
    return "That took too long. Try again in a moment.";
  }
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("wrong password")
  ) {
    return "Couldn't sign in. Check your email and password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email, then try again.";
  }
  if (
    lower.includes("jwt") ||
    lower.includes("session") ||
    lower.includes("refresh token")
  ) {
    return "Your session expired. Sign in again.";
  }
  if (
    lower.includes("permission denied") ||
    lower.includes("rls") ||
    lower.includes("row-level security")
  ) {
    return "You don't have permission for this action. Ask a Super Admin.";
  }

  // If we don't recognize it, return the message we have (admins need actionable errors).
  // Avoid returning likely stack traces.
  if (msg.length <= 240 && !msg.includes("\n") && !msg.includes(" at ")) return msg

  return "Something went wrong. Try again."
}
