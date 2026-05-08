import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Webhook } from "https://esm.sh/svix@1.56.0"

type ClerkWebhookEvent = {
  data: ClerkWebhookUser | ClerkWebhookUserDeleted
  object: "event"
  type: "user.created" | "user.updated" | "user.deleted"
}

type ClerkWebhookUser = {
  id: string
  email_addresses?: Array<{ email_address?: string; id?: string }>
  primary_email_address_id?: string | null
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  image_url?: string | null
  username?: string | null
  public_metadata?: Record<string, unknown> | null
  unsafe_metadata?: Record<string, unknown> | null
  phone_numbers?: Array<{ phone_number?: string; id?: string }>
  primary_phone_number_id?: string | null
}

type ClerkWebhookUserDeleted = {
  id?: string
  deleted?: boolean
}

type VerificationResult =
  | { ok: true; event: ClerkWebhookEvent }
  | { ok: false; status: number; message: string }

function getEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function getPrimaryEmail(user: ClerkWebhookUser) {
  const addresses = user.email_addresses ?? []
  if (addresses.length === 0) return null

  const primaryId = user.primary_email_address_id
  if (!primaryId) return addresses[0]?.email_address ?? null

  return addresses.find((a) => a.id === primaryId)?.email_address ?? addresses[0]?.email_address ?? null
}

function getPrimaryPhone(user: ClerkWebhookUser) {
  const phones = user.phone_numbers ?? []
  if (phones.length === 0) return null

  const primaryId = user.primary_phone_number_id
  if (!primaryId) return phones[0]?.phone_number ?? null

  return phones.find((p) => p.id === primaryId)?.phone_number ?? phones[0]?.phone_number ?? null
}

function getFullName(user: ClerkWebhookUser) {
  if (user.full_name && user.full_name.trim().length > 0) return user.full_name.trim()

  const first = user.first_name?.trim() ?? ""
  const last = user.last_name?.trim() ?? ""
  const joined = `${first} ${last}`.trim()
  return joined.length > 0 ? joined : null
}

async function verifyClerkWebhook(request: Request): Promise<VerificationResult> {
  const secret = Deno.env.get("CLERK_WEBHOOK_SECRET")
  if (!secret) return { ok: false, status: 500, message: "Missing CLERK_WEBHOOK_SECRET" }

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, status: 400, message: "Missing Svix headers" }
  }

  const payload = await request.text()

  try {
    const webhook = new Webhook(secret)
    const event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent

    if (event?.object !== "event") return { ok: false, status: 400, message: "Invalid event payload" }

    if (event.type !== "user.created" && event.type !== "user.updated" && event.type !== "user.deleted") {
      return { ok: false, status: 200, message: "Ignored event" }
    }

    return { ok: true, event }
  } catch {
    return { ok: false, status: 400, message: "Webhook verification failed" }
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const verified = await verifyClerkWebhook(request)
  if (!verified.ok) return Response.json({ ok: false, error: verified.message }, { status: verified.status })

  const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"))
  const event = verified.event

  if (event.type === "user.deleted") {
    const id = (event.data as ClerkWebhookUserDeleted).id
    if (!id) return Response.json({ ok: true, ignored: true })

    const { error } = await supabase.from("clerk_profiles").delete().eq("clerk_user_id", id)
    if (error) return Response.json({ ok: false, error: "delete_failed" }, { status: 500 })

    return Response.json({ ok: true })
  }

  const user = event.data as ClerkWebhookUser
  const clerkUserId = user.id
  if (!clerkUserId) return Response.json({ ok: false, error: "missing_user_id" }, { status: 400 })

  const unsafeMetadata = user.unsafe_metadata ?? {}
  const publicMetadata = user.public_metadata ?? {}

  const userTypeRaw = unsafeMetadata && typeof unsafeMetadata === "object" ? (unsafeMetadata as Record<string, unknown>).user_type : null
  const appSourceRaw = unsafeMetadata && typeof unsafeMetadata === "object" ? (unsafeMetadata as Record<string, unknown>).app_source : null

  const userType = typeof userTypeRaw === "string" ? userTypeRaw : null
  const appSource = typeof appSourceRaw === "string" ? appSourceRaw : null

  const email = getPrimaryEmail(user)
  const fullName = getFullName(user)
  const cellphone = getPrimaryPhone(user)

  const { error } = await supabase.from("clerk_profiles").upsert(
    {
      clerk_user_id: clerkUserId,
      email,
      full_name: fullName,
      image_url: user.image_url ?? null,
      username: user.username ?? null,
      cellphone,
      public_metadata: publicMetadata,
      unsafe_metadata: unsafeMetadata,
      user_type: userType,
      app_source: appSource,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  )

  if (error) return Response.json({ ok: false, error: "upsert_failed" }, { status: 500 })

  return Response.json({ ok: true })
})

