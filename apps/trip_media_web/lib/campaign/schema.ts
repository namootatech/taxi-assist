import { z } from "zod"

export const campaignDraftSchema = z
  .object({
    campaign_id: z.string().uuid().optional(),
    advertiser: z.string().trim().min(2, "Add a campaign name."),
    company_name: z.string().trim().min(2, "Add your company name."),
    package_id: z.string().uuid("Select a package."),
    impressions: z.coerce.number().int().min(1000, "Minimum 1,000 impressions.").optional(),
    creative_id: z.string().uuid().optional(),
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().optional(),
    destination_type: z.enum(["website", "whatsapp"]).optional(),
    destination_value: z.string().optional(),
    campaign_notes: z.string().optional(),
    custom_requirements: z.string().optional(),
  })
  .refine(
    (v) => {
      if (!v.destination_type && !v.destination_value) return true
      if (v.destination_type === "website") {
        try {
          new URL(v.destination_value ?? "")
          return true
        } catch {
          return false
        }
      }
      if (v.destination_type === "whatsapp") {
        return /^\+?[0-9]{10,15}$/.test((v.destination_value ?? "").replace(/\s/g, ""))
      }
      return true
    },
    { path: ["destination_value"], message: "Enter a valid website URL or WhatsApp number." },
  )
  .refine(
    (v) => {
      if (!v.start_date || !v.end_date) return true
      return v.start_date <= v.end_date
    },
    { path: ["end_date"], message: "End date must be on or after start date." },
  )

export type CampaignDraftInput = z.infer<typeof campaignDraftSchema>
