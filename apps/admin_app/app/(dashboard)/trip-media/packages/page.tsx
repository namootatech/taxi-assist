import { PageHeader } from '@/components/trip-media/Surface';
import { loadCampaignPackages } from '@/lib/trip-media/packages';
import { loadPlatformPromotions } from '@/lib/trip-media/promotions';
import { PackagesConsole } from './PackagesConsole';

export const dynamic = 'force-dynamic';

export default async function TripMediaPackagesPage() {
  const [packages, promotions] = await Promise.all([
    loadCampaignPackages(),
    loadPlatformPromotions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign packages & pricing"
        description="Fixed Basic, Essential, and Premium packages. Rider payout per impression is hidden from partners. Prelaunch discount applies automatically when active."
      />
      <PackagesConsole packages={packages} promotions={promotions} />
    </div>
  );
}
