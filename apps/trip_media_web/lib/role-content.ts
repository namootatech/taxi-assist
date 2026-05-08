import type { PartnerRole } from "@/lib/permissions"

export interface RoleExplainer {
  role: PartnerRole
  title: string
  summary: string
  responsibilities: Array<string>
  cannotDo: Array<string>
  badgeClass: string
}

export const ROLE_EXPLAINERS: Array<RoleExplainer> = [
  {
    role: "owner",
    title: "Owner",
    summary: "The top decision maker for the partner workspace. There is one owner per workspace at any time.",
    responsibilities: [
      "Edit company profile, billing country, and currency.",
      "Invite, remove, and change the role of any team member.",
      "Manage subscriptions, payment methods, and invoices.",
      "Approve creative submissions for review and run any campaign action.",
      "Close the workspace if the business stops advertising with Trip Media.",
    ],
    cannotDo: ["Be removed by other team members.", "Have ownership transferred without explicit confirmation."],
    badgeClass: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  },
  {
    role: "admin",
    title: "Admin",
    summary: "Day-to-day manager of the partner workspace. Has nearly all owner powers except closing the workspace.",
    responsibilities: [
      "Edit company profile and team membership.",
      "Manage subscriptions, top-ups, and billing alerts.",
      "Invite, remove, and re-role members below admin.",
      "Approve, submit, pause, and resume campaigns.",
      "Upload, replace, and submit creatives for review.",
    ],
    cannotDo: ["Close the workspace.", "Promote another member to owner without owner approval."],
    badgeClass: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  },
  {
    role: "operator",
    title: "Operator",
    summary: "Hands-on campaign and creative manager. Cannot touch billing or team membership.",
    responsibilities: [
      "Upload and edit creative assets (videos and images).",
      "Submit creatives for review.",
      "Create, edit, pause, and resume campaign drafts.",
      "Read campaign performance and partner analytics.",
    ],
    cannotDo: [
      "Manage subscriptions, payment methods, or wallet top-ups.",
      "Invite, remove, or re-role any team member.",
      "Edit the company profile.",
    ],
    badgeClass: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  },
  {
    role: "viewer",
    title: "Viewer",
    summary: "Read-only stakeholder. Useful for finance reviewers, agency observers, or new joiners learning the platform.",
    responsibilities: [
      "View campaign and creative status.",
      "View wallet, billing history, and analytics dashboards.",
    ],
    cannotDo: [
      "Make any change to creatives, campaigns, billing, profile, or team.",
      "Submit creatives or activate campaigns.",
    ],
    badgeClass: "border-slate-300/40 bg-slate-300/10 text-slate-100",
  },
]

export function roleExplainer(role: PartnerRole | string | null | undefined) {
  return ROLE_EXPLAINERS.find((entry) => entry.role === role)
}
