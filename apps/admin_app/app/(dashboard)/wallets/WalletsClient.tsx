"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { userFacingError } from "@/lib/user-facing-error";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

type WalletRow = {
  wallet_id: string;
  profile_id: string;
  wallet_type: string;
  balance: number;
  updated_at: string;
};

type ProfileMini = { id: string; full_name: string | null; cellphone: string | null };

export function WalletsClient({
  rows,
  profiles,
}: {
  rows: Array<WalletRow>;
  profiles: Record<string, ProfileMini>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    profile_id: "",
    wallet_type: "RIDER",
    direction: "CREDIT",
    amount: "",
    tx_type: "MANUAL_ADJUST",
    reason: "",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedProfile = useMemo(() => profiles[form.profile_id] ?? null, [profiles, form.profile_id]);

  async function submit() {
    const amount = Number(form.amount);
    if (!form.profile_id || !form.tx_type || !form.reason.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Please fill all fields");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("admin_wallet_adjust", {
      p_profile_id: form.profile_id,
      p_wallet_type: form.wallet_type,
      p_direction: form.direction,
      p_amount: amount,
      p_tx_type: form.tx_type,
      p_reason: form.reason,
      p_reference: null,
      p_metadata: {},
    });

    if (error || !data?.ok) {
      throw new Error(error?.message ?? data?.error ?? "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Wallets</h1>
          <p className="mt-1 text-sm muted">Balances, adjustments, and ledger integrity. All adjustments are audited.</p>
        </div>
        <div className="text-xs muted">Showing latest {rows.length}</div>
      </div>

      <div className="rounded-2xl border border-token surface-1 p-4 shadow-[var(--shadow)]">
        <div className="text-sm font-semibold tracking-tight">Manual adjustment</div>
        <p className="mt-1 text-xs muted">Use this sparingly; always include an operationally specific reason.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            value={form.profile_id}
            onChange={(e) => setForm((v) => ({ ...v, profile_id: e.target.value }))}
            placeholder="Profile ID (uuid)"
            className="h-10 rounded-lg border border-token bg-transparent px-3 text-sm md:col-span-2"
          />
          <select
            value={form.wallet_type}
            onChange={(e) => setForm((v) => ({ ...v, wallet_type: e.target.value }))}
            className="h-10 rounded-lg border border-token bg-transparent px-2 text-sm"
          >
            <option value="RIDER">RIDER</option>
            <option value="DRIVER">DRIVER</option>
          </select>
          <select
            value={form.direction}
            onChange={(e) => setForm((v) => ({ ...v, direction: e.target.value }))}
            className="h-10 rounded-lg border border-token bg-transparent px-2 text-sm"
          >
            <option value="CREDIT">CREDIT</option>
            <option value="DEBIT">DEBIT</option>
          </select>
          <input
            value={form.amount}
            onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount"
            className="h-10 rounded-lg border border-token bg-transparent px-3 text-sm"
          />
          <input
            value={form.tx_type}
            onChange={(e) => setForm((v) => ({ ...v, tx_type: e.target.value }))}
            placeholder="Type (e.g. MANUAL_ADJUST)"
            className="h-10 rounded-lg border border-token bg-transparent px-3 text-sm"
          />

          <input
            value={form.reason}
            onChange={(e) => setForm((v) => ({ ...v, reason: e.target.value }))}
            placeholder="Reason (required)"
            className="h-10 rounded-lg border border-token bg-transparent px-3 text-sm md:col-span-5"
          />
          <button
            type="button"
            className="h-10 rounded-lg bg-[var(--brand-red)] text-sm font-semibold text-white hover:brightness-95 md:col-span-1"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
          >
            Review
          </button>
        </div>

        {selectedProfile ? (
          <div className="mt-3 text-xs muted">
            Target: <span className="font-semibold text-[color:var(--foreground)]">{selectedProfile.full_name ?? "Unnamed"}</span>{" "}
            • {selectedProfile.cellphone ?? "—"}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
        <table className="w-full text-sm">
          <thead className="border-b border-token bg-[var(--surface-1)] text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Owner</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Type</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Balance</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = profiles[r.profile_id];
              return (
                <tr key={r.wallet_id} className="border-b border-token hover:bg-black/3 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{p?.full_name ?? "Unnamed"}</div>
                    <div className="text-xs muted">{p?.cellphone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">{r.wallet_type}</td>
                  <td className="px-4 py-3 font-semibold">{r.balance}</td>
                  <td className="px-4 py-3 text-xs muted">{new Date(r.updated_at).toLocaleString()}</td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm muted" colSpan={4}>
                  No wallets found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm wallet adjustment"
        description={`This will ${form.direction.toLowerCase()} ${form.amount || "—"} to a ${form.wallet_type} wallet and write an audit log.`}
        confirmLabel="Apply adjustment"
        destructive={form.direction === "DEBIT"}
        onConfirm={() => {
          startTransition(async () => {
            try {
              await submit();
              toast.success("Adjustment applied");
              setForm((v) => ({ ...v, amount: "", reason: "" }));
              router.refresh();
            } catch (e) {
              toast.error(userFacingError(e));
            }
          });
        }}
      />
    </div>
  );
}

