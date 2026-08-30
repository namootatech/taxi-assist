'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { campaignDraftSchema } from '@/lib/campaign/schema';
import { getPartnerContext } from '@/lib/partner';
import { canManageCampaigns } from '@/lib/permissions';
import { buildBillingReturnUrl } from '@/lib/payfast/payment-ref';
import { buildPayfastSignature } from '@/lib/payfast/signature';
import {
  logActionError,
  logActionInfo,
  logActionWarn,
} from '@/lib/server-action-logger';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface CampaignActionResult {
  success: boolean;
  message?: string;
  campaignId?: string;
  pricing?: Record<string, unknown>;
}

const idSchema = z.object({ campaignId: z.string().uuid() });

function payfastConfig() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const payfastUrl =
    process.env.PAYFAST_CHECKOUT_URL ||
    'https://sandbox.payfast.co.za/eng/process';
  return { merchantId, merchantKey, passphrase, siteUrl, payfastUrl };
}

export async function saveCampaignDraft(
  input: unknown,
): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return { success: false, message: 'Open the dashboard from a partner workspace first.' };
  if (!canManageCampaigns(context.member.role))
    return { success: false, message: 'Only owners, admins, and operators can create campaigns.' };

  const parsed = campaignDraftSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the campaign fields.' };

  const supabase = await createSupabaseServerClient();

  const { data: pkg } = await supabase
    .from('ad_packages')
    .select('package_kind')
    .eq('id', parsed.data.package_id)
    .maybeSingle();

  const isSubscription = pkg?.package_kind === 'subscription';

  const { data, error } = isSubscription
    ? await supabase.rpc('partner_save_subscription_campaign_draft', {
        p_campaign_id: parsed.data.campaign_id ?? null,
        p_partner_id: context.partner.id,
        p_advertiser: parsed.data.advertiser,
        p_company_name: parsed.data.company_name,
        p_package_id: parsed.data.package_id,
        p_creative_id: parsed.data.creative_id ?? null,
        p_start_date: parsed.data.start_date,
        p_end_date: parsed.data.end_date || null,
        p_destination_type: parsed.data.destination_type ?? null,
        p_destination_value: parsed.data.destination_value ?? null,
        p_campaign_notes: parsed.data.campaign_notes ?? null,
        p_custom_requirements: parsed.data.custom_requirements ?? null,
      })
    : await supabase.rpc('partner_save_campaign_draft', {
        p_campaign_id: parsed.data.campaign_id ?? null,
        p_partner_id: context.partner.id,
        p_advertiser: parsed.data.advertiser,
        p_company_name: parsed.data.company_name,
        p_package_id: parsed.data.package_id,
        p_impressions: parsed.data.impressions ?? 1000,
        p_creative_id: parsed.data.creative_id ?? null,
        p_start_date: parsed.data.start_date,
        p_end_date: parsed.data.end_date || null,
        p_destination_type: parsed.data.destination_type ?? null,
        p_destination_value: parsed.data.destination_value ?? null,
        p_campaign_notes: parsed.data.campaign_notes ?? null,
        p_custom_requirements: parsed.data.custom_requirements ?? null,
      });

  if (error) {
    logActionError('trip_media.campaigns.save_draft', 'rpc_failed', error);
    return { success: false, message: 'Could not save that campaign draft.' };
  }

  const result = data as { ok?: boolean; error?: string; campaign_id?: string; pricing?: Record<string, unknown> };
  if (!result?.ok)
    return { success: false, message: result?.error ?? 'Could not save draft.' };

  revalidatePath('/dashboard/campaigns');
  return { success: true, campaignId: result.campaign_id, pricing: result.pricing };
}

