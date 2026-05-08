export interface RoleExplainer {
  slug: string
  title: string
  summary: string
  responsibilities: Array<string>
  cannot: Array<string>
}

export const tripMediaRoleExplainers: Array<RoleExplainer> = [
  {
    slug: "superadmin",
    title: "Super Admin",
    summary: "Full control across the Trip Media console.",
    responsibilities: [
      "Edit reward caps and rejection reasons",
      "Suspend or restore advertisers",
      "Reverse rider rewards",
      "Manage admin accounts and roles",
    ],
    cannot: ["Hide audit logs"],
  },
  {
    slug: "ad_manager",
    title: "Ad Moderator",
    summary: "Reviews creatives and oversees campaign delivery.",
    responsibilities: [
      "Approve, reject, request changes, suspend, or flag creatives",
      "Pause, resume, or force-stop campaigns",
      "Adjust delivery and review targeting",
      "Run moderation and campaign reports",
    ],
    cannot: [
      "Adjust advertiser credits",
      "Reverse rider rewards",
      "Edit platform-wide settings",
    ],
  },
  {
    slug: "finance",
    title: "Finance Admin",
    summary: "Owns advertiser billing and rider reward payouts.",
    responsibilities: [
      "Adjust advertiser promotional credits",
      "Freeze and reverse rider rewards",
      "Reconcile billing events and payouts",
      "Run reward and billing reports",
    ],
    cannot: ["Approve creatives", "Force-stop campaigns"],
  },
  {
    slug: "support",
    title: "Support Agent",
    summary: "Helps advertisers and riders without changing money.",
    responsibilities: [
      "Read advertiser, creative, campaign, and reward records",
      "Open and reply to support tickets",
      "Hand work off to the right specialist when needed",
    ],
    cannot: [
      "Approve or reject creatives",
      "Pause or stop campaigns",
      "Adjust credits or reverse rewards",
    ],
  },
  {
    slug: "fraud_analyst",
    title: "Fraud Analyst",
    summary: "Investigates suspicious rider activity and protects spend.",
    responsibilities: [
      "Triage fraud signals across Low, Medium, High, and Critical levels",
      "Freeze rewards while an investigation is open",
      "Escalate Critical cases to a Super Admin",
      "Run fraud reports",
    ],
    cannot: [
      "Reverse rewards (a Finance Admin or Super Admin signs off)",
      "Edit reward caps",
      "Approve creatives",
    ],
  },
]
