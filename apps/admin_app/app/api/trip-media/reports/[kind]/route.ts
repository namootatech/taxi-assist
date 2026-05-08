import { NextResponse } from 'next/server';
import { createClerkSupabaseServerClient } from '@/lib/supabase/server';
import { hasCapability } from '@/lib/permissions';
import {
  logActionError,
  logActionInfo,
  logActionWarn,
} from '@/lib/server-action-logger';
import {
  buildReport,
  REPORT_DEFINITIONS,
  type ReportKind,
} from '@/lib/trip-media/reports';

const isValidKind = (value: string): value is ReportKind =>
  REPORT_DEFINITIONS.some((d) => d.kind === value);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!isValidKind(kind)) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Unknown report' } },
      { status: 404 },
    );
  }

  const supabase = await createClerkSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sign in to download reports.',
        },
      },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('role, disabled_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.disabled_at) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'FORBIDDEN', message: 'Admin access required.' },
      },
      { status: 403 },
    );
  }

  if (!hasCapability(profile.role, 'run_reports')) {
    logActionWarn('admin.reports.download', 'missing_capability', {
      role: profile.role,
      kind,
    });
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Your role can read reports but not run them.',
        },
      },
      { status: 403 },
    );
  }

  try {
    logActionInfo('admin.reports.download', 'started', { kind });
    const { csv, rowCount } = await buildReport(kind);

    await supabase.rpc('admin_record_report_run', {
      p_kind: kind,
      p_params: {},
      p_row_count: rowCount,
      p_status: 'completed',
      p_error_message: null,
    });

    logActionInfo('admin.reports.download', 'completed', { kind, rowCount });

    const filename = `trip-media-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logActionError('admin.reports.download', 'failed', error, { kind });
    await supabase.rpc('admin_record_report_run', {
      p_kind: kind,
      p_params: {},
      p_row_count: 0,
      p_status: 'failed',
      p_error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'REPORT_FAILED',
          message: 'Could not build the report.',
        },
      },
      { status: 500 },
    );
  }
}
