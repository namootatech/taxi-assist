export interface RejectionReason {
  slug: string
  label: string
  description: string
}

export const defaultRejectionReasons: Array<RejectionReason> = [
  {
    slug: "misleading_content",
    label: "Misleading content",
    description: "Promises or claims that are not supported by the product itself.",
  },
  {
    slug: "poor_quality",
    label: "Poor quality",
    description: "Audio, video, or text quality is too low for rider playback.",
  },
  {
    slug: "offensive_material",
    label: "Offensive material",
    description: "Content is hateful, explicit, or otherwise inappropriate for riders.",
  },
  {
    slug: "copyright_violation",
    label: "Copyright violation",
    description: "Uses third-party material without a clear licence.",
  },
  {
    slug: "unsupported_claims",
    label: "Unsupported claims",
    description: "Mentions performance, savings, or outcomes that are not verifiable.",
  },
]

export type FraudRiskLevel = "low" | "medium" | "high" | "critical"

export interface FraudRiskOption {
  level: FraudRiskLevel
  label: string
  description: string
}

export const fraudRiskOptions: Array<FraudRiskOption> = [
  {
    level: "low",
    label: "Low",
    description: "Looks normal. Watch the trend; no action required.",
  },
  {
    level: "medium",
    label: "Medium",
    description: "Pattern is suspicious. Open an investigation when you have time.",
  },
  {
    level: "high",
    label: "High",
    description: "Likely abuse. Freeze related rewards while you investigate.",
  },
  {
    level: "critical",
    label: "Critical",
    description: "Investigate now and escalate to a Super Admin.",
  },
]

export const defaultRewardCaps = {
  per_trip_max_reward_cents: 500,
  per_day_max_reward_cents: 2500,
  default_reward_per_view_cents: 50,
}

export const defaultRiskThresholds = {
  rapid_completion_per_hour: 8,
  unique_devices_per_account: 3,
  emulator_score_high: 0.7,
  shared_ip_per_hour: 5,
}

export const defaultWatchRules = {
  min_watch_ratio: 0.95,
  min_rating: 1,
  min_comment_length: 0,
}

export interface CreativeCategory {
  slug: string
  label: string
}

export const defaultCreativeCategories: Array<CreativeCategory> = [
  { slug: "retail", label: "Retail" },
  { slug: "telco", label: "Telecoms" },
  { slug: "fintech", label: "Financial services" },
  { slug: "qsr", label: "Quick service / restaurants" },
  { slug: "fmcg", label: "FMCG" },
  { slug: "automotive", label: "Automotive" },
  { slug: "events", label: "Events" },
  { slug: "public_sector", label: "Public sector" },
  { slug: "other", label: "Other" },
]

export const defaultRiderPayoutMultiplier = {
  multiplier: 1.25,
}

export const tripMediaSettingsKeys = {
  rewardCaps: "reward_caps",
  rejectionReasons: "rejection_reasons",
  riskThresholds: "risk_thresholds",
  watchRules: "watch_rules",
  riderPayoutMultiplier: "rider_payout_multiplier",
} as const

export type TripMediaSettingKey = (typeof tripMediaSettingsKeys)[keyof typeof tripMediaSettingsKeys]
