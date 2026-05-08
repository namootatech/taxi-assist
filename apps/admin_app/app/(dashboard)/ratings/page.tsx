import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/user-facing-error";

type RatingRow = {
  rating_id: string;
  trip_id: string;
  rider_id: string;
  driver_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default async function RatingsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("driver_ratings")
    .select("rating_id, trip_id, rider_id, driver_id, rating, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ratings</h1>
        <p className="mt-2 text-sm text-red-600">{userFacingError(error)}</p>
      </div>
    );
  }

  const rows = (data ?? []) as RatingRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ratings</h1>
        <p className="mt-1 text-sm muted">Driver ratings and reviews (admin view).</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
        <table className="w-full text-sm">
          <thead className="border-b border-token bg-[var(--surface-1)] text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Rating</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">Comment</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide muted">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rating_id} className="border-b border-token hover:bg-black/3 last:border-b-0">
                <td className="px-4 py-3">
                  <div className="text-lg font-semibold">{r.rating} / 5</div>
                  <div className="text-xs muted">Trip ending {r.trip_id.slice(-6)}</div>
                </td>
                <td className="px-4 py-3">{r.comment ?? <span className="text-xs muted">—</span>}</td>
                <td className="px-4 py-3 text-xs muted">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm muted" colSpan={3}>
                  No ratings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

