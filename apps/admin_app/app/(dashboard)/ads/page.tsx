import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActionError, logActionInfo } from "@/lib/server-action-logger";
import { userFacingError } from "@/lib/user-facing-error";
import { redirect } from "next/navigation";

type CampaignRow = {
  campaign_id: string;
  advertiser: string;
  status: string;
  max_views: number | null;
  current_views: number;
  reward_per_view: number;
  created_at: string;
};

export default async function AdsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ad_campaigns")
    .select(
      "campaign_id, advertiser, status, max_views, current_views, reward_per_view, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  async function create(formData: FormData) {
    "use server";
    const advertiser = String(formData.get("advertiser") ?? "");
    const videoPath = String(formData.get("video_path") ?? "");
    const reward = Number(formData.get("reward_per_view") ?? 0);
    logActionInfo("admin.ads.create", "started", { hasAdvertiser: Boolean(advertiser), hasVideoPath: Boolean(videoPath), reward });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("ad_campaigns").insert({
      advertiser,
      video_path: videoPath,
      reward_per_view: reward,
      target_json: {},
      status: "ACTIVE",
    });

    if (error) {
      logActionError("admin.ads.create", "insert_failed", error, { hasAdvertiser: Boolean(advertiser), hasVideoPath: Boolean(videoPath) });
      redirect(`/ads?error=${encodeURIComponent(userFacingError(error))}`);
    }

    logActionInfo("admin.ads.create", "completed", { hasAdvertiser: Boolean(advertiser) });
    redirect("/ads");
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Ads</h1>
        <p className="mt-2 text-sm text-red-600">{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as CampaignRow[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">Ad campaigns</h1>
        <p className="text-sm text-zinc-600">Showing latest {rows.length}</p>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-medium">Create campaign</div>
        <p className="mt-1 text-xs text-zinc-600">
          Targeting options are simplified for this MVP.
        </p>
        <form action={create} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input
            name="advertiser"
            placeholder="Advertiser"
            className="h-9 rounded-md border px-3 text-xs sm:col-span-2"
            required
          />
          <input
            name="video_path"
            placeholder="Video path in storage (e.g. folder/file.mp4)"
            className="h-9 rounded-md border px-3 text-xs sm:col-span-3"
            required
          />
          <input
            name="reward_per_view"
            type="number"
            step="0.01"
            min="0"
            placeholder="Reward/view"
            className="h-9 rounded-md border px-3 text-xs"
            required
          />
          <button className="h-9 rounded-md bg-black text-xs font-medium text-white sm:col-span-6 sm:w-40">
            Create
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Advertiser</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Reward/view</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.campaign_id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.advertiser}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-600">{r.campaign_id}</div>
                </td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">
                  {r.current_views}
                  {r.max_views != null ? <span className="text-zinc-500"> / {r.max_views}</span> : null}
                </td>
                <td className="px-4 py-3">{r.reward_per_view}</td>
                <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>
                  No campaigns yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

