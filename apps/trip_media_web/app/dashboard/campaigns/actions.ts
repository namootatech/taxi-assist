"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getPartnerContext } from "@/lib/partner"
import { logActionError, logActionInfo, logActionWarn } from "@/lib/server-action-logger"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const campaignSchema = z.object({
  advertiser: z.string().trim().min(2),
  creative_id: z.string().uuid(),
  schedule_band: z.enum(["peak", "off_peak", "all_day", "night", "all"]),
  max_views: z.coerce.number().int().positive().max(100000),
  reward_per_view: z.coerce.number().min(0).max(100),
})

export async function createCampaign(formData: FormData) {
  logActionInfo("trip_media.campaigns.create", "started")
  const context = await getPartnerContext()

  if (!context) {
    logActionWarn("trip_media.campaigns.create", "missing_partner_context")
    redirect("/signup?setup=partner&next=/dashboard/campaigns")
  }

  const parsed = campaignSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    logActionWarn("trip_media.campaigns.create", "validation_failed", { issues: parsed.error.issues.map((issue) => issue.path.join(".")) })
    redirect("/dashboard/campaigns?error=check_fields")
  }

  if (parsed.data.max_views > context.partner.promotional_credits_balance && context.partner.promotional_credits_balance > 0) {
    logActionWarn("trip_media.campaigns.create", "over_promotional_credit_cap", {
      partnerId: context.partner.id,
      maxViews: parsed.data.max_views,
      credits: context.partner.promotional_credits_balance,
    })
    redirect("/dashboard/campaigns?error=over_cap")
  }

  const supabase = await createSupabaseServerClient()
  const { data: creative } = await supabase
    .from("ad_creatives")
    .select("id, storage_path")
    .eq("id", parsed.data.creative_id)
    .eq("partner_id", context.partner.id)
    .maybeSingle()

  if (!creative) {
    logActionWarn("trip_media.campaigns.create", "creative_missing", { partnerId: context.partner.id, creativeId: parsed.data.creative_id })
    redirect("/dashboard/campaigns?error=creative_missing")
  }

  const { error } = await supabase.from("ad_campaigns").insert({
    advertiser: parsed.data.advertiser,
    partner_id: context.partner.id,
    creative_id: parsed.data.creative_id,
    video_path: creative.storage_path || `partner://${parsed.data.creative_id}`,
    target_json: { schedule_band: parsed.data.schedule_band },
    max_views: parsed.data.max_views,
    impression_cap: parsed.data.max_views,
    reward_per_view: parsed.data.reward_per_view,
    schedule_band: parsed.data.schedule_band,
    status: "PAUSED",
  })

  if (error) {
    logActionError("trip_media.campaigns.create", "insert_failed", error, { partnerId: context.partner.id, creativeId: parsed.data.creative_id })
    redirect("/dashboard/campaigns?error=save_failed")
  }

  logActionInfo("trip_media.campaigns.create", "completed", { partnerId: context.partner.id, creativeId: parsed.data.creative_id })
  revalidatePath("/dashboard/campaigns")
  redirect("/dashboard/campaigns?created=1")
}
