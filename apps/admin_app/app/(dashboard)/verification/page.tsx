import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";

type DocRow = {
  document_id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_path?: string;
  status: string;
  created_at: string;
  expiry_date: string | null;
};

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { status } = await searchParams;
  const effectiveStatus = status ?? "PENDING";

  const { data, error } = await supabase
    .from("documents")
    .select(
      "document_id, entity_type, entity_id, document_type, file_path, status, created_at, expiry_date",
    )
    .eq("status", effectiveStatus)
    .order("created_at", { ascending: true })
    .limit(100);

  async function signedUrlFor(doc: DocRow) {
    const filePath = doc.file_path;
    if (!filePath) return null;

    // Current schema uses two buckets and stores relative object paths in file_path.
    const bucket = doc.entity_type === "VEHICLE" ? "vehicle-photos" : "driver-documents";
    const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60 * 5);
    return data?.signedUrl ?? null;
  }

  async function review(formData: FormData) {
    "use server";
    const docId = String(formData.get("document_id") ?? "");
    const decision = String(formData.get("decision") ?? "");
    const reason = String(formData.get("reason") ?? "");

    if (!docId || (decision !== "APPROVED" && decision !== "DECLINED")) {
      redirect("/verification?error=invalid_request");
    }
    if (!reason.trim()) {
      redirect(`/verification?error=${encodeURIComponent("Reason is required")}`);
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      redirect("/login");
    }

    const { error: updateErr } = await supabase
      .from("documents")
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        decline_reason: decision === "DECLINED" ? reason : null,
      })
      .eq("document_id", docId);

    if (updateErr) {
      redirect(`/verification?error=${encodeURIComponent(updateErr.message)}`);
    }

    await supabase.rpc("admin_audit_log", {
      p_action: decision === "APPROVED" ? "document.approve" : "document.decline",
      p_entity_type: "documents",
      p_entity_id: docId,
      p_reason: reason,
      p_metadata: {},
    });

    redirect("/verification");
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Verification</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as DocRow[];
  const signedUrls = await Promise.all(rows.map((r) => signedUrlFor(r)));

  return (
    <div className="p-6">
      <RealtimeRefresh table="documents" />
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Verification queue</h1>
        <p className="text-sm text-zinc-600">
          {effectiveStatus} • {rows.length} items
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Doc</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
              <th className="px-4 py-3 font-medium">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.document_id} className="border-b last:border-b-0 align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.document_type}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-600">{r.document_id}</div>
                  {signedUrls[idx] ? (
                    <a
                      className="mt-2 inline-block text-xs font-medium text-blue-700 hover:underline"
                      href={signedUrls[idx] as string}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View document (signed)
                    </a>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.entity_type}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-600">{r.entity_id}</div>
                </td>
                <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">{r.expiry_date ?? "—"}</td>
                <td className="px-4 py-3">
                  <form action={review} className="space-y-2">
                    <input type="hidden" name="document_id" value={r.document_id} />
                    <div className="flex flex-wrap gap-2">
                      <button
                        name="decision"
                        value="APPROVED"
                        className="h-9 rounded-md border bg-white px-3 text-xs font-medium hover:bg-zinc-50"
                      >
                        Approve
                      </button>
                      <button
                        name="decision"
                        value="DECLINED"
                        className="h-9 rounded-md border bg-white px-3 text-xs font-medium hover:bg-zinc-50"
                      >
                        Decline
                      </button>
                    </div>
                    <input
                      name="reason"
                      placeholder="Reason (required)"
                      className="h-9 w-full rounded-md border px-3 text-xs"
                      required
                    />
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>
                  No items.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

