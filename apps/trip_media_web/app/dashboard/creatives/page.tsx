import { redirect } from 'next/navigation';
import { FileVideo } from 'lucide-react';
import { getPartnerContext } from '@/lib/partner';
import { canManageCreatives } from '@/lib/permissions';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { CreativeCard } from './CreativeCard';
import { CreativeUploader } from './CreativeUploader';

export const dynamic = 'force-dynamic';

export default async function CreativesPage() {
  const context = await getPartnerContext();

  if (!context) {
    redirect('/signup?setup=partner&next=/dashboard/creatives');
  }

  const supabase = await createClerkSupabaseServerClient();
  const { data: creatives } = await supabase
    .from('ad_creatives')
    .select(
      'id, title, mime_type, status, review_note, created_at, duration_seconds, storage_path',
    )
    .eq('partner_id', context.partner.id)
    .order('created_at', { ascending: false });

  const creativeIds = (creatives ?? []).map((entry) => entry.id);

  let linkedCounts = new Map<string, number>();
  if (creativeIds.length > 0) {
    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('creative_id')
      .eq('partner_id', context.partner.id)
      .in('creative_id', creativeIds);
    for (const row of campaigns ?? []) {
      if (!row.creative_id) continue;
      linkedCounts.set(
        row.creative_id,
        (linkedCounts.get(row.creative_id) ?? 0) + 1,
      );
    }
  }

  const canManage = canManageCreatives(context.member.role);

  return (
    <div className='space-y-8'>
      <header>
        <p className='text-xs font-black uppercase tracking-[0.22em] text-red-200'>
          Creatives
        </p>
        <h1 className='mt-2 text-4xl font-black tracking-[-0.04em]'>
          Creative library
        </h1>
        <p className='mt-2 max-w-2xl text-sm muted'>
          Creatives are the videos and images riders see during trips. Upload,
          review, and submit assets here. Each upload is private to your
          workspace until our reviewers approve it.
        </p>
      </header>

      <section className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='panel rounded-3xl p-6'>
          <div className='flex items-center gap-3'>
            <FileVideo className='size-5 text-red-200' aria-hidden />
            <h2 className='text-lg font-black tracking-[-0.02em]'>
              Upload a creative
            </h2>
          </div>
          <p className='mt-2 text-sm muted'>
            Files upload directly to your private partner bucket. We capture
            duration for videos so reviewers can plan delivery time.
          </p>
          {canManage ? (
            <div className='mt-4'>
              <CreativeUploader partnerId={context.partner.id} />
            </div>
          ) : (
            <div className='mt-4 rounded-2xl border border-amber-400/40 bg-amber-300/10 p-4 text-sm text-amber-100'>
              Viewers cannot upload creatives. Ask an owner, admin, or operator
              on your team.
            </div>
          )}
        </div>

        <div className='space-y-4'>
          {(creatives ?? []).length === 0 ? (
            <div className='panel rounded-3xl p-6'>
              <h2 className='text-2xl font-black tracking-[-0.02em]'>
                No creatives yet
              </h2>
              <p className='mt-2 text-sm muted'>
                Upload your first asset so your campaign drafts have something
                to deliver.
              </p>
            </div>
          ) : (
            (creatives ?? []).map((creative) => (
              <CreativeCard
                key={creative.id}
                creative={{
                  id: creative.id,
                  title: creative.title,
                  mime_type: creative.mime_type,
                  status: creative.status,
                  duration_seconds: creative.duration_seconds,
                  created_at: creative.created_at,
                  review_note: creative.review_note,
                  storage_path: creative.storage_path,
                  linked_campaigns: linkedCounts.get(creative.id) ?? 0,
                }}
                canManage={canManage}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
