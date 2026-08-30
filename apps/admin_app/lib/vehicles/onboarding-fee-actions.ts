'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ActionResult {
  success: boolean;
  message?: string;
}

export async function updateOnboardingFeeTier(formData: FormData): Promise<ActionResult> {
  const category = String(formData.get('category') ?? '');
  const annualFeeRands = Number.parseFloat(String(formData.get('annual_fee_rands') ?? '0'));

  if (!category || Number.isNaN(annualFeeRands) || annualFeeRands <= 0) {
    return { success: false, message: 'Enter a valid annual fee.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('vehicle_onboarding_fee_tiers')
    .update({
      annual_fee_cents: Math.round(annualFeeRands * 100),
      updated_at: new Date().toISOString(),
    })
    .eq('category', category);

  if (error) return { success: false, message: 'Could not update fee tier.' };

  revalidatePath('/payments');
  revalidatePath('/vehicles');
  return { success: true };
}
