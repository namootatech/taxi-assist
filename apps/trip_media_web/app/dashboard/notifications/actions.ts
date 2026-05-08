'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPartnerContext } from '@/lib/partner';
import { logActionError } from '@/lib/server-action-logger';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export interface NotificationActionResult {
  success: boolean;
  message?: string;
}

const idSchema = z.object({ notificationId: z.string().uuid() });

export async function markAllRead(): Promise<NotificationActionResult> {
  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase
    .from('partner_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('partner_id', context.partner.id)
    .is('read_at', null);

  if (error) {
    logActionError(
      'trip_media.notifications.mark_all_read',
      'update_failed',
      error,
      {
        partnerId: context.partner.id,
      },
    );
    return { success: false, message: 'Could not mark notifications as read.' };
  }

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function markRead(
  input: unknown,
): Promise<NotificationActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: 'Invalid notification reference.' };

  const context = await getPartnerContext();
  if (!context)
    return {
      success: false,
      message: 'Open the dashboard from a partner workspace first.',
    };

  const supabase = await createClerkSupabaseServerClient();
  const { error } = await supabase
    .from('partner_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', parsed.data.notificationId)
    .eq('partner_id', context.partner.id)
    .is('read_at', null);

  if (error) {
    logActionError(
      'trip_media.notifications.mark_read',
      'update_failed',
      error,
      {
        partnerId: context.partner.id,
      },
    );
    return { success: false, message: 'Could not mark notification as read.' };
  }

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard');
  return { success: true };
}
