import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';
import { loadVehicleOnboardingFeeStatus } from '@/lib/vehicles/onboarding-fees';
import { decideVehicle, reviewDocument } from '@/lib/vehicles/actions';
import { storageBucketForPath } from '@/lib/vehicles/storage';
import {
  VehicleReviewClient,
  type VehicleDetail,
  type VehicleDoc,
} from './VehicleReviewClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VehicleReviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: vehicleRaw, error: vehicleErr } = await supabase
    .from('vehicles')
    .select(
      'vehicle_id, registration_number, make, model, colour, category, vin, speedometer_reading, owner_type, owner_details, company_details, status, rejection_reason, linked_driver_id, linked_driver:profiles!vehicles_linked_driver_id_fkey(full_name, cellphone)',
    )
    .eq('vehicle_id', id)
    .maybeSingle();

  if (vehicleErr) {
    return (
      <div className='p-6'>
        <h1 className='text-lg font-semibold'>Vehicle review</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(vehicleErr)}</p>
      </div>
    );
  }

  if (!vehicleRaw) notFound();

  const linked = vehicleRaw.linked_driver as
    | { full_name: string | null; cellphone: string | null }
    | Array<{ full_name: string | null; cellphone: string | null }>
    | null;

  const linkedOne = Array.isArray(linked) ? linked[0] ?? null : linked;

  const vehicle: VehicleDetail = {
    vehicle_id: vehicleRaw.vehicle_id,
    registration_number: vehicleRaw.registration_number,
    make: vehicleRaw.make,
    model: vehicleRaw.model,
    colour: vehicleRaw.colour,
    category: vehicleRaw.category,
    vin: vehicleRaw.vin,
    speedometer_reading: vehicleRaw.speedometer_reading,
    owner_type: vehicleRaw.owner_type,
    owner_details: vehicleRaw.owner_details,
    company_details: vehicleRaw.company_details,
    status: vehicleRaw.status,
    rejection_reason: vehicleRaw.rejection_reason,
    linked_driver_id: vehicleRaw.linked_driver_id,
    linked_driver_name: linkedOne?.full_name ?? null,
    linked_driver_cellphone: linkedOne?.cellphone ?? null,
  };

  const { data: docsRaw, error: docsErr } = await supabase
    .from('documents')
    .select(
      'document_id, document_type, file_path, status, created_at, expiry_date',
    )
    .eq('entity_type', 'VEHICLE')
    .eq('entity_id', id)
    .order('created_at', { ascending: true });

  if (docsErr) {
    return (
      <div className='p-6'>
        <h1 className='text-lg font-semibold'>Vehicle review</h1>
        <p className='mt-2 text-sm text-red-600'>{userFacingError(docsErr)}</p>
      </div>
    );
  }

  const docs: Array<VehicleDoc> = await Promise.all(
    (docsRaw ?? []).map(async (d) => {
      let signedUrl: string | null = null;
      if (d.file_path) {
        const bucket = storageBucketForPath(d.file_path);
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(d.file_path, 60 * 5);
        signedUrl = data?.signedUrl ?? null;
      }
      return {
        document_id: d.document_id,
        document_type: d.document_type,
        file_path: d.file_path,
        status: d.status,
        created_at: d.created_at,
        expiry_date: d.expiry_date,
        signedUrl,
      };
    }),
  );

  const onboardingFee = await loadVehicleOnboardingFeeStatus(id, vehicle.category);

  return (
    <VehicleReviewClient
      vehicle={vehicle}
      docs={docs}
      onboardingFee={onboardingFee}
      reviewDocumentAction={reviewDocument}
      decideVehicleAction={decideVehicle}
    />
  );
}
