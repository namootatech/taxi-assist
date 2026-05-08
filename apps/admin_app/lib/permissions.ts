export type AdminRole =
  | "superadmin"
  | "compliance"
  | "operations"
  | "finance"
  | "ad_manager"
  | "support";

export type Capability =
  | "view_drivers"
  | "view_riders"
  | "view_vehicles"
  | "view_verification"
  | "review_documents"
  | "view_trips"
  | "intervene_trips"
  | "view_payments"
  | "view_wallets"
  | "adjust_wallets"
  | "view_ads"
  | "manage_ads"
  | "view_ratings"
  | "view_support"
  | "manage_support"
  | "manage_admins"
  | "view_analytics"
  | "manage_settings"
  | "view_audit";

const roleCaps: Record<AdminRole, Set<Capability>> = {
  superadmin: new Set<Capability>([
    "view_drivers",
    "view_riders",
    "view_vehicles",
    "view_verification",
    "review_documents",
    "view_trips",
    "intervene_trips",
    "view_payments",
    "view_wallets",
    "adjust_wallets",
    "view_ads",
    "manage_ads",
    "view_ratings",
    "view_support",
    "manage_support",
    "manage_admins",
    "view_analytics",
    "manage_settings",
    "view_audit",
  ]),
  compliance: new Set<Capability>([
    "view_drivers",
    "view_riders",
    "view_vehicles",
    "view_verification",
    "review_documents",
    "view_audit",
  ]),
  operations: new Set<Capability>([
    "view_drivers",
    "view_riders",
    "view_vehicles",
    "view_trips",
    "intervene_trips",
    "view_audit",
  ]),
  finance: new Set<Capability>([
    "view_payments",
    "view_wallets",
    "adjust_wallets",
    "view_trips",
    "view_audit",
  ]),
  ad_manager: new Set<Capability>(["view_ads", "manage_ads", "view_audit"]),
  support: new Set<Capability>(["view_support", "manage_support", "view_audit"]),
};

export function hasCapability(role: string | null | undefined, cap: Capability) {
  if (!role) return false;
  const r = role as AdminRole;
  return roleCaps[r]?.has(cap) ?? false;
}

export function allowedNavForRole(role: string | null | undefined) {
  const items: Array<{ href: string; label: string; cap?: Capability }> = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/drivers", label: "Drivers", cap: "view_drivers" },
    { href: "/riders", label: "Riders", cap: "view_riders" },
    { href: "/vehicles", label: "Vehicles", cap: "view_vehicles" },
    { href: "/verification", label: "Verification", cap: "view_verification" },
    { href: "/trips", label: "Trips", cap: "view_trips" },
    { href: "/payments", label: "Payments", cap: "view_payments" },
    { href: "/wallets", label: "Wallets", cap: "view_wallets" },
    { href: "/ratings", label: "Ratings", cap: "view_ratings" },
    { href: "/ads", label: "Ads", cap: "view_ads" },
    { href: "/support", label: "Support", cap: "view_support" },
    { href: "/admins", label: "Admins", cap: "manage_admins" },
    { href: "/analytics", label: "Analytics", cap: "view_analytics" },
    { href: "/settings", label: "Settings", cap: "manage_settings" },
    { href: "/audit", label: "Audit", cap: "view_audit" },
  ];

  return items.filter((i) => (!i.cap ? true : hasCapability(role, i.cap)));
}

