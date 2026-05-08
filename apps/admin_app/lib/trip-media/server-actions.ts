'use server';

import { revalidatePath } from 'next/cache';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { logActionError, logActionInfo } from '@/lib/server-action-logger';
import { userFacingError } from '@/lib/user-facing-error';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface RpcResult {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

const interpretRpc = (data: unknown): ActionResult => {
  if (data && typeof data === 'object') {
    const result = data as RpcResult;
    if (result.ok === true) return { ok: true };
    if (typeof result.error === 'string')
      return { ok: false, error: result.error };
  }
  return { ok: false, error: 'Unexpected response. Try again.' };
};

const requireReason = (
  reason: string | null | undefined,
  message: string,
): string | null => {
  const trimmed = (reason ?? '').trim();
  if (trimmed.length < 4) return message;
  return null;
};

// ---------------------------------------------------------------------------
// Creative moderation
// ---------------------------------------------------------------------------
export interface CreativeActionInput {
  creativeId: string;
  status:
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'suspended'
    | 'flagged'
    | 'pending_review';
  reason?: string;
  reasonSlug?: string;
}

export async function setCreativeStatusAction(
  input: CreativeActionInput,
): Promise<ActionResult> {
  const action = 'admin.creatives.set_status';
  if (!input.creativeId) return { ok: false, error: 'Pick a creative first.' };

  if (input.status !== 'approved' && input.status !== 'pending_review') {
    const missing = requireReason(
      input.reason,
      'Add a short reason so the advertiser knows what to change.',
    );
    if (missing) return { ok: false, error: missing };
  }

  logActionInfo(action, 'started', { status: input.status });
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_creative_status', {
    p_creative_id: input.creativeId,
    p_status: input.status,
    p_reason: input.reason ?? null,
    p_metadata: input.reasonSlug ? { reason_slug: input.reasonSlug } : {},
  });

  if (error) {
    logActionError(action, 'rpc_failed', error, { status: input.status });
    return { ok: false, error: userFacingError(error) };
  }

  const result = interpretRpc(data);
  if (!result.ok) {
    logActionError(action, 'rpc_returned_error', result.error ?? 'unknown');
    return result;
  }

  revalidatePath('/creatives');
  revalidatePath('/trip-media/overview');
  logActionInfo(action, 'completed', { status: input.status });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Campaign oversight
// ---------------------------------------------------------------------------
export interface CampaignStatusInput {
  campaignId: string;
  status: 'PAUSED' | 'ACTIVE' | 'FORCE_STOPPED';
  reason?: string;
}

export async function setCampaignStatusAction(
  input: CampaignStatusInput,
): Promise<ActionResult> {
  const action = 'admin.campaigns.set_status';
  if (!input.campaignId) return { ok: false, error: 'Pick a campaign first.' };
  if (input.status === 'FORCE_STOPPED') {
    const missing = requireReason(
      input.reason,
      'Add a reason. The advertiser will see this and so will the audit log.',
    );
    if (missing) return { ok: false, error: missing };
  }

  logActionInfo(action, 'started', { status: input.status });
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_campaign_status', {
    p_campaign_id: input.campaignId,
    p_status: input.status,
    p_reason: input.reason ?? null,
  });

  if (error) {
    logActionError(action, 'rpc_failed', error, { status: input.status });
    return { ok: false, error: userFacingError(error) };
  }

  const result = interpretRpc(data);
  if (!result.ok) {
    logActionError(action, 'rpc_returned_error', result.error ?? 'unknown');
    return result;
  }

  revalidatePath('/ads');
  revalidatePath('/trip-media/overview');
  logActionInfo(action, 'completed', { status: input.status });
  return { ok: true };
}

export interface CampaignAdjustInput {
  campaignId: string;
  maxViews: number | null;
  rewardPerView: number | null;
  reason: string;
}

export async function adjustCampaignDeliveryAction(
  input: CampaignAdjustInput,
): Promise<ActionResult> {
  const action = 'admin.campaigns.adjust_delivery';
  if (!input.campaignId) return { ok: false, error: 'Pick a campaign first.' };
  const missing = requireReason(
    input.reason,
    'Add a reason for changing delivery limits.',
  );
  if (missing) return { ok: false, error: missing };

  logActionInfo(action, 'started');
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_adjust_campaign_delivery', {
    p_campaign_id: input.campaignId,
    p_max_views: input.maxViews,
    p_reward_per_view: input.rewardPerView,
    p_reason: input.reason,
  });

  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;

  revalidatePath('/ads');
  logActionInfo(action, 'completed');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rider rewards
// ---------------------------------------------------------------------------
export interface FreezeRewardInput {
  adViewId: string;
  reason: string;
  fraudSignalId?: string;
}

export async function freezeRewardAction(
  input: FreezeRewardInput,
): Promise<ActionResult> {
  const action = 'admin.rewards.freeze';
  if (!input.adViewId) return { ok: false, error: 'Pick a view first.' };
  const missing = requireReason(
    input.reason,
    'Explain why the reward is being held.',
  );
  if (missing) return { ok: false, error: missing };

  logActionInfo(action, 'started');
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_freeze_reward', {
    p_ad_view_id: input.adViewId,
    p_reason: input.reason,
    p_fraud_signal_id: input.fraudSignalId ?? null,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/rider-rewards');
  revalidatePath('/trip-media/fraud');
  logActionInfo(action, 'completed');
  return { ok: true };
}

