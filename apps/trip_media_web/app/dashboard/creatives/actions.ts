'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPartnerContext } from '@/lib/partner';
import { canManageCreatives } from '@/lib/permissions';
import {
  logActionError,
  logActionInfo,
  logActionWarn,
} from '@/lib/server-action-logger';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export interface CreativeActionResult {
  success: boolean;
  message?: string;
  signedUrl?: string;
}

const createSchema = z.object({
  id: z.string().uuid(),
  storage_path: z.string().min(3),
  mime_type: z.enum(['image/png', 'image/jpeg', 'video/mp4']),
  duration_seconds: z.number().int().nonnegative().optional(),
  title: z.string().trim().min(2),
  cta_url: z.string().trim().url().optional().or(z.literal('')),
});

const idSchema = z.object({ creativeId: z.string().uuid() });

export async function createCreative(
  input: unknown,
): Promise<CreativeActionResult> {
  logActionInfo('trip_media.creatives.create', 'started');
  const context = await getPartnerContext();

  if (!context) {
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  }

  if (!canManageCreatives(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can manage creatives.',
    };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    logActionWarn('trip_media.creatives.create', 'validation_failed', {
      issues: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Check the fields.',
    };
  }

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase.from('ad_creatives').insert({
    id: parsed.data.id,
    partner_id: context.partner.id,
    title: parsed.data.title,
    cta_url: parsed.data.cta_url || null,
    storage_path: parsed.data.storage_path,
    mime_type: parsed.data.mime_type,
    duration_seconds: parsed.data.duration_seconds ?? null,
    status: 'draft',
  });

  if (error) {
    logActionError('trip_media.creatives.create', 'insert_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not save the creative metadata.' };
  }

  logActionInfo('trip_media.creatives.create', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/creatives');
  return { success: true };
}

export async function submitCreativeForReview(
  input: unknown,
): Promise<CreativeActionResult> {
  logActionInfo('trip_media.creatives.submit', 'started');
  const context = await getPartnerContext();

  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canManageCreatives(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can submit creatives.',
    };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid creative reference.' };

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase
    .from('ad_creatives')
    .update({ status: 'pending_review', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.creativeId)
    .eq('partner_id', context.partner.id);

  if (error) {
    logActionError('trip_media.creatives.submit', 'update_failed', error, {
      partnerId: context.partner.id,
      creativeId: parsed.data.creativeId,
    });
    return { success: false, message: 'Could not submit that creative.' };
  }

  logActionInfo('trip_media.creatives.submit', 'completed', {
    partnerId: context.partner.id,
    creativeId: parsed.data.creativeId,
  });
  revalidatePath('/dashboard/creatives');
  return { success: true };
}

export async function deleteCreative(
  input: unknown,
): Promise<CreativeActionResult> {
  logActionInfo('trip_media.creatives.delete', 'started');
  const context = await getPartnerContext();

  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canManageCreatives(context.member.role)) {
    return {
      success: false,
      message: 'Only owners, admins, and operators can delete creatives.',
    };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid creative reference.' };

  const supabase = await createClerkSupabaseServerClient();

  const { count: linked } = await supabase
    .from('ad_campaigns')
    .select('campaign_id', { head: true, count: 'exact' })
    .eq('partner_id', context.partner.id)
    .eq('creative_id', parsed.data.creativeId)
    .not('status', 'in', '(COMPLETED,ENDED,REJECTED)');

  if ((linked ?? 0) > 0) {
    return {
      success: false,
      message:
        'This creative is still attached to an active campaign. End or reject the campaign first.',
    };
  }

  const { data: existing } = await supabase
    .from('ad_creatives')
    .select('storage_path')
    .eq('id', parsed.data.creativeId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (existing?.storage_path) {
    await supabase.storage
      .from('partner-ad-creatives')
      .remove([existing.storage_path]);
  }

  const { error } = await supabase
    .from('ad_creatives')
    .delete()
    .eq('id', parsed.data.creativeId)
    .eq('partner_id', context.partner.id);

  if (error) {
    logActionError('trip_media.creatives.delete', 'delete_failed', error, {
      partnerId: context.partner.id,
      creativeId: parsed.data.creativeId,
    });
    return { success: false, message: 'Could not delete that creative.' };
  }

  logActionInfo('trip_media.creatives.delete', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/creatives');
  return { success: true };
}

export async function getCreativeSignedUrl(
  input: unknown,
): Promise<CreativeActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid creative reference.' };

  const context = await getPartnerContext();
  if (!context)
    return { success: false, message: 'Sign in to preview creatives.' };

  const supabase = await createClerkSupabaseServerClient();
  const { data: creative } = await supabase
    .from('ad_creatives')
    .select('storage_path')
    .eq('id', parsed.data.creativeId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (!creative?.storage_path)
    return { success: false, message: 'Creative not found.' };

  const { data: signed, error } = await supabase.storage
    .from('partner-ad-creatives')
    .createSignedUrl(creative.storage_path, 60 * 60);

  if (error || !signed?.signedUrl) {
    return { success: false, message: 'Could not generate a preview link.' };
  }

  return { success: true, signedUrl: signed.signedUrl };
}
