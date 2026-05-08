"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

type AdminRow = {
  user_id: string;
  role: string;
  disabled_at: string | null;
  created_at: string | null;
};

export function AdminsClient({ rows }: { rows: Array<AdminRow> }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<null | { userId: string; nextDisabledAt: string | null }>(null);
  const [isPending, startTransition] = useTransition();

  async function setDisabled(userId: string, disabled: boolean) {
    const supabase = createSupabaseBrowserClient();
    const nextDisabledAt = disabled ? new Date().toISOString() : null;
    const { error } = await supabase.from("admin_profiles").update({ disabled_at: nextDisabledAt }).eq("user_id", userId);
    if (error) throw error;

    await supabase.rpc("admin_audit_log", {
      p_action: disabled ? "admin.disable" : "admin.enable",
      p_entity_type: "admin_profiles",
      p_entity_id: userId,
      p_reason: disabled ? "Disabled admin access" : "Re-enabled admin access",
      p_metadata: {},
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admins</h1>
        <p className="mt-1 text-sm muted">Manage access to the console. All changes are audited.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
        <table className="w-full text-sm">
          <thead className="border-b border-token bg-[var(--surface-1)] text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Admin</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const disabled = !!r.disabled_at;
              return (
                <tr key={r.user_id} className="border-b border-token hover:bg-black/3 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">User ending {r.user_id.slice(-6)}</div>
                    <div className="text-xs muted">{r.created_at ? `Created ${new Date(r.created_at).toLocaleDateString()}` : "—"}</div>
                  </td>
                  <td className="px-4 py-3">{r.role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${disabled ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                      {disabled ? "disabled" : "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      className="rounded-lg border border-token px-3 py-1.5 text-sm font-semibold hover:border-[var(--brand-red)]"
                      onClick={() =>
                        setConfirm({ userId: r.user_id, nextDisabledAt: disabled ? null : new Date().toISOString() })
                      }
                    >
                      {disabled ? "Re-enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm muted" colSpan={4}>
                  No admins found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => (o ? null : setConfirm(null))}
        title="Confirm admin access change"
        description="This will update admin access and create an audit log entry."
        confirmLabel={confirm?.nextDisabledAt ? "Disable admin" : "Re-enable admin"}
        destructive={!!confirm?.nextDisabledAt}
        onConfirm={() => {
          if (!confirm) return;
          const disabled = !!confirm.nextDisabledAt;
          startTransition(async () => {
            try {
              await setDisabled(confirm.userId, disabled);
              toast.success("Admin updated");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
      />
    </div>
  );
}

