'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPartnerContext } from '@/lib/partner';
import { canManageCampaigns } from '@/lib/permissions';
import {
  logActionError,
  logActionInfo,
  logActionWarn,
} from '@/lib/server-action-logger';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export interface CampaignActionResult {
  success: boolean;
  message?: string;
  campaignId?: string;
}

const createSchema = z.object({
  advertiser: z.string().trim().min(2),
  creative_id: z.string().uuid(),
  schedule_band: z.enum(['peak', 'off_peak', 'all_day', 'night', 'all']),
  max_views: z.coerce.number().int().positive().max(1_000_000),
  reward_per_view: z.coerce.number().min(0).max(100).default(0),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
});

const idSchema = z.object({ campaignId: z.string().uuid() });

export async function createCampaign(
  input: unknown,
): Promise<CampaignActionResult> {
  logActionInfo('trip_media.campaigns.create', 'started');
  const context = await getPartnerContext();

  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canManageCampaigns(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can create campaigns.',
    };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    logActionWarn('trip_media.campaigns.create', 'validation_failed', {
      issues: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Check the campaign fields.',
    };
  }

  const supabase = await createClerkSupabaseServerClient();
  const { data: creative } = await supabase
    .from('ad_creatives')
    .select('id, status, storage_path')
    .eq('id', parsed.data.creative_id)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (!creative) {
    return { success: false, message: 'Pick one of your creatives.' };
  }

  const credits = context.partner.promotional_credits_balance;
  if (credits > 0 && parsed.data.max_views > credits) {
    return {
      success: false,
      message: `View cap (${parsed.data.max_views}) exceeds your remaining credits (${credits}). Lower the cap or top up.`,
    };
  }

  const { data: inserted, error } = await supabase
    .from('ad_campaigns')
    .insert({
      advertiser: parsed.data.advertiser,
      partner_id: context.partner.id,
      creative_id: parsed.data.creative_id,
      video_path:
        creative.storage_path || `partner://${parsed.data.creative_id}`,
      target_json: { schedule_band: parsed.data.schedule_band },
      max_views: parsed.data.max_views,
      impression_cap: parsed.data.max_views,
      reward_per_view: parsed.data.reward_per_view,
      schedule_band: parsed.data.schedule_band,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      status: 'DRAFT',
    })
    .select('campaign_id')
    .maybeSingle();

  if (error || !inserted) {
    logActionError('trip_media.campaigns.create', 'insert_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not save that campaign.' };
  }

  logActionInfo('trip_media.campaigns.create', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/campaigns');
  return { success: true, campaignId: inserted.campaign_id };
}

async function updateCampaignStatus(
  context: NonNullable<Awaited<ReturnType<typeof getPartnerContext>>>,
  campaignId: string,
  next: string,
  extra: Record<string, unknown> = {},
) {
  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase
    .from('ad_campaigns')
    .update({ status: next, updated_at: new Date().toISOString(), ...extra })
    .eq('campaign_id', campaignId)
    .eq('partner_id', context.partner.id);

  return error;
}

export async function submitCampaignForReview(
  input: unknown,
): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canManageCampaigns(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can submit campaigns.',
    };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid campaign reference.' };

  const supabase = await createClerkSupabaseServerClient();
  const { data: campaign } = await supabase
    .from('ad_campaigns')
    .select(
      'status, creative:ad_creatives!ad_campaigns_creative_id_fkey(status)',
    )
    .eq('campaign_id', parsed.data.campaignId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (!campaign) return { success: false, message: 'Campaign not found.' };
  if (!['DRAFT', 'REJECTED'].includes(campaign.status)) {
    return {
      success: false,
      message: 'Only drafts or rejected campaigns can be submitted.',
    };
  }

  const creative = Array.isArray(campaign.creative)
    ? campaign.creative[0]
    : campaign.creative;
  if (!creative || creative.status !== 'approved') {
    return {
      success: false,
      message:
        'Linked creative must be approved before this campaign can be submitted.',
    };
  }

  const error = await updateCampaignStatus(
    context,
    parsed.data.campaignId,
    'PENDING_REVIEW',
    {
      submitted_at: new Date().toISOString(),
    },
  );
  if (error) {
    logActionError('trip_media.campaigns.submit', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not submit that campaign.' };
  }

  revalidatePath('/dashboard/campaigns');
  return { success: true };
}

export async function pauseCampaign(
  input: unknown,
): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canManageCampaigns(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can pause campaigns.',
    };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid campaign reference.' };

  const error = await updateCampaignStatus(
    context,
    parsed.data.campaignId,
    'PAUSED',
  );
  if (error) {
    logActionError('trip_media.campaigns.pause', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not pause that campaign.' };
  }

  revalidatePath('/dashboard/campaigns');
  return { success: true };
}

export async function resumeCampaign(
  input: unknown,
): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canManageCampaigns(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can resume campaigns.',
    };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid campaign reference.' };

  const supabase = await createClerkSupabaseServerClient();
  const { data: subscription } = await supabase
    .from('partner_subscriptions')
    .select('status')
    .eq('partner_id', context.partner.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription?.status === 'past_due') {
    return {
      success: false,
      message: 'Resolve the past-due subscription before resuming campaigns.',
    };
  }

  const error = await updateCampaignStatus(
    context,
    parsed.data.campaignId,
    'ACTIVE',
    {
      activated_at: new Date().toISOString(),
    },
  );
  if (error) {
    logActionError('trip_media.campaigns.resume', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not resume that campaign.' };
  }

  revalidatePath('/dashboard/campaigns');
  return { success: true };
}

export async function endCampaign(
  input: unknown,
): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canManageCampaigns(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can end campaigns.',
    };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid campaign reference.' };

  const error = await updateCampaignStatus(
    context,
    parsed.data.campaignId,
    'COMPLETED',
  );
  if (error) {
    logActionError('trip_media.campaigns.end', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not end that campaign.' };
  }

  revalidatePath('/dashboard/campaigns');
  return { success: true };
}
