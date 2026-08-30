'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userFacingError } from '@/lib/user-facing-error';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function decideVehicle(formData: FormData): Promise<ActionResult> {
  const vehicleId = String(formData.get('vehicle_id') ?? '');
  const decision = String(formData.get('decision') ?? '').toUpperCase();
  const reason = String(formData.get('reason') ?? '').trim();

  if (!vehicleId || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
    return { ok: false, error: 'Invalid request' };
  }
  if (!reason) {
    return { ok: false, error: 'Reason is required' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: 'Not authenticated' };
  }

  if (decision === 'APPROVED') {
    const { data: vehicleDocs, error: docsErr } = await supabase
      .from('documents')
      .select('document_id, status')
      .eq('entity_type', 'VEHICLE')
      .eq('entity_id', vehicleId);

    if (docsErr) {
      return { ok: false, error: userFacingError(docsErr) };
    }

    const docs = vehicleDocs ?? [];
    if (!docs.length) {
      return { ok: false, error: 'Vehicle has no documents to review' };
    }

    const pendingCount = docs.filter(
      (d) => String(d.status ?? '').toUpperCase() === 'PENDING',
    ).length;
    if (pendingCount > 0) {
      return {
        ok: false,
        error: `You still have ${pendingCount} pending vehicle document(s). Review them first.`,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('vehicles')
    .update(
      decision === 'APPROVED'
        ? {
            status: 'APPROVED',
            rejection_reason: null,
            rejected_at: null,
            updated_at: nowIso,
          }
        : {
            status: 'REJECTED',
            rejection_reason: reason,
            rejected_at: nowIso,
            updated_at: nowIso,
          },
    )
    .eq('vehicle_id', vehicleId);

  if (updateErr) {
    return { ok: false, error: userFacingError(updateErr) };
  }

  await supabase.rpc('admin_audit_log', {
    p_action: decision === 'APPROVED' ? 'vehicle.approve' : 'vehicle.reject',
    p_entity_type: 'vehicles',
    p_entity_id: vehicleId,
    p_reason: reason,
    p_metadata: {},
  });

  return { ok: true };
}

export async function reviewDocument(formData: FormData): Promise<ActionResult> {
  const docId = String(formData.get('document_id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (!docId || (decision !== 'APPROVED' && decision !== 'DECLINED')) {
    return { ok: false, error: 'Invalid request' };
  }
  if (!reason) {
    return { ok: false, error: 'Reason is required' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const { error: updateErr } = await supabase
    .from('documents')
    .update({
      status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      decline_reason: decision === 'DECLINED' ? reason : null,
    })
    .eq('document_id', docId);

  if (updateErr) {
    return { ok: false, error: userFacingError(updateErr) };
  }

  await supabase.rpc('admin_audit_log', {
    p_action: decision === 'APPROVED' ? 'document.approve' : 'document.decline',
    p_entity_type: 'documents',
    p_entity_id: docId,
    p_reason: reason,
    p_metadata: {},
  });

  return { ok: true };
}
