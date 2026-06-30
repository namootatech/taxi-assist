import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedPayfastPaymentRef } from '@/lib/payfast/payment-ref';

export interface PayfastConfirmFields {
  payment_status?: string;
  pf_payment_id?: string;
  m_payment_id?: string;
  amount_gross?: string;
  amount?: string;
}

export async function confirmPayfastPayment(
  admin: SupabaseClient,
  parsed: ParsedPayfastPaymentRef,
  fields: PayfastConfirmFields,
) {
  const eventId = String(fields.pf_payment_id || fields.m_payment_id || '');
  const paymentStatus = String(fields.payment_status || '').toUpperCase();
  const amountCents = Math.round(
    parseFloat(String(fields.amount_gross || fields.amount || '0')) * 100,
  );

  if (parsed.kind === 'campaign') {
    return admin.rpc('partner_confirm_campaign_payment', {
      p_campaign_id: parsed.campaignId,
      p_payment_id: parsed.paymentId,
      p_provider_payment_id: eventId,
      p_amount_cents: amountCents,
      p_status: paymentStatus,
    });
  }

  return admin.rpc('partner_confirm_impression_topup', {
    p_campaign_id: parsed.campaignId,
    p_payment_id: parsed.paymentId,
    p_provider_payment_id: eventId,
    p_amount_cents: amountCents,
  });
}
