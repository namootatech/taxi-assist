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
        description="Campaign packages (Basic, Essential, Premium) plus the Starter subscription. Rider payout per impression is hidden from partners."
      />
      <PackagesConsole packages={packages} promotions={promotions} />
    </div>
  );
}