export async function initiateCampaignPayment(campaignId: string) {
  const context = await getPartnerContext();
  if (!context) redirect('/signup?setup=partner&next=/dashboard/campaigns');

  const { merchantId, merchantKey, passphrase, siteUrl, payfastUrl } = payfastConfig();
  if (!merchantId || !merchantKey)
    redirect(`/dashboard/campaigns/${campaignId}?error=payfast_not_ready`);

  const supabase = await createSupabaseServerClient();

  const { data: campaign } = await supabase
    .from('ad_campaigns')
    .select('package_id, package:ad_packages(package_kind, name)')
    .eq('campaign_id', campaignId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  const pkg = Array.isArray(campaign?.package) ? campaign.package[0] : campaign?.package;
  const isSubscription = pkg?.package_kind === 'subscription';

  const { data, error } = isSubscription
    ? await supabase.rpc('partner_prepare_starter_subscription_payment', {
        p_campaign_id: campaignId,
        p_partner_id: context.partner.id,
      })
    : await supabase.rpc('partner_prepare_campaign_payment', {
        p_campaign_id: campaignId,
        p_partner_id: context.partner.id,
        p_payment_kind: 'initial',
      });

  if (error || !data?.ok) {
    logActionError('trip_media.campaigns.payment', 'prepare_failed', error);
    redirect(`/dashboard/campaigns/${campaignId}?error=payment_prepare_failed`);
  }

  const payment = data as {
    amount_cents: number;
    m_payment_id: string;
    payment_id: string;
  };

  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: buildBillingReturnUrl(siteUrl, {
      campaignId,
      paymentId: payment.payment_id,
      kind: 'initial',
    }),
    cancel_url: `${siteUrl}/dashboard/billing?checkout=cancelled&campaign=${campaignId}&payment=${payment.payment_id}`,
    notify_url: `${siteUrl}/api/payfast-webhook`,
    m_payment_id: payment.m_payment_id,
    amount: (payment.amount_cents / 100).toFixed(2),
    item_name: isSubscription ? 'Trip Media Starter subscription' : 'Trip Media campaign',
  };

  const signature = buildPayfastSignature(fields, passphrase);
  redirect(`${payfastUrl}?${new URLSearchParams({ ...fields, signature }).toString()}`);
}

export async function initiateImpressionTopup(campaignId: string, impressions: number) {
  const context = await getPartnerContext();
  if (!context) redirect('/signup?setup=partner&next=/dashboard/campaigns');

  const { merchantId, merchantKey, passphrase, siteUrl, payfastUrl } = payfastConfig();
  if (!merchantId || !merchantKey)
    redirect(`/dashboard/campaigns/${campaignId}?error=payfast_not_ready`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('partner_add_campaign_impressions', {
    p_campaign_id: campaignId,
    p_partner_id: context.partner.id,
    p_impressions: impressions,
  });

  if (error || !data?.ok) {
    redirect(`/dashboard/campaigns/${campaignId}?error=topup_failed`);
  }

  const payment = data as { amount_cents: number; m_payment_id: string; payment_id: string };
  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: buildBillingReturnUrl(siteUrl, {
      campaignId,
      paymentId: payment.payment_id,
      kind: 'topup',
    }),
    cancel_url: `${siteUrl}/dashboard/billing?checkout=cancelled&campaign=${campaignId}&payment=${payment.payment_id}`,
    notify_url: `${siteUrl}/api/payfast-webhook`,
    m_payment_id: payment.m_payment_id,
    amount: (payment.amount_cents / 100).toFixed(2),
    item_name: 'Trip Media impression top-up',
  };

  const signature = buildPayfastSignature(fields, passphrase);
  redirect(`${payfastUrl}?${new URLSearchParams({ ...fields, signature }).toString()}`);
}

