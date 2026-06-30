import { redirect } from 'next/navigation';
import { getPartnerContext } from '@/lib/partner';
import { canManageCampaigns } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CampaignWizard } from '../CampaignWizard';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const context = await getPartnerContext();
  if (!context) redirect('/signup?setup=partner&next=/dashboard/campaigns/new');
  if (!canManageCampaigns(context.member.role)) redirect('/dashboard/campaigns');

  const supabase = await createSupabaseServerClient();
  const [{ data: packages }, { data: creatives }, { data: promo }] = await Promise.all([
    supabase.from('vw_partner_ad_packages').select('*').order('base_price_cents'),
    supabase
      .from('ad_creatives')
      .select('id, title, status')
      .eq('partner_id', context.partner.id)
      .in('status', ['draft', 'pending_review', 'approved'])
      .order('created_at', { ascending: false }),
    supabase
      .from('platform_promotions')
      .select('discount_pct, bonus_impressions, start_at, end_at')
      .eq('slug', 'prelaunch_gauteng')
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  const now = Date.now();
  const prelaunchActive =
    promo &&
    new Date(promo.start_at).getTime() <= now &&
    new Date(promo.end_at).getTime() > now;

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <header>
        <p className='text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-red)]'>New campaign</p>
        <h1 className='mt-2 text-3xl font-black tracking-tight'>Plan your campaign</h1>
        {prelaunchActive ? (
          <p className='mt-2 text-sm text-emerald-200'>
            Prelaunch offer active: {promo.discount_pct}% off
            {!context.partner.prelaunch_bonus_claimed ? ` and ${promo.bonus_impressions.toLocaleString()} bonus impressions on your first paid campaign` : ''}.
          </p>
        ) : null}
      </header>
      <CampaignWizard
        packages={packages ?? []}
        creatives={creatives ?? []}
        prelaunchDiscountPct={prelaunchActive ? Number(promo.discount_pct) : 0}
        prelaunchBonusAvailable={Boolean(prelaunchActive && !context.partner.prelaunch_bonus_claimed)}
        defaultCompanyName={context.partner.company_name ?? context.partner.name}
      />
    </div>
  );
}
