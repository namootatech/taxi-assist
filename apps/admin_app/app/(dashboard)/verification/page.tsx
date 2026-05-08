import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/user-facing-error";
import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";
import { VerificationQueueClient } from "./VerificationQueueClient";

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

  function storageBucketForPath(filePath: string) {
    const parts = filePath.split("/");
    if (parts.length >= 4 && parts[1] === "vehicle") {
      const file = parts[3] ?? "";
      if (
        file.startsWith("front_") ||
        file.startsWith("left_") ||
        file.startsWith("right_") ||
        file.startsWith("rear_") ||
        file.startsWith("speedo_")
      ) {
        return "vehicle-photos";
      }
    }
    return "driver-documents";
  }

  async function signedUrlFor(doc: DocRow) {
    const filePath = doc.file_path;
    if (!filePath) return null;

    // Bucket is derived from the stored file path (vehicle photos vs general docs).
    const bucket = storageBucketForPath(filePath);
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
      redirect(`/verification?error=${encodeURIComponent(userFacingError(updateErr))}`);
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
        <p className="mt-2 text-sm text-red-600">{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as DocRow[];
  const signedUrls = await Promise.all(rows.map((r) => signedUrlFor(r)));

  return (
    <div className="space-y-4">
      <RealtimeRefresh table="documents" />
      <VerificationQueueClient
        effectiveStatus={effectiveStatus}
        rows={rows.map((r, idx) => ({ ...r, signedUrl: (signedUrls[idx] as string | null) ?? null }))}
        reviewAction={review}
      />
    </div>
  );
}

