export type AdminRole =
  | "superadmin"
  | "compliance"
  | "operations"
  | "finance"
  | "ad_manager"
  | "support";

export type Capability =
  | "view_drivers"
  | "view_vehicles"
  | "view_verification"
  | "review_documents"
  | "view_trips"
  | "intervene_trips"
  | "view_wallets"
  | "adjust_wallets"
  | "view_ads"
  | "manage_ads"
  | "view_support"
  | "manage_support"
  | "view_audit";

const roleCaps: Record<AdminRole, Set<Capability>> = {
  superadmin: new Set<Capability>([
    "view_drivers",
    "view_vehicles",
    "view_verification",
    "review_documents",
    "view_trips",
    "intervene_trips",
    "view_wallets",
    "adjust_wallets",
    "view_ads",
    "manage_ads",
    "view_support",
    "manage_support",
    "view_audit",
  ]),
  compliance: new Set<Capability>([
    "view_drivers",
    "view_vehicles",
    "view_verification",
    "review_documents",
    "view_audit",
  ]),
  operations: new Set<Capability>([
    "view_drivers",
    "view_vehicles",
    "view_trips",
    "intervene_trips",
    "view_audit",
  ]),
  finance: new Set<Capability>([
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
    { href: "/", label: "Dashboard" },
    { href: "/drivers", label: "Drivers", cap: "view_drivers" },
    { href: "/vehicles", label: "Vehicles", cap: "view_vehicles" },
    { href: "/verification", label: "Verification", cap: "view_verification" },
    { href: "/trips", label: "Trips", cap: "view_trips" },
    { href: "/wallets", label: "Wallets", cap: "view_wallets" },
    { href: "/ads", label: "Ads", cap: "view_ads" },
    { href: "/support", label: "Support", cap: "view_support" },
    { href: "/audit", label: "Audit", cap: "view_audit" },
  ];

  return items.filter((i) => (!i.cap ? true : hasCapability(role, i.cap)));
}

