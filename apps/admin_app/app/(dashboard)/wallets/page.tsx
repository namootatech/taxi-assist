import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type WalletRow = {
  wallet_id: string;
  profile_id: string;
  wallet_type: string;
  balance: number;
  updated_at: string;
};

export default async function WalletsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("wallets")
    .select("wallet_id, profile_id, wallet_type, balance, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  async function adjust(formData: FormData) {
    "use server";
    const profileId = String(formData.get("profile_id") ?? "");
    const walletType = String(formData.get("wallet_type") ?? "");
    const direction = String(formData.get("direction") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    const txType = String(formData.get("tx_type") ?? "");
    const reason = String(formData.get("reason") ?? "");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_wallet_adjust", {
      p_profile_id: profileId,
      p_wallet_type: walletType,
      p_direction: direction,
      p_amount: amount,
      p_tx_type: txType,
      p_reason: reason,
      p_reference: null,
      p_metadata: {},
    });

    if (error || !data?.ok) {
      redirect(`/wallets?error=${encodeURIComponent(error?.message ?? data?.error ?? "Failed")}`);
    }

    redirect("/wallets");
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Wallets</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as WalletRow[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Wallets</h1>
        <p className="text-sm text-zinc-600">Showing latest {rows.length}</p>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-medium">Manual adjustment</div>
        <p className="mt-1 text-xs text-zinc-600">
          Requires a reason and will be written to audit logs.
        </p>
        <form action={adjust} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input
            name="profile_id"
            placeholder="profile_id (uuid)"
            className="h-9 rounded-md border px-3 text-xs sm:col-span-2"
            required
          />
          <select
            name="wallet_type"
            className="h-9 rounded-md border px-2 text-xs"
            defaultValue="RIDER"
          >
            <option value="RIDER">RIDER</option>
            <option value="DRIVER">DRIVER</option>
          </select>
          <select
            name="direction"
            className="h-9 rounded-md border px-2 text-xs"
            defaultValue="CREDIT"
          >
            <option value="CREDIT">CREDIT</option>
            <option value="DEBIT">DEBIT</option>
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="amount"
            className="h-9 rounded-md border px-3 text-xs"
            required
          />
          <input
            name="tx_type"
            placeholder="type (e.g. MANUAL_ADJUST)"
            className="h-9 rounded-md border px-3 text-xs"
            required
          />
          <input
            name="reason"
            placeholder="reason (required)"
            className="h-9 rounded-md border px-3 text-xs sm:col-span-5"
            required
          />
          <button className="h-9 rounded-md bg-black text-xs font-medium text-white sm:col-span-1">
            Submit
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Profile</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.wallet_id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-mono text-xs">{r.wallet_id}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.profile_id}</td>
                <td className="px-4 py-3">{r.wallet_type}</td>
                <td className="px-4 py-3">{r.balance}</td>
                <td className="px-4 py-3">{new Date(r.updated_at).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>
                  No wallets found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

