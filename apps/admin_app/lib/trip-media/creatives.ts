import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export type CreativeStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'suspended'
  | 'flagged';

export interface CreativeRow {
  id: string;
  partnerId: string | null;
  partnerName: string | null;
  title: string;
  mimeType: string | null;
  durationSeconds: number | null;
  storagePath: string | null;
  ctaUrl: string | null;
  status: CreativeStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: string | null;
  flaggedAt: string | null;
  suspendedAt: string | null;
  signedPreviewUrl: string | null;
}

interface RawCreative {
  id: string;
  title: string;
  mime_type: string | null;
  duration_seconds: number | null;
  storage_path: string | null;
  cta_url: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  category: string | null;
  flagged_at: string | null;
  suspended_at: string | null;
  partner_id: string | null;
  media_partners: { name: string } | Array<{ name: string }> | null;
}

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function loadCreativeQueue(
  status: CreativeStatus,
  limit = 200,
): Promise<Array<CreativeRow>> {
  const supabase = await createClerkSupabaseServerClient();
  const { data } = await supabase
    .from('ad_creatives')
    .select(
      [
        'id',
        'title',
        'mime_type',
        'duration_seconds',
        'storage_path',
        'cta_url',
        'status',
        'review_note',
        'reviewed_at',
        'created_at',
        'updated_at',
        'category',
        'flagged_at',
        'suspended_at',
        'partner_id',
        'media_partners:partner_id(name)',
      ].join(', '),
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows: Array<RawCreative> = (data as Array<RawCreative> | null) ?? [];
  if (rows.length === 0) return [];

  const paths = rows
    .map((r) => r.storage_path)
    .filter((p): p is string => Boolean(p));
  const signedUrlByPath = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('partner-ad-creatives')
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signed) {
      for (const item of signed) {
        if (item.path && item.signedUrl)
          signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  return rows.map((row) => {
    const partner = Array.isArray(row.media_partners)
      ? row.media_partners[0]
      : row.media_partners;
    return {
      id: row.id,
      partnerId: row.partner_id,
      partnerName: partner?.name ?? null,
      title: row.title,
      mimeType: row.mime_type,
      durationSeconds: row.duration_seconds,
      storagePath: row.storage_path,
      ctaUrl: row.cta_url,
      status: row.status as CreativeStatus,
      reviewNote: row.review_note,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: row.category,
      flaggedAt: row.flagged_at,
      suspendedAt: row.suspended_at,
      signedPreviewUrl: row.storage_path
        ? (signedUrlByPath.get(row.storage_path) ?? null)
        : null,
    };
  });
}

export interface CreativeStatusCounts {
  pending_review: number;
  approved: number;
  rejected: number;
  changes_requested: number;
  suspended: number;
  flagged: number;
  draft: number;
}

export async function loadCreativeCounts(): Promise<CreativeStatusCounts> {
  const supabase = await createClerkSupabaseServerClient();
  const statuses: Array<keyof CreativeStatusCounts> = [
    'pending_review',
    'approved',
    'rejected',
    'changes_requested',
    'suspended',
    'flagged',
    'draft',
  ];
  const counts: CreativeStatusCounts = {
    pending_review: 0,
    approved: 0,
    rejected: 0,
    changes_requested: 0,
    suspended: 0,
    flagged: 0,
    draft: 0,
  };
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from('ad_creatives')
        .select('id', { count: 'exact', head: true })
        .eq('status', s);
      counts[s] = count ?? 0;
    }),
  );
  return counts;
}
