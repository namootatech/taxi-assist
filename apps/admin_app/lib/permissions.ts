export type AdminRole =
  | "superadmin"
  | "compliance"
  | "operations"
  | "finance"
  | "ad_manager"
  | "support"
  | "fraud_analyst";

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
  | "view_audit"
  | "view_trip_media"
  | "view_trip_media_overview"
  | "moderate_creatives"
  | "oversee_campaigns"
  | "view_advertisers"
  | "suspend_advertiser"
  | "adjust_advertiser_credits"
  | "view_rider_rewards"
  | "freeze_rider_reward"
  | "reverse_rider_reward"
  | "view_fraud"
  | "triage_fraud"
  | "escalate_fraud"
  | "view_trip_media_analytics"
  | "view_reports"
  | "run_reports"
  | "manage_trip_media_settings";

const tripMediaReadCommon: Array<Capability> = [
  "view_trip_media",
  "view_trip_media_overview",
];

const adManagerCaps: Array<Capability> = [
  ...tripMediaReadCommon,
  "view_ads",
  "manage_ads",
  "moderate_creatives",
  "oversee_campaigns",
  "view_advertisers",
  "view_trip_media_analytics",
  "view_reports",
  "run_reports",
  "view_audit",
];

const financeCaps: Array<Capability> = [
  ...tripMediaReadCommon,
  "view_payments",
  "view_wallets",
  "adjust_wallets",
  "view_trips",
  "view_advertisers",
  "adjust_advertiser_credits",
  "view_rider_rewards",
  "freeze_rider_reward",
  "reverse_rider_reward",
  "view_reports",
  "run_reports",
  "view_audit",
];

const supportCaps: Array<Capability> = [
  ...tripMediaReadCommon,
  "view_support",
  "manage_support",
  "view_advertisers",
  "view_rider_rewards",
  "view_audit",
];

const complianceCaps: Array<Capability> = [
  ...tripMediaReadCommon,
  "view_drivers",
  "view_riders",
  "view_vehicles",
  "view_verification",
  "review_documents",
  "moderate_creatives",
  "view_audit",
];

const operationsCaps: Array<Capability> = [
  ...tripMediaReadCommon,
  "view_drivers",
  "view_riders",
  "view_vehicles",
  "view_trips",
  "intervene_trips",
  "oversee_campaigns",
  "view_rider_rewards",
  "view_audit",
];

const fraudAnalystCaps: Array<Capability> = [
  ...tripMediaReadCommon,
  "view_advertisers",
  "view_rider_rewards",
  "freeze_rider_reward",
  "view_fraud",
  "triage_fraud",
  "view_reports",
  "view_audit",
];

const superadminCaps: Array<Capability> = [
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
  "view_trip_media",
  "view_trip_media_overview",
  "moderate_creatives",
  "oversee_campaigns",
  "view_advertisers",
  "suspend_advertiser",
  "adjust_advertiser_credits",
  "view_rider_rewards",
  "freeze_rider_reward",
  "reverse_rider_reward",
  "view_fraud",
  "triage_fraud",
  "escalate_fraud",
  "view_trip_media_analytics",
  "view_reports",
  "run_reports",
  "manage_trip_media_settings",
];

const roleCaps: Record<AdminRole, Set<Capability>> = {
  superadmin: new Set<Capability>(superadminCaps),
  compliance: new Set<Capability>(complianceCaps),
  operations: new Set<Capability>(operationsCaps),
  finance: new Set<Capability>(financeCaps),
  ad_manager: new Set<Capability>(adManagerCaps),
  support: new Set<Capability>(supportCaps),
  fraud_analyst: new Set<Capability>(fraudAnalystCaps),
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
    { href: "/trip-media/overview", label: "Trip Media overview", cap: "view_trip_media_overview" },
    { href: "/ads", label: "Campaigns", cap: "view_ads" },
    { href: "/creatives", label: "Creatives review", cap: "moderate_creatives" },
    { href: "/trip-media/advertisers", label: "Advertisers", cap: "view_advertisers" },
    { href: "/trip-media/internal-ads", label: "Internal Trip ads", cap: "view_trip_media" },
    { href: "/trip-media/rider-rewards", label: "Rider rewards", cap: "view_rider_rewards" },
    { href: "/trip-media/fraud", label: "Fraud monitoring", cap: "view_fraud" },
    { href: "/trip-media/analytics", label: "Trip Media analytics", cap: "view_trip_media_analytics" },
    { href: "/trip-media/reports", label: "Reports", cap: "view_reports" },
    { href: "/trip-media/settings", label: "Trip Media settings", cap: "manage_trip_media_settings" },
    { href: "/support", label: "Support", cap: "view_support" },
    { href: "/admins", label: "Admins", cap: "manage_admins" },
    { href: "/analytics", label: "Analytics", cap: "view_analytics" },
    { href: "/settings", label: "Settings", cap: "manage_settings" },
    { href: "/audit", label: "Audit", cap: "view_audit" },
  ];

  return items.filter((i) => (!i.cap ? true : hasCapability(role, i.cap)));
}
