import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  defaultRejectionReasons,
  defaultRewardCaps,
  defaultRiskThresholds,
  defaultWatchRules,
  type RejectionReason,
} from './policy-constants';

interface SettingRow {
  key: string;
  value: unknown;
}

export interface RewardCaps {
  per_trip_max_reward_cents: number;
  per_day_max_reward_cents: number;
  default_reward_per_view_cents: number;
}

export interface RiskThresholds {
  rapid_completion_per_hour: number;
  unique_devices_per_account: number;
  emulator_score_high: number;
  shared_ip_per_hour: number;
}

export interface WatchRules {
  min_watch_ratio: number;
  min_rating: number;
  min_comment_length: number;
}

export interface TripMediaSettings {
  rewardCaps: RewardCaps;
  rejectionReasons: Array<RejectionReason>;
  riskThresholds: RiskThresholds;
  watchRules: WatchRules;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberOr = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const stringOr = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
};

const parseRejectionReasons = (value: unknown): Array<RejectionReason> => {
  if (!Array.isArray(value)) return defaultRejectionReasons;
  const list = value
    .map((item) => {
      if (!isObject(item)) return null;
      const slug = stringOr(item.slug, '');
      const label = stringOr(item.label, '');
      const description = stringOr(item.description, '');
      if (!slug || !label) return null;
      return { slug, label, description };
    })
    .filter((x): x is RejectionReason => Boolean(x));
  return list.length ? list : defaultRejectionReasons;
};

const parseRewardCaps = (value: unknown): RewardCaps => {
  if (!isObject(value)) return defaultRewardCaps;
  return {
    per_trip_max_reward_cents: numberOr(
      value.per_trip_max_reward_cents,
      defaultRewardCaps.per_trip_max_reward_cents,
    ),
    per_day_max_reward_cents: numberOr(
      value.per_day_max_reward_cents,
      defaultRewardCaps.per_day_max_reward_cents,
    ),
    default_reward_per_view_cents: numberOr(
      value.default_reward_per_view_cents,
      defaultRewardCaps.default_reward_per_view_cents,
    ),
  };
};

const parseRiskThresholds = (value: unknown): RiskThresholds => {
  if (!isObject(value)) return defaultRiskThresholds;
  return {
    rapid_completion_per_hour: numberOr(
      value.rapid_completion_per_hour,
      defaultRiskThresholds.rapid_completion_per_hour,
    ),
    unique_devices_per_account: numberOr(
      value.unique_devices_per_account,
      defaultRiskThresholds.unique_devices_per_account,
    ),
    emulator_score_high: numberOr(
      value.emulator_score_high,
      defaultRiskThresholds.emulator_score_high,
    ),
    shared_ip_per_hour: numberOr(
      value.shared_ip_per_hour,
      defaultRiskThresholds.shared_ip_per_hour,
    ),
  };
};

const parseWatchRules = (value: unknown): WatchRules => {
  if (!isObject(value)) return defaultWatchRules;
  return {
    min_watch_ratio: numberOr(
      value.min_watch_ratio,
      defaultWatchRules.min_watch_ratio,
    ),
    min_rating: numberOr(value.min_rating, defaultWatchRules.min_rating),
    min_comment_length: numberOr(
      value.min_comment_length,
      defaultWatchRules.min_comment_length,
    ),
  };
};

export async function loadTripMediaSettings(): Promise<TripMediaSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('trip_media_settings')
    .select('key, value')
    .in('key', [
      'reward_caps',
      'rejection_reasons',
      'risk_thresholds',
      'watch_rules',
    ]);

  const fallback: TripMediaSettings = {
    rewardCaps: defaultRewardCaps,
    rejectionReasons: defaultRejectionReasons,
    riskThresholds: defaultRiskThresholds,
    watchRules: defaultWatchRules,
  };

  if (error || !data) return fallback;

  const map = new Map(
    (data as Array<SettingRow>).map((row) => [row.key, row.value]),
  );

  return {
    rewardCaps: parseRewardCaps(map.get('reward_caps')),
    rejectionReasons: parseRejectionReasons(map.get('rejection_reasons')),
    riskThresholds: parseRiskThresholds(map.get('risk_thresholds')),
    watchRules: parseWatchRules(map.get('watch_rules')),
  };
}