export async function submitCampaignForReview(
  input: unknown,
): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return { success: false, message: 'Open the dashboard from a partner workspace first.' };
  if (!canManageCampaigns(context.member.role))
    return { success: false, message: 'Only owners, admins, and operators can submit campaigns.' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid campaign reference.' };

  const supabase = await createSupabaseServerClient();
  const { data: campaign } = await supabase
    .from('ad_campaigns')
    .select(
      'status, payment_status, creative:ad_creatives!ad_campaigns_creative_id_fkey(status)',
    )
    .eq('campaign_id', parsed.data.campaignId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (!campaign) return { success: false, message: 'Campaign not found.' };
  if (!['DRAFT', 'REJECTED'].includes(campaign.status))
    return { success: false, message: 'Only drafts or rejected campaigns can be submitted.' };
  if (campaign.payment_status !== 'paid')
    return { success: false, message: 'Complete payment before submitting for review.' };

  const creative = Array.isArray(campaign.creative)
    ? campaign.creative[0]
    : campaign.creative;
  if (!creative || creative.status !== 'approved')
    return { success: false, message: 'Linked creative must be approved before submission.' };

  const { error } = await supabase
    .from('ad_campaigns')
    .update({
      status: 'PENDING_REVIEW',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', parsed.data.campaignId)
    .eq('partner_id', context.partner.id);

  if (error) {
    logActionError('trip_media.campaigns.submit', 'update_failed', error);
    return { success: false, message: 'Could not submit that campaign.' };
  }

  revalidatePath('/dashboard/campaigns');
  revalidatePath(`/dashboard/campaigns/${parsed.data.campaignId}`);
  return { success: true };
}

export async function requestCampaignCancellation(
  campaignId: string,
  reason: string,
): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context) return { success: false, message: 'Not signed in.' };
  if (!canManageCampaigns(context.member.role))
    return { success: false, message: 'Not authorized.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('partner_request_campaign_cancellation', {
    p_campaign_id: campaignId,
    p_partner_id: context.partner.id,
    p_reason: reason,
  });

  if (error || !data?.ok)
    return { success: false, message: 'Could not request cancellation.' };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}

async function updateCampaignStatus(
  context: NonNullable<Awaited<ReturnType<typeof getPartnerContext>>>,
  campaignId: string,
  next: string,
  extra: Record<string, unknown> = {},
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('ad_campaigns')
    .update({ status: next, updated_at: new Date().toISOString(), ...extra })
    .eq('campaign_id', campaignId)
    .eq('partner_id', context.partner.id);
  return error;
}

export async function pauseCampaign(input: unknown): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context) return { success: false, message: 'Not signed in.' };
  if (!canManageCampaigns(context.member.role))
    return { success: false, message: 'Not authorized.' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Invalid campaign reference.' };

  const error = await updateCampaignStatus(context, parsed.data.campaignId, 'PAUSED');
  if (error) return { success: false, message: 'Could not pause that campaign.' };

  revalidatePath('/dashboard/campaigns');
  return { success: true };
}

export async function resumeCampaign(input: unknown): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context) return { success: false, message: 'Not signed in.' };
  if (!canManageCampaigns(context.member.role))
    return { success: false, message: 'Not authorized.' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Invalid campaign reference.' };

  const error = await updateCampaignStatus(context, parsed.data.campaignId, 'ACTIVE', {
    activated_at: new Date().toISOString(),
  });
  if (error) return { success: false, message: 'Could not resume that campaign.' };

  revalidatePath('/dashboard/campaigns');
  return { success: true };
}

export async function endCampaign(input: unknown): Promise<CampaignActionResult> {
  const context = await getPartnerContext();
  if (!context) return { success: false, message: 'Not signed in.' };
  if (!canManageCampaigns(context.member.role))
    return { success: false, message: 'Not authorized.' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Invalid campaign reference.' };

  const error = await updateCampaignStatus(context, parsed.data.campaignId, 'COMPLETED');
  if (error) return { success: false, message: 'Could not end that campaign.' };

  revalidatePath('/dashboard/campaigns');
  return { success: true };
}

/** @deprecated Use saveCampaignDraft */
export async function createCampaign(input: unknown): Promise<CampaignActionResult> {
  return saveCampaignDraft(input);
}
