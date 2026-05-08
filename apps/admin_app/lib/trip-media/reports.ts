import { createClerkSupabaseServerClient } from '@/lib/supabase/server';

export type ReportKind =
  | 'creative_actions'
  | 'campaign_actions'
  | 'reward_ledger'
  | 'fraud_signals';

export const REPORT_DEFINITIONS: ReadonlyArray<{
  kind: ReportKind;
  title: string;
  description: string;
  scope: string;
}> = [
  {
    kind: 'creative_actions',
    title: 'Creative moderation log',
    description:
      'Every approve, reject, request changes, suspend, and flag action with the reason.',
    scope: 'Last 90 days',
  },
  {
    kind: 'campaign_actions',
    title: 'Campaign oversight log',
    description:
      'Pause, resume, force-stop, and delivery adjustments by Trip admins.',
    scope: 'Last 90 days',
  },
  {
    kind: 'reward_ledger',
    title: 'Reward ledger',
    description:
      'Frozen and reversed rewards alongside the wallet entries that cancelled them.',
    scope: 'Last 90 days',
  },
  {
    kind: 'fraud_signals',
    title: 'Fraud signals export',
    description:
      'All open and resolved fraud signals with risk level and outcome.',
    scope: 'Last 90 days',
  },
];

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const stringified =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  if (
    stringified.includes(',') ||
    stringified.includes('"') ||
    stringified.includes('\n')
  ) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
};

export const buildCsv = (
  header: Array<string>,
  rows: Array<Array<unknown>>,
): string => {
  const lines = [header.map(escapeCsv).join(',')];
  for (const row of rows) lines.push(row.map(escapeCsv).join(','));
  return lines.join('\n');
};

const ninetyDaysAgo = () =>
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

export async function buildReport(
  kind: ReportKind,
): Promise<{ csv: string; rowCount: number }> {
  const supabase = await createClerkSupabaseServerClient();
  if (kind === 'creative_actions') {
    const { data } = await supabase
      .from('audit_logs')
      .select('created_at, actor_role, action, entity_id, reason, metadata')
      .like('action', 'creative.%')
      .gte('created_at', ninetyDaysAgo())
      .order('created_at', { ascending: false })
      .limit(5000);
    const rows = (data ?? []).map((row) => [
      row.created_at,
      row.actor_role ?? '',
      row.action,
      row.entity_id ?? '',
      row.reason ?? '',
      JSON.stringify(row.metadata ?? {}),
    ]);
    return {
      csv: buildCsv(
        [
          'timestamp',
          'actor_role',
          'action',
          'creative_id',
          'reason',
          'metadata',
        ],
        rows,
      ),
      rowCount: rows.length,
    };
  }

  if (kind === 'campaign_actions') {
    const { data } = await supabase
      .from('audit_logs')
      .select('created_at, actor_role, action, entity_id, reason, metadata')
      .like('action', 'campaign.%')
      .gte('created_at', ninetyDaysAgo())
      .order('created_at', { ascending: false })
      .limit(5000);
    const rows = (data ?? []).map((row) => [
      row.created_at,
      row.actor_role ?? '',
      row.action,
      row.entity_id ?? '',
      row.reason ?? '',
      JSON.stringify(row.metadata ?? {}),
    ]);
    return {
      csv: buildCsv(
        [
          'timestamp',
          'actor_role',
          'action',
          'campaign_id',
          'reason',
          'metadata',
        ],
        rows,
      ),
      rowCount: rows.length,
    };
  }

  if (kind === 'reward_ledger') {
    const { data: holds } = await supabase
      .from('ad_reward_holds')
      .select(
        'id, ad_view_id, rider_id, campaign_id, amount_cents, status, reason, reverse_tx_id, fraud_signal_id, created_at, released_at, reversed_at',
      )
      .gte('created_at', ninetyDaysAgo())
      .order('created_at', { ascending: false })
      .limit(10000);
    const rows = (holds ?? []).map((row) => [
      row.created_at,
      row.id,
      row.status,
      row.rider_id ?? '',
      row.campaign_id ?? '',
      row.ad_view_id ?? '',
      ((row.amount_cents as number | null) ?? 0) / 100,
      row.reason,
      row.reverse_tx_id ?? '',
      row.fraud_signal_id ?? '',
      row.released_at ?? '',
      row.reversed_at ?? '',
    ]);
    return {
      csv: buildCsv(
        [
          'timestamp',
          'hold_id',
          'status',
          'rider_id',
          'campaign_id',
          'ad_view_id',
          'amount_zar',
          'reason',
          'reverse_tx_id',
          'fraud_signal_id',
          'released_at',
          'reversed_at',
        ],
        rows,
      ),
      rowCount: rows.length,
    };
  }

  if (kind === 'fraud_signals') {
    const { data } = await supabase
      .from('ad_fraud_signals')
      .select(
        'id, kind, level, status, summary, rider_id, trip_id, ad_view_id, campaign_id, partner_id, resolution_note, created_at, resolved_at',
      )
      .gte('created_at', ninetyDaysAgo())
      .order('created_at', { ascending: false })
      .limit(10000);
    const rows = (data ?? []).map((row) => [
      row.created_at,
      row.id,
      row.kind,
      row.level,
      row.status,
      row.summary ?? '',
      row.rider_id ?? '',
      row.trip_id ?? '',
      row.ad_view_id ?? '',
      row.campaign_id ?? '',
      row.partner_id ?? '',
      row.resolution_note ?? '',
      row.resolved_at ?? '',
    ]);
    return {
      csv: buildCsv(
        [
          'timestamp',
          'signal_id',
          'kind',
          'level',
          'status',
          'summary',
          'rider_id',
          'trip_id',
          'ad_view_id',
          'campaign_id',
          'partner_id',
          'resolution_note',
          'resolved_at',
        ],
        rows,
      ),
      rowCount: rows.length,
    };
  }

  return { csv: '', rowCount: 0 };
}

export interface ReportRunRow {
  id: string;
  kind: string;
  status: string;
  rowCount: number | null;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export async function loadRecentReportRuns(
  limit = 25,
): Promise<Array<ReportRunRow>> {
  const supabase = await createClerkSupabaseServerClient();
  const { data } = await supabase
    .from('admin_report_runs')
    .select(
      'id, kind, status, row_count, started_at, finished_at, error_message',
    )
    .order('started_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as string,
    status: row.status as string,
    rowCount: (row.row_count as number | null) ?? null,
    startedAt: row.started_at as string,
    finishedAt: (row.finished_at as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
  }));
}
