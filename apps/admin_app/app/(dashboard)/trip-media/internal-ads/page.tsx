import { PageHeader } from '@/components/trip-media/Surface';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InternalAdsManager } from './InternalAdsManager';

export const dynamic = 'force-dynamic';

export default async function InternalTripAdsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: ads } = await supabase
    .from('internal_trip_ads')
    .select('id, title, storage_path, mime_type, status, sort_order, cta_url, created_at')
    .neq('status', 'archived')
    .order('sort_order')
    .order('created_at', { ascending: false });

  const rows = ads ?? [];
  const paths = rows.map((a) => a.storage_path).filter(Boolean);
  const signedByPath = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('partner-ad-creatives')
      .createSignedUrls(paths, 600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    }
  }

  const enriched = rows.map((ad) => ({
    ...ad,
    signedUrl: signedByPath.get(ad.storage_path) ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Trip ads"
        description="Platform ads shown to riders after every second paid partner ad. No rider payout. Partners cannot see these."
      />
      <InternalAdsManager ads={enriched} />
    </div>
  );
}
