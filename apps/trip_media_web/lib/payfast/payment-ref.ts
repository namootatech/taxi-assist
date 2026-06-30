export type PayfastPaymentKind = 'campaign' | 'topup';

export interface ParsedPayfastPaymentRef {
  kind: PayfastPaymentKind;
  campaignId: string;
  paymentId: string;
}

export function parsePayfastPaymentRef(mPaymentId: string): ParsedPayfastPaymentRef | null {
  const parts = mPaymentId.split(':');
  if (parts[0] === 'campaign' && parts.length >= 3) {
    return { kind: 'campaign', campaignId: parts[1], paymentId: parts[2] };
  }
  if (parts[0] === 'topup' && parts.length >= 3) {
    return { kind: 'topup', campaignId: parts[1], paymentId: parts[2] };
  }
  return null;
}

export function buildPayfastPaymentRef(
  kind: PayfastPaymentKind,
  campaignId: string,
  paymentId: string,
): string {
  return `${kind === 'campaign' ? 'campaign' : 'topup'}:${campaignId}:${paymentId}`;
}

export function buildBillingReturnUrl(
  siteUrl: string,
  input: {
    campaignId: string;
    paymentId: string;
    kind: 'initial' | 'topup';
  },
): string {
  const url = new URL('/dashboard/billing', siteUrl);
  url.searchParams.set('checkout', input.kind === 'topup' ? 'topup_return' : 'return');
  url.searchParams.set('campaign', input.campaignId);
  url.searchParams.set('payment', input.paymentId);
  return url.toString();
}
