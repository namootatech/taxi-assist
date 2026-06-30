'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { createInternalTripAd, setInternalTripAdStatus } from './actions';

interface InternalAd {
  id: string;
  title: string;
  storage_path: string;
  status: string;
  sort_order: number;
  cta_url: string | null;
}

export function InternalAdsManager({ ads }: { ads: InternalAd[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-token surface-1 p-4">
        <h2 className="text-lg font-semibold">Active rotation</h2>
        <p className="mt-1 text-sm muted">Paid ad 1 → Paid ad 2 → Trip internal ad → repeat</p>
        <ul className="mt-4 space-y-3">
          {ads.map((ad) => (
            <li key={ad.id} className="rounded-xl border border-token p-3 text-sm">
              <div className="font-semibold">{ad.title}</div>
              <div className="mt-1 text-xs muted">{ad.storage_path}</div>
              <div className="mt-2 flex gap-2">
                <span className="rounded-full border border-token px-2 py-0.5 text-xs">{ad.status}</span>
                {ad.status === 'active' ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setInternalTripAdStatus(ad.id, 'paused');
                        if (!r.ok) toast.error(r.error);
                        else toast.success('Ad paused');
                      })
                    }
                    className="text-xs text-[var(--brand-red)]"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setInternalTripAdStatus(ad.id, 'active');
                        if (!r.ok) toast.error(r.error);
                        else toast.success('Ad activated');
                      })
                    }
                    className="text-xs text-[var(--brand-red)]"
                  >
                    Activate
                  </button>
                )}
              </div>
            </li>
          ))}
          {ads.length === 0 ? <p className="text-sm muted">No internal ads yet.</p> : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-token surface-1 p-4">
        <h2 className="text-lg font-semibold">Add internal ad</h2>
        <form
          className="mt-4 grid gap-3 text-sm"
          action={(fd) =>
            startTransition(async () => {
              const r = await createInternalTripAd(fd);
              if (!r.ok) toast.error(r.error ?? 'Could not create ad');
              else toast.success('Internal ad created');
            })
          }
        >
          <label className="grid gap-1">
            Title
            <input name="title" required className="rounded-lg border border-token bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1">
            Storage path
            <input name="storage_path" required placeholder="internal/promo.mp4" className="rounded-lg border border-token bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1">
            CTA URL (optional)
            <input name="cta_url" type="url" className="rounded-lg border border-token bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1">
            Sort order
            <input name="sort_order" type="number" defaultValue={100} className="rounded-lg border border-token bg-transparent px-3 py-2" />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-10 rounded-lg bg-[var(--brand-red)] text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Create ad'}
          </button>
        </form>
      </section>
    </div>
  );
}
