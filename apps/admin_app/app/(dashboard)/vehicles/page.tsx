import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';
import {
  VehiclesTableClient,
  type VehicleListRow,
} from './VehiclesTableClient';

export default async function VehiclesPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('vehicles')
    .select(
      'vehicle_id, registration_number, make, model, colour, category, status, linked_driver_id, updated_at, linked_driver:profiles!vehicles_linked_driver_id_fkey(full_name, cellphone)',
    )
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className='p-6'>
        <h1 className='text-lg font-semibold'>Vehicles</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as VehicleListRow[];

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>
        <div>
          <h1 className='text-xl font-semibold tracking-tight'>Vehicles</h1>
          <p className='mt-1 text-sm muted'>
            Review pending vehicles, inspect documents, and approve or reject
            with an audited reason.
          </p>
        </div>
        <p className='text-xs muted'>Showing latest {rows.length}</p>
      </div>

      <VehiclesTableClient rows={rows} />
    </div>
  );
}
