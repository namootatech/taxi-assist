'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getPartnerContext } from '@/lib/partner';
import { canCloseOrg, canEditOrg } from '@/lib/permissions';
import { logActionError, logActionInfo } from '@/lib/server-action-logger';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export interface SettingsActionResult {
  success: boolean;
  message?: string;
}

const orgSchema = z.object({
  name: z.string().trim().min(2),
  legal_name: z.string().trim().optional().or(z.literal('')),
  registration_number: z.string().trim().optional().or(z.literal('')),
  billing_country: z.string().trim().min(2).max(3),
  billing_currency: z.string().trim().min(3).max(4),
});

const accountSchema = z.object({
  full_name: z.string().trim().min(2).optional().or(z.literal('')),
});

const passwordSchema = z.object({
  password: z.string().min(8),
});

export async function updateOrgProfile(
  input: unknown,
): Promise<SettingsActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canEditOrg(context.member.role)) {
    return {
      success: false,
      message: 'Only owners and admins can edit the company profile.',
    };
  }

  const parsed = orgSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Check the fields.',
    };

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase
    .from('media_partners')
    .update({
      name: parsed.data.name,
      legal_name: parsed.data.legal_name || null,
      registration_number: parsed.data.registration_number || null,
      billing_country: parsed.data.billing_country.toUpperCase(),
      billing_currency: parsed.data.billing_currency.toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', context.partner.id);

  if (error) {
    logActionError('trip_media.settings.update_org', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not update the company profile.' };
  }

  logActionInfo('trip_media.settings.update_org', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateAccountName(
  input: unknown,
): Promise<SettingsActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Check the name.',
    };

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.full_name || null },
  });

  if (error) {
    logActionError(
      'trip_media.settings.update_account',
      'update_failed',
      error,
    );
    return { success: false, message: 'Could not update your name.' };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function changePassword(
  input: unknown,
): Promise<SettingsActionResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: 'Password must be at least 8 characters.',
    };
  }

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logActionError(
      'trip_media.settings.change_password',
      'update_failed',
      error,
    );
    return { success: false, message: 'Could not change your password.' };
  }

  return { success: true };
}

export async function closeWorkspace(): Promise<SettingsActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canCloseOrg(context.member.role)) {
    return {
      success: false,
      message: 'Only the workspace owner can close the workspace.',
    };
  }

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase
    .from('media_partners')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', context.partner.id);

  if (error) {
    logActionError(
      'trip_media.settings.close_workspace',
      'update_failed',
      error,
      { partnerId: context.partner.id },
    );
    return { success: false, message: 'Could not close the workspace.' };
  }

  redirect('/login?error=Workspace+closed.+Contact+support+to+reopen.');
}
