import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendDailyReport } from '@/lib/analytics/report';
import { isRecord, noStoreHeaders } from '@/lib/utils/http-safety';

/**
 * POST /api/analytics/report
 * Trigger the daily analytics email report.
 * Auth-protected; call from a cron job with X-API-Key header.
 *
 * Optional body: { "days": 7 }
 */
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  let days = 7;
  try {
    const body: unknown = await request.json();
    const daysCandidate = isRecord(body) ? body.days : undefined;
    if (
      typeof daysCandidate === 'number'
      && Number.isInteger(daysCandidate)
      && daysCandidate > 0
      && daysCandidate <= 365
    ) {
      days = daysCandidate;
    }
  } catch {
    // No body or invalid JSON: use default.
  }

  let result;
  try {
    result = await sendDailyReport(days);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send analytics report';
    console.error('[analytics] report route failed:', error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  if (result.sent) {
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  }

  return NextResponse.json(
    { ok: false, error: result.error },
    { status: 500, headers: noStoreHeaders() }
  );
}
