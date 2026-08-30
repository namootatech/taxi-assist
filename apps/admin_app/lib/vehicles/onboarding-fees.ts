import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface OnboardingFeeTier {
  category: string;
  annualFeeCents: number;
  currency: string;
  isActive: boolean;
}

export interface VehicleOnboardingFeeStatus {
  status: string;
  annualFeeCents: number;
  waivedUntil: string | null;
  paidUntil: string | null;
  paymentRequired: boolean;
}

export interface OnboardingPaymentRow {
  id: string;
  vehicleId: string;
  driverId: string;
  amountCents: number;
  status: string;
  paidAt: string | null;
  periodEnd: string | null;
  createdAt: string;
  registrationNumber: string | null;
  driverName: string | null;
  category: string | null;
}

const formatZar = (cents: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);

export { formatZar as formatOnboardingFeeZar };

export async function loadOnboardingFeeTiers(): Promise<Array<OnboardingFeeTier>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('vehicle_onboarding_fee_tiers')
    .select('category, annual_fee_cents, currency, is_active')
    .order('annual_fee_cents');

  return (data ?? []).map((row) => ({
    category: row.category,
    annualFeeCents: row.annual_fee_cents,
    currency: row.currency,
    isActive: row.is_active,
  }));
}

export async function loadVehicleOnboardingFeeStatus(
  vehicleId: string,
  category: string | null,
): Promise<VehicleOnboardingFeeStatus | null> {
  const supabase = await createSupabaseServerClient();
  const [{ data: vehicle }, tiers] = await Promise.all([
    supabase
      .from('vehicles')
      .select('onboarding_fee_status, onboarding_fee_waived_until, onboarding_fee_paid_until')
      .eq('vehicle_id', vehicleId)
      .maybeSingle(),
    loadOnboardingFeeTiers(),
  ]);

  if (!vehicle) return null;

  const tier = tiers.find((t) => t.category === category);
  const now = Date.now();
  const waivedUntil = vehicle.onboarding_fee_waived_until;
  const paidUntil = vehicle.onboarding_fee_paid_until;
  const paymentRequired =
    !(paidUntil && new Date(paidUntil).getTime() > now) &&
    !(waivedUntil && new Date(waivedUntil).getTime() > now);

  return {
    status: vehicle.onboarding_fee_status ?? 'waived_first_year',
    annualFeeCents: tier?.annualFeeCents ?? 0,
    waivedUntil,
    paidUntil,
    paymentRequired,
  };
}

export async function loadOnboardingPayments(limit = 50): Promise<Array<OnboardingPaymentRow>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('vehicle_onboarding_payments')
    .select(
      'id, vehicle_id, driver_id, amount_cents, status, paid_at, period_end, created_at, vehicle:vehicles(registration_number, category), driver:profiles!vehicle_onboarding_payments_driver_id_fkey(full_name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const vehicle = Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle;
    const driver = Array.isArray(row.driver) ? row.driver[0] : row.driver;
    return {
      id: row.id,
      vehicleId: row.vehicle_id,
      driverId: row.driver_id,
      amountCents: row.amount_cents,
      status: row.status,
      paidAt: row.paid_at,
      periodEnd: row.period_end,
      createdAt: row.created_at,
      registrationNumber: vehicle?.registration_number ?? null,
      driverName: driver?.full_name ?? null,
      category: vehicle?.category ?? null,
    };
  });
}
