import { createSupabaseServerClient } from "@/lib/supabase/server"

export interface PartnerContext {
  partner: {
    id: string
    name: string
    status: string
    trial_ends_at: string | null
    promotional_credits_balance: number
  }
  member: {
    role: string
  }
}

export async function getPartnerContext(): Promise<PartnerContext | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: member } = await supabase
    .from("partner_members")
    .select("role, partner:media_partners(id, name, status, trial_ends_at, promotional_credits_balance)")
    .eq("user_id", user.id)
    .not("joined_at", "is", null)
    .maybeSingle()

  if (!member?.partner || Array.isArray(member.partner)) {
    return null
  }

  return {
    partner: member.partner,
    member: {
      role: member.role,
    },
  }
}
