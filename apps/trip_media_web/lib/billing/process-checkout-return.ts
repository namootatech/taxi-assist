import { verifyPayfastSignature } from '@/lib/payfast/signature';
import { confirmPayfastPayment } from '@/lib/payfast/confirm-payment';
import {
  buildPayfastPaymentRef,
  parsePayfastPaymentRef,
} from '@/lib/payfast/payment-ref';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CheckoutReturnState =
  | { status: 'complete'; kind: 'initial' | 'topup'; campaignId: string; packageName?: string }
  | { status: 'pending'; kind: 'initial' | 'topup'; campaignId: string }
  | { status: 'failed'; message: string }
  | { status: 'cancelled' }
  | null;

function payfastFieldsFromParams(params: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null && value !== ''),
  ) as Record<string, string>;
}

function resolvePaymentRef(params: Record<string, string | undefined>) {
  const fromPayfast = params.m_payment_id
    ? parsePayfastPaymentRef(params.m_payment_id)
    : null;
  if (fromPayfast) return fromPayfast;

  const campaignId = params.campaign;
  const paymentId = params.payment;
  if (!campaignId || !paymentId) return null;

  const kind = params.checkout === 'topup_return' ? 'topup' : 'campaign';
  return parsePayfastPaymentRef(buildPayfastPaymentRef(kind, campaignId, paymentId));
}

export async function processCheckoutReturn(
  params: Record<string, string | undefined>,
  partnerId: string,
): Promise<CheckoutReturnState> {
  const checkout = params.checkout;
  if (!checkout || !['return', 'topup_return', 'cancelled'].includes(checkout)) {
    return null;
  }

  if (checkout === 'cancelled') {
    return { status: 'cancelled' };
  }

  const parsed = resolvePaymentRef(params);
  if (!parsed) {
    return {
      status: 'failed',
      message:
        'We could not match this checkout to a payment. If you were charged, your payment history below will update shortly.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: payment } = await supabase
    .from('campaign_payments')
    .select(
      'id, status, payment_kind, campaign_id, campaign:ad_campaigns(advertiser, package:ad_packages(name))',
    )
    .eq('id', parsed.paymentId)
    .eq('campaign_id', parsed.campaignId)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (!payment) {
    return { status: 'failed', message: 'Payment record not found for this workspace.' };
  }

  const campaign = Array.isArray(payment.campaign) ? payment.campaign[0] : payment.campaign;
  const pkg = campaign?.package
    ? Array.isArray(campaign.package)
      ? campaign.package[0]
      : campaign.package
    : null;
  const kind = payment.payment_kind === 'topup' ? 'topup' : 'initial';

  if (payment.status === 'complete') {
    return {
      status: 'complete',
      kind,
      campaignId: parsed.campaignId,
      packageName: pkg?.name,
    };
  }

  const payfastStatus = String(params.payment_status || '').toUpperCase();
  const payfastFields = payfastFieldsFromParams(params);
  const passphrase = process.env.PAYFAST_PASSPHRASE;

  if (payfastStatus === 'COMPLETE') {
    if (payfastFields.signature && !verifyPayfastSignature(payfastFields, passphrase)) {
      return { status: 'failed', message: 'Could not verify payment signature.' };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await confirmPayfastPayment(admin, parsed, payfastFields);

    if (error) {
      return { status: 'failed', message: 'Payment confirmation failed. Contact support if charged.' };
    }

    return {
      status: 'complete',
      kind,
      campaignId: parsed.campaignId,
      packageName: pkg?.name,
    };
  }

  if (payfastStatus === 'FAILED' || payfastStatus === 'CANCELLED') {
    return { status: 'failed', message: 'Payment was not completed.' };
  }

  return { status: 'pending', kind, campaignId: parsed.campaignId };
}

export async function getCheckoutPaymentStatus(
  campaignId: string,
  paymentId: string,
  partnerId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data: payment } = await supabase
    .from('campaign_payments')
    .select('status, payment_kind')
    .eq('id', paymentId)
    .eq('campaign_id', campaignId)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (!payment) return { status: 'missing' as const };
  if (payment.status === 'complete') return { status: 'complete' as const };
  if (payment.status === 'failed' || payment.status === 'cancelled') {
    return { status: 'failed' as const };
  }
  return { status: 'pending' as const };
}
