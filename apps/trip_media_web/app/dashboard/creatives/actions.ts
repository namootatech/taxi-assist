"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getPartnerContext } from "@/lib/partner"
import { logActionError, logActionInfo, logActionWarn } from "@/lib/server-action-logger"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const creativeSchema = z.object({
  title: z.string().trim().min(2),
  cta_url: z.string().trim().url().optional().or(z.literal("")),
  mime_type: z.enum(["image/png", "image/jpeg", "video/mp4"]),
})

export async function createCreative(formData: FormData) {
  logActionInfo("trip_media.creatives.create", "started")
  const context = await getPartnerContext()

  if (!context) {
    logActionWarn("trip_media.creatives.create", "missing_partner_context")
    redirect("/signup?setup=partner&next=/dashboard/creatives")
  }

  const parsed = creativeSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    logActionWarn("trip_media.creatives.create", "validation_failed", { issues: parsed.error.issues.map((issue) => issue.path.join(".")) })
    redirect("/dashboard/creatives?error=check_fields")
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("ad_creatives").insert({
    partner_id: context.partner.id,
    title: parsed.data.title,
    cta_url: parsed.data.cta_url || null,
    mime_type: parsed.data.mime_type,
    status: "draft",
  })

  if (error) {
    logActionError("trip_media.creatives.create", "insert_failed", error, { partnerId: context.partner.id })
    redirect("/dashboard/creatives?error=save_failed")
  }

  logActionInfo("trip_media.creatives.create", "completed", { partnerId: context.partner.id })
  revalidatePath("/dashboard/creatives")
  redirect("/dashboard/creatives?created=1")
}

export async function submitCreativeForReview(formData: FormData) {
  logActionInfo("trip_media.creatives.submit", "started")
  const context = await getPartnerContext()

  if (!context) {
    logActionWarn("trip_media.creatives.submit", "missing_partner_context")
    redirect("/signup?setup=partner&next=/dashboard/creatives")
  }

  const creativeId = String(formData.get("creativeId") ?? "")
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("ad_creatives")
    .update({ status: "pending_review" })
    .eq("id", creativeId)
    .eq("partner_id", context.partner.id)

  if (error) {
    logActionError("trip_media.creatives.submit", "update_failed", error, { partnerId: context.partner.id, creativeId })
    redirect("/dashboard/creatives?error=submit_failed")
  }

  logActionInfo("trip_media.creatives.submit", "completed", { partnerId: context.partner.id, creativeId })
  revalidatePath("/dashboard/creatives")
}
