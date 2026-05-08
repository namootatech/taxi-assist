import "server-only"

import { createClient } from "@supabase/supabase-js"

interface SendEmailInput {
  data: Record<string, unknown>
  requestId?: string
  subject: string
  template: string
  to: string | string[]
}

interface SendEmailSuccessData {
  id?: string
  provider: string
}

interface SendEmailFunctionResponse {
  data: SendEmailSuccessData | null
  error: {
    code: string
    message: string
  } | null
}

export async function sendEmail(input: SendEmailInput) {
  const { internalSecret, supabaseAnonKey, supabaseUrl } = getEmailEnv()

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase.functions.invoke("send-email", {
    body: input,
    headers: {
      "x-internal-email-secret": internalSecret,
    },
  })

  if (error) {
    throw new Error(`Failed to invoke send-email function: ${error.message}`)
  }

  const parsed = data as SendEmailFunctionResponse | null
  if (!parsed) {
    throw new Error("send-email returned an empty response.")
  }

  if (parsed.error || !parsed.data) {
    throw new Error(parsed.error?.message || "send-email failed with an unknown error.")
  }

  return parsed.data
}

function getEmailEnv() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const internalSecret = process.env.EMAIL_INTERNAL_SECRET

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  if (!internalSecret) {
    throw new Error("Missing EMAIL_INTERNAL_SECRET")
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    internalSecret,
  }
}
