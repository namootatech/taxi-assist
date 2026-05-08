'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getPartnerContext } from '@/lib/partner';
import { buildPayfastSignature } from '@/lib/payfast/signature';
import { logActionInfo, logActionWarn } from '@/lib/server-action-logger';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

const checkoutSchema = z.object({
  packageId: z.string().uuid(),
});

export async function createPayfastCheckout(formData: FormData) {
  logActionInfo('trip_media.billing.checkout', 'started');
  const context = await getPartnerContext();

  if (!context) {
    logActionWarn('trip_media.billing.checkout', 'missing_partner_context');
    redirect('/signup?setup=partner&next=/dashboard/billing');
  }

  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    logActionWarn('trip_media.billing.checkout', 'validation_failed', {
      issues: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
    redirect('/dashboard/billing?error=package_missing');
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const payfastUrl =
    process.env.PAYFAST_CHECKOUT_URL ||
    'https://sandbox.payfast.co.za/eng/process';

  if (!merchantId || !merchantKey) {
    logActionWarn(
      'trip_media.billing.checkout',
      'payfast_credentials_missing',
      { partnerId: context.partner.id },
    );
    redirect('/dashboard/billing?error=payfast_not_ready');
  }

  const supabase = await createClerkSupabaseServerClient();
  const { data: selectedPackage } = await supabase
    .from('ad_packages')
    .select('id, name, monthly_price_cents')
    .eq('id', parsed.data.packageId)
    .maybeSingle();

  if (!selectedPackage) {
    logActionWarn('trip_media.billing.checkout', 'package_missing', {
      partnerId: context.partner.id,
      packageId: parsed.data.packageId,
    });
    redirect('/dashboard/billing?error=package_missing');
  }

  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${siteUrl}/dashboard/billing?checkout=return`,
    cancel_url: `${siteUrl}/dashboard/billing?checkout=cancelled`,
    notify_url: `${siteUrl}/api/payfast-webhook`,
    m_payment_id: `${context.partner.id}:${selectedPackage.id}`,
    amount: (selectedPackage.monthly_price_cents / 100).toFixed(2),
    item_name: `Trip Media ${selectedPackage.name}`,
    subscription_type: '1',
    billing_date: new Date().toISOString().slice(0, 10),
    recurring_amount: (selectedPackage.monthly_price_cents / 100).toFixed(2),
    frequency: '3',
    cycles: '0',
  };

  const signature = buildPayfastSignature(fields, passphrase);
  const query = new URLSearchParams({ ...fields, signature }).toString();

  logActionInfo('trip_media.billing.checkout', 'completed', {
    partnerId: context.partner.id,
    packageId: selectedPackage.id,
  });
  redirect(`${payfastUrl}?${query}`);
}
