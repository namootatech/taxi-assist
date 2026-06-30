'use server';

import { revalidatePath } from 'next/cache';
import { getPartnerContext } from '@/lib/partner';
import { getCheckoutPaymentStatus } from '@/lib/billing/process-checkout-return';

export async function pollCheckoutPayment(campaignId: string, paymentId: string) {
  const context = await getPartnerContext();
  if (!context) return { status: 'unauthorized' as const };

  const result = await getCheckoutPaymentStatus(campaignId, paymentId, context.partner.id);
  if (result.status === 'complete') {
    revalidatePath('/dashboard/billing');
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
  }
  return result;
}