export async function reverseRewardAction(
  input: FreezeRewardInput,
): Promise<ActionResult> {
  const action = 'admin.rewards.reverse';
  if (!input.adViewId) return { ok: false, error: 'Pick a view first.' };
  const missing = requireReason(
    input.reason,
    'Add the reason for reversing the reward.',
  );
  if (missing) return { ok: false, error: missing };

  logActionInfo(action, 'started');
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_reverse_reward', {
    p_ad_view_id: input.adViewId,
    p_reason: input.reason,
    p_fraud_signal_id: input.fraudSignalId ?? null,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/rider-rewards');
  revalidatePath('/wallets');
  logActionInfo(action, 'completed');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Fraud signals
// ---------------------------------------------------------------------------
export interface FraudStatusInput {
  signalId: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed' | 'escalated';
  reason?: string;
}

export async function setFraudSignalStatusAction(
  input: FraudStatusInput,
): Promise<ActionResult> {
  const action = 'admin.fraud.set_status';
  if (!input.signalId) return { ok: false, error: 'Pick a signal first.' };
  if (
    input.status === 'resolved' ||
    input.status === 'dismissed' ||
    input.status === 'escalated'
  ) {
    const missing = requireReason(
      input.reason,
      'Add a short note describing the outcome.',
    );
    if (missing) return { ok: false, error: missing };
  }

  logActionInfo(action, 'started', { status: input.status });
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_fraud_signal_status', {
    p_signal_id: input.signalId,
    p_status: input.status,
    p_reason: input.reason ?? null,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/fraud');
  revalidatePath('/trip-media/overview');
  logActionInfo(action, 'completed', { status: input.status });
  return { ok: true };
}

export interface FraudLevelInput {
  signalId: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
}

export async function setFraudSignalLevelAction(
  input: FraudLevelInput,
): Promise<ActionResult> {
  const action = 'admin.fraud.set_level';
  if (!input.signalId) return { ok: false, error: 'Pick a signal first.' };

  logActionInfo(action, 'started', { level: input.level });
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_fraud_signal_level', {
    p_signal_id: input.signalId,
    p_level: input.level,
    p_reason: input.reason ?? null,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/fraud');
  logActionInfo(action, 'completed', { level: input.level });
  return { ok: true };
}

export interface LogFraudInput {
  kind: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  evidence?: Record<string, unknown>;
  riderId?: string;
  tripId?: string;
  adViewId?: string;
  campaignId?: string;
  partnerId?: string;
}

export async function logFraudSignalAction(
  input: LogFraudInput,
): Promise<ActionResult> {
  const action = 'admin.fraud.log';
  if (!input.kind) return { ok: false, error: 'Choose a signal type.' };
  if (!input.summary || input.summary.trim().length < 4)
    return { ok: false, error: 'Describe what you saw.' };

  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_log_fraud_signal', {
    p_kind: input.kind,
    p_level: input.level,
    p_summary: input.summary,
    p_evidence: input.evidence ?? {},
    p_rider_id: input.riderId ?? null,
    p_trip_id: input.tripId ?? null,
    p_ad_view_id: input.adViewId ?? null,
    p_campaign_id: input.campaignId ?? null,
    p_partner_id: input.partnerId ?? null,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/fraud');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Advertisers
// ---------------------------------------------------------------------------
export interface PartnerStatusInput {
  partnerId: string;
  status: 'active' | 'suspended' | 'closed';
  reason: string;
}

export async function setPartnerStatusAction(
  input: PartnerStatusInput,
): Promise<ActionResult> {
  const action = 'admin.partners.set_status';
  if (!input.partnerId)
    return { ok: false, error: 'Pick an advertiser first.' };
  const missing = requireReason(
    input.reason,
    'Add a reason. The advertiser will see this.',
  );
  if (missing) return { ok: false, error: missing };

  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_partner_status', {
    p_partner_id: input.partnerId,
    p_status: input.status,
    p_reason: input.reason,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/advertisers');
  revalidatePath(`/trip-media/advertisers/${input.partnerId}`);
  return { ok: true };
}

export interface PartnerCreditsInput {
  partnerId: string;
  delta: number;
  reason: string;
}

export async function adjustPartnerCreditsAction(
  input: PartnerCreditsInput,
): Promise<ActionResult> {
  const action = 'admin.partners.adjust_credits';
  if (!input.partnerId)
    return { ok: false, error: 'Pick an advertiser first.' };
  if (!Number.isFinite(input.delta) || input.delta === 0)
    return { ok: false, error: 'Enter a non-zero credit amount.' };
  const missing = requireReason(
    input.reason,
    'Add a reason for the credit adjustment.',
  );
  if (missing) return { ok: false, error: missing };

  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_adjust_partner_credits', {
    p_partner_id: input.partnerId,
    p_delta: Math.round(input.delta),
    p_reason: input.reason,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/advertisers');
  revalidatePath(`/trip-media/advertisers/${input.partnerId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function setTripMediaSettingAction(
  key: string,
  value: unknown,
): Promise<ActionResult> {
  const action = 'admin.trip_media.settings_update';
  if (!key) return { ok: false, error: 'Setting key is missing.' };

  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_set_trip_media_setting', {
    p_key: key,
    p_value: (value ?? {}) as Record<string, unknown>,
  });
  if (error) {
    logActionError(action, 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/settings');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export interface ReportRunInput {
  kind: string;
  params: Record<string, unknown>;
  rowCount: number;
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
}

export async function recordReportRunAction(
  input: ReportRunInput,
): Promise<ActionResult> {
  const supabase = await createClerkSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_record_report_run', {
    p_kind: input.kind,
    p_params: input.params,
    p_row_count: input.rowCount,
    p_status: input.status,
    p_error_message: input.errorMessage ?? null,
  });
  if (error) {
    logActionError('admin.reports.record_run', 'rpc_failed', error);
    return { ok: false, error: userFacingError(error) };
  }
  const result = interpretRpc(data);
  if (!result.ok) return result;
  revalidatePath('/trip-media/reports');
  return { ok: true };
}
