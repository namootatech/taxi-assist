"use server"

import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { logActionError, logActionInfo, logActionWarn } from "@/lib/server-action-logger"

export interface LeadFormState {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string>
}

const leadSchema = z.object({
  name: z.string().trim().min(2, "Add your name so we know who to contact."),
  email: z.string().trim().email("Add a valid email address."),
  phone: z.string().trim().max(40).optional(),
  topic: z.enum(["rider", "driver", "partner", "press", "support"]),
  message: z.string().trim().min(8, "Tell us a little more so we can help."),
  consent: z.literal("on", {
    error: "Please confirm we can contact you about this request.",
  }),
  website: z.string().trim().max(0, "Something went wrong. Please try again."),
  utm_source: z.string().trim().optional(),
  utm_medium: z.string().trim().optional(),
  utm_campaign: z.string().trim().optional(),
})

const leadBuckets = new Map<string, { count: number; resetAt: number }>()

const isRateLimited = (bucketKey: string) => {
  const now = Date.now()
  const current = leadBuckets.get(bucketKey)

  if (!current || current.resetAt < now) {
    leadBuckets.set(bucketKey, { count: 1, resetAt: now + 60_000 })
    return false
  }

  current.count += 1
  return current.count > 5
}

const persistLead = async (lead: z.infer<typeof leadSchema>) => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    logActionWarn("trip_website.leads.submit", "supabase_credentials_missing", { topic: lead.topic })
    return
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { error } = await supabase.from("marketing_leads").insert({
    source: `${lead.topic}_interest`,
    name: lead.name,
    email: lead.email,
    phone: lead.phone || null,
    message: lead.message,
    metadata: {
      topic: lead.topic,
      utm_source: lead.utm_source || null,
      utm_medium: lead.utm_medium || null,
      utm_campaign: lead.utm_campaign || null,
    },
  })

  if (error) {
    logActionError("trip_website.leads.submit", "insert_failed", error, { topic: lead.topic })
    throw new Error(error.message)
  }
}

export async function submitLeadForm(_state: LeadFormState, formData: FormData): Promise<LeadFormState> {
  logActionInfo("trip_website.leads.submit", "started")
  const parsed = leadSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    logActionWarn("trip_website.leads.submit", "validation_failed", { issues: parsed.error.issues.map((issue) => issue.path.join(".")) })
    const fieldErrors = parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
      const field = String(issue.path[0] ?? "form")
      acc[field] = issue.message
      return acc
    }, {})

    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
    }
  }

  if (isRateLimited(parsed.data.email.toLowerCase())) {
    logActionWarn("trip_website.leads.submit", "rate_limited", { topic: parsed.data.topic })
    return {
      ok: false,
      message: "Too many attempts. Please wait a minute, then try again.",
    }
  }

  try {
    await persistLead(parsed.data)
  } catch (error) {
    logActionError("trip_website.leads.submit", "persist_failed", error, { topic: parsed.data.topic })
    return {
      ok: false,
      message: "We could not save your request right now. Please try again or email us directly.",
    }
  }

  logActionInfo("trip_website.leads.submit", "completed", { topic: parsed.data.topic })
  return {
    ok: true,
    message: "Thanks. We’ll get back to you with a clear next step.",
  }
}
