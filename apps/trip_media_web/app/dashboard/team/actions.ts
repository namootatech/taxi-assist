'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPartnerContext } from '@/lib/partner';
import {
  canChangeMemberRole,
  canInviteMembers,
  canRemoveMembers,
} from '@/lib/permissions';
import {
  logActionError,
  logActionInfo,
  logActionWarn,
} from '@/lib/server-action-logger';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface TeamActionResult {
  success: boolean;
  message?: string;
  inviteToken?: string;
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['admin', 'operator', 'viewer']),
});

const memberIdSchema = z.object({
  memberId: z.string().uuid(),
});

const inviteIdSchema = z.object({
  inviteId: z.string().uuid(),
});

const roleChangeSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(['admin', 'operator', 'viewer']),
});

function newInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function inviteMember(input: {
  email: string;
  role: string;
}): Promise<TeamActionResult> {
  logActionInfo('trip_media.team.invite', 'started');
  const context = await getPartnerContext();

  if (!context) {
    logActionWarn('trip_media.team.invite', 'missing_partner_context');
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  }

  if (!canInviteMembers(context.member.role)) {
    logActionWarn('trip_media.team.invite', 'insufficient_role', {
      role: context.member.role,
    });
    return {
      success: false,
      message: 'Only owners and admins can invite team members.',
    };
  }

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Check the email and role.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const token = newInviteToken();

  const { data: existingMember } = await supabase
    .from('partner_members')
    .select('id, joined_at')
    .eq('partner_id', context.partner.id)
    .ilike('email', parsed.data.email)
    .maybeSingle();

  if (existingMember?.joined_at) {
    return {
      success: false,
      message: 'That email is already an active team member.',
    };
  }

  if (!existingMember) {
    const { error: memberError } = await supabase
      .from('partner_members')
      .insert({
        partner_id: context.partner.id,
        email: parsed.data.email,
        role: parsed.data.role,
      });
    if (memberError && memberError.code !== '23505') {
      logActionError(
        'trip_media.team.invite',
        'member_placeholder_failed',
        memberError,
        {
          partnerId: context.partner.id,
        },
      );
      return {
        success: false,
        message: 'Could not create the placeholder seat. Try again.',
      };
    }
  }

  const { data: invite, error } = await supabase
    .from('partner_invites')
    .insert({
      partner_id: context.partner.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invited_by: user?.id ?? null,
    })
    .select('id, token')
    .maybeSingle();

  if (error || !invite) {
    logActionError('trip_media.team.invite', 'invite_insert_failed', error, {
      partnerId: context.partner.id,
    });
    if (error?.code === '23505') {
      return {
        success: false,
        message:
          'An active invite already exists for that email. Revoke it first or copy the existing link.',
      };
    }
    return {
      success: false,
      message: 'We could not create that invite. Try again.',
    };
  }

  logActionInfo('trip_media.team.invite', 'completed', {
    partnerId: context.partner.id,
    role: parsed.data.role,
  });
  revalidatePath('/dashboard/team');
  return { success: true, inviteToken: invite.token };
}

export async function revokeInvite(input: {
  inviteId: string;
}): Promise<TeamActionResult> {
  logActionInfo('trip_media.team.revoke', 'started');
  const context = await getPartnerContext();

  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canInviteMembers(context.member.role)) {
    return {
      success: false,
      message: 'Only owners and admins can revoke invites.',
    };
  }

  const parsed = inviteIdSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid invite reference.' };

  const supabase = await createSupabaseServerClient();
  const { data: invite } = await supabase
    .from('partner_invites')
    .select('id, email')
    .eq('id', parsed.data.inviteId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (!invite)
    return { success: false, message: 'That invite no longer exists.' };

  const { error } = await supabase
    .from('partner_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('partner_id', context.partner.id);

  if (error) {
    logActionError('trip_media.team.revoke', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not revoke that invite.' };
  }

  await supabase
    .from('partner_members')
    .delete()
    .eq('partner_id', context.partner.id)
    .ilike('email', invite.email)
    .is('user_id', null);

  logActionInfo('trip_media.team.revoke', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/team');
  return { success: true };
}

export async function regenerateInviteLink(input: {
  inviteId: string;
}): Promise<TeamActionResult> {
  logActionInfo('trip_media.team.regenerate', 'started');
  const context = await getPartnerContext();

  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canInviteMembers(context.member.role)) {
    return {
      success: false,
      message: 'Only owners and admins can refresh invite links.',
    };
  }

  const parsed = inviteIdSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid invite reference.' };

  const supabase = await createSupabaseServerClient();
  const token = newInviteToken();

  const { data: invite, error } = await supabase
    .from('partner_invites')
    .update({
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.inviteId)
    .eq('partner_id', context.partner.id)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .select('token')
    .maybeSingle();

  if (error || !invite) {
    logActionError('trip_media.team.regenerate', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not refresh that invite link.' };
  }

  logActionInfo('trip_media.team.regenerate', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/team');
  return { success: true, inviteToken: invite.token };
}

export async function removeMember(input: {
  memberId: string;
}): Promise<TeamActionResult> {
  logActionInfo('trip_media.team.remove_member', 'started');
  const context = await getPartnerContext();

  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canRemoveMembers(context.member.role)) {
    return {
      success: false,
      message: 'Only owners and admins can remove team members.',
    };
  }

  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid member reference.' };

  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from('partner_members')
    .select('id, role')
    .eq('id', parsed.data.memberId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (!target)
    return { success: false, message: 'That team member could not be found.' };
  if (target.role === 'owner') {
    return {
      success: false,
      message: 'The owner cannot be removed. Transfer ownership first.',
    };
  }

  const { error } = await supabase
    .from('partner_members')
    .delete()
    .eq('id', target.id)
    .eq('partner_id', context.partner.id);

  if (error) {
    logActionError('trip_media.team.remove_member', 'delete_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not remove that member.' };
  }

  logActionInfo('trip_media.team.remove_member', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/team');
  return { success: true };
}

export async function changeMemberRole(input: {
  memberId: string;
  role: string;
}): Promise<TeamActionResult> {
  logActionInfo('trip_media.team.change_role', 'started');
  const context = await getPartnerContext();

  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };
  if (!canChangeMemberRole(context.member.role)) {
    return {
      success: false,
      message: 'Only owners and admins can change member roles.',
    };
  }

  const parsed = roleChangeSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid role selection.' };

  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from('partner_members')
    .select('id, role')
    .eq('id', parsed.data.memberId)
    .eq('partner_id', context.partner.id)
    .maybeSingle();

  if (!target)
    return { success: false, message: 'That team member could not be found.' };
  if (target.role === 'owner') {
    return {
      success: false,
      message: 'Owner role is locked. Transfer ownership through support.',
    };
  }

  const { error } = await supabase
    .from('partner_members')
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq('id', target.id)
    .eq('partner_id', context.partner.id);

  if (error) {
    logActionError('trip_media.team.change_role', 'update_failed', error, {
      partnerId: context.partner.id,
    });
    return { success: false, message: 'Could not change that role.' };
  }

  logActionInfo('trip_media.team.change_role', 'completed', {
    partnerId: context.partner.id,
  });
  revalidatePath('/dashboard/team');
  return { success: true };
}
