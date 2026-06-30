'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const MAX_BYTES = 300 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'image/jpeg',
  'image/png',
]);

const createSchema = z.object({
  title: z.string().trim().min(2),
  cta_url: z.string().url().optional().or(z.literal('')),
  sort_order: z.coerce.number().int().default(100),
});

export async function createInternalTripAd(formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false as const, error: 'Check the form fields.' };

  const file = formData.get('creative');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: 'Upload a portrait video or image.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: 'File must be 300MB or smaller.' };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false as const, error: 'Use MP4, MOV, JPG, or PNG.' };
  }

  const ext = file.type.startsWith('video/') ? 'mp4' : file.type === 'image/png' ? 'png' : 'jpg';
  const storagePath = `internal/${randomUUID()}.${ext}`;

  const supabase = await createSupabaseServerClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from('partner-ad-creatives')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) return { ok: false as const, error: uploadError.message };

  const { error } = await supabase.from('internal_trip_ads').insert({
    title: parsed.data.title,
    storage_path: storagePath,
    mime_type: file.type,
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
  const { error } = await supabase
    .from('internal_trip_ads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/trip-media/internal-ads');
  return { ok: true as const };
}

export async function deleteInternalTripAd(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from('internal_trip_ads')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('internal_trip_ads').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  if (row?.storage_path) {
    await supabase.storage.from('partner-ad-creatives').remove([row.storage_path]);
  }

  revalidatePath('/trip-media/internal-ads');
  return { ok: true as const };
}
