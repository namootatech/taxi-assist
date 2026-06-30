import { PageHeader } from '@/components/trip-media/Surface';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InternalAdsManager } from './InternalAdsManager';

export const dynamic = 'force-dynamic';

export default async function InternalTripAdsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: ads } = await supabase
    .from('internal_trip_ads')
    .select('id, title, storage_path, status, sort_order, cta_url, created_at')
    .order('sort_order')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Trip ads"
        description="Platform ads shown to riders after every second paid partner ad. No rider payout. Partners cannot see these."
      />
      <InternalAdsManager ads={ads ?? []} />
    </div>
  );
}
