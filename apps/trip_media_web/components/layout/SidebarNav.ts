import {
  BarChart3,
  Bell,
  CreditCard,
  FileVideo,
  LayoutDashboard,
  LineChart,
  Settings,
  Users,
} from "lucide-react"

export interface SidebarNavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  description: string
}

export const SIDEBAR_NAV: Array<SidebarNavItem> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview of campaigns and spending.",
  },
  {
    href: "/dashboard/campaigns",
    label: "Campaigns",
    icon: BarChart3,
    description: "Create, submit, and manage campaign delivery.",
  },
  {
    href: "/dashboard/creatives",
    label: "Creatives",
    icon: FileVideo,
    description: "Upload and submit ad assets for review.",
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: LineChart,
    description: "Performance reporting across campaigns and creatives.",
  },
  {
    href: "/dashboard/billing",
    label: "Wallet & billing",
    icon: CreditCard,
    description: "Plans, credits, payments, and invoices.",
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Alerts about creative reviews, campaigns, and billing.",
  },
  {
    href: "/dashboard/team",
    label: "Team",
    icon: Users,
    description: "Members, invites, and role explainers.",
  },
  {
    href: "/dashboard/settings",
    label: "Profile & settings",
    icon: Settings,
    description: "Company profile, account, and danger zone.",
  },
]
