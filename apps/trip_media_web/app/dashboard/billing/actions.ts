'use server';

import { redirect } from 'next/navigation';

/** @deprecated Subscriptions replaced by per-campaign checkout. */
export async function createPayfastCheckout() {
  redirect('/dashboard/campaigns/new');
}
