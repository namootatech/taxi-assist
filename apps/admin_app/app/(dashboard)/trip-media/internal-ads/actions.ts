'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const schema = z.object({
  title: z.string().trim().min(2),
  storage_path: z.string().min(3),
  mime_type: z.string().optional(),
  duration_seconds: z.coerce.number().int().optional(),
  cta_url: z.string().url().optional().or(z.literal('')),
  sort_order: z.coerce.number().int().default(100),
});

export async function createInternalTripAd(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false as const, error: 'Check the form fields.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('internal_trip_ads').insert({
    title: parsed.data.title,
    storage_path: parsed.data.storage_path,
    mime_type: parsed.data.mime_type ?? null,
    duration_seconds: parsed.data.duration_seconds ?? null,
    cta_url: parsed.data.cta_url || null,
    sort_order: parsed.data.sort_order,
    status: 'active',
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/trip-media/internal-ads');
  return { ok: true as const };
}

export async function setInternalTripAdStatus(id: string, status: 'active' | 'paused' | 'archived') {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('internal_trip_ads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/trip-media/internal-ads');
  return { ok: true as const };
}
