import { PageHeader, Panel } from "@/components/trip-media/Surface"
import { tripMediaRoleExplainers } from "@/lib/trip-media/role-content"
import { loadTripMediaSettings } from "@/lib/trip-media/settings"
import { SettingsForms } from "./SettingsForms"

export const dynamic = "force-dynamic"

export default async function TripMediaSettingsPage() {
  const settings = await loadTripMediaSettings()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip Media settings"
        description="The values that shape moderation, fraud detection, and rider rewards. Only Super Admins and Ad Moderators can change them."
      />

      <SettingsForms initial={settings} />

      <Panel
        title="Role responsibilities"
        subtitle="What each Trip Media role can and cannot do. Use this when assigning roles to teammates."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tripMediaRoleExplainers.map((role) => (
            <div key={role.slug} className="rounded-2xl border border-token bg-[color:var(--surface-2)] p-4">
              <div className="text-sm font-semibold tracking-tight">{role.title}</div>
              <p className="mt-1 text-sm muted">{role.summary}</p>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide muted">Can do</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {role.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide muted">Cannot do</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm muted">
                {role.cannot.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
