'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  updateCampaignPackageAction,
  updatePlatformPromotionAction,
} from '@/lib/trip-media/server-actions';
import type { CampaignPackageRow } from '@/lib/trip-media/packages';
import type { PlatformPromotionRow } from '@/lib/trip-media/promotions';

const formatZar = (cents: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function PackagesConsole({
  packages,
  promotions,
}: {
  packages: Array<CampaignPackageRow>;
  promotions: Array<PlatformPromotionRow>;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Standard packages</h2>
        <p className="text-sm muted">
          Partners buy a package plus extra impressions. Price scales as (base price ÷ 1,000) × impressions purchased.
        </p>
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Prelaunch promotion</h2>
        <p className="text-sm muted">
          Auto-applies 50% discount and once-per-partner bonus impressions while the window is active.
        </p>
        {promotions.map((promo) => (
          <PromotionCard key={promo.id} promo={promo} />
        ))}
        {promotions.length === 0 ? (
          <p className="text-sm muted">No promotions configured.</p>
        ) : null}
      </section>
    </div>
  );
}

function PackageCard({ pkg }: { pkg: CampaignPackageRow }) {
  const [pending, startTransition] = useTransition();
  const [basePriceRands, setBasePriceRands] = useState(String(pkg.basePriceCents / 100));
  const [minImpressions, setMinImpressions] = useState(String(pkg.minImpressions));
  const [maxDuration, setMaxDuration] = useState(String(pkg.maxDurationSeconds ?? 20));
  const [skipAfter, setSkipAfter] = useState(String(pkg.skipAfterSeconds ?? 5));
  const [riderPayoutRands, setRiderPayoutRands] = useState(
    String((pkg.riderPayoutCents ?? 0) / 100),
  );
  const [description, setDescription] = useState(pkg.description);
  const [isActive, setIsActive] = useState(pkg.isActive);

  const costPerImpression = pkg.basePriceCents / pkg.minImpressions;

  const save = () => {
    startTransition(async () => {
      const result = await updateCampaignPackageAction({
        packageId: pkg.id,
        basePriceCents: Math.round(Number.parseFloat(basePriceRands) * 100),
        minImpressions: Number.parseInt(minImpressions, 10),
        maxDurationSeconds: Number.parseInt(maxDuration, 10),
        skipAfterSeconds: Number.parseInt(skipAfter, 10),
        riderPayoutCents: Math.round(Number.parseFloat(riderPayoutRands) * 100),
        description,
        isActive,
      });
      if (result.ok) toast.success(`${pkg.name} saved`);
      else toast.error(result.error ?? 'Could not save package.');
    });
  };

  return (
    <div className="rounded-2xl border border-token surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{pkg.name}</div>
          <div className="text-xs muted">{pkg.slug}</div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        <Field label="Base price (R)" value={basePriceRands} onChange={setBasePriceRands} />
        <Field label="Min impressions" value={minImpressions} onChange={setMinImpressions} />
        <div className="rounded-lg border border-token bg-[color:var(--surface-2)] px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide muted">Per impression</div>
          <div className="mt-1 font-semibold">{formatZar(costPerImpression)}</div>
        </div>
        <Field label="Max duration (sec)" value={maxDuration} onChange={setMaxDuration} />
        <Field label="Skip after (sec)" value={skipAfter} onChange={setSkipAfter} />
        <Field label="Rider payout (R/view)" value={riderPayoutRands} onChange={setRiderPayoutRands} step="0.01" />
      </div>

      <label className="mt-3 grid gap-1 text-sm">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-16 rounded-lg border border-token bg-transparent p-2 text-sm"
        />
      </label>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="h-10 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : `Save ${pkg.name}`}
        </button>
      </div>
    </div>
  );
}

function PromotionCard({ promo }: { promo: PlatformPromotionRow }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(promo.name);
  const [startAt, setStartAt] = useState(toDatetimeLocal(promo.startAt));
  const [endAt, setEndAt] = useState(toDatetimeLocal(promo.endAt));
  const [discountPct, setDiscountPct] = useState(String(promo.discountPct));
  const [bonusImpressions, setBonusImpressions] = useState(String(promo.bonusImpressions));
  const [isActive, setIsActive] = useState(promo.isActive);

  const save = () => {
    startTransition(async () => {
      const result = await updatePlatformPromotionAction({
        promotionId: promo.id,
        name,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        discountPct: Number.parseFloat(discountPct),
        bonusImpressions: Number.parseInt(bonusImpressions, 10),
        isActive,
      });
      if (result.ok) toast.success('Promotion saved');
      else toast.error(result.error ?? 'Could not save promotion.');
    });
  };

  return (
    <div className="rounded-2xl border border-token surface-1 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{promo.slug}</div>
          <div className="text-xs muted">Once per partner bonus impressions</div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
      <div className="mt-3 grid gap-3">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Start" value={startAt} onChange={setStartAt} type="datetime-local" />
        <Field label="End" value={endAt} onChange={setEndAt} type="datetime-local" />
        <Field label="Discount %" value={discountPct} onChange={setDiscountPct} step="0.01" />
        <Field label="Bonus impressions" value={bonusImpressions} onChange={setBonusImpressions} />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="h-10 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save promotion'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide muted">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-token bg-transparent px-3"
      />
    </label>
  );
}
