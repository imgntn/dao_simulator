import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendDailyReport } from '@/lib/analytics/report';

/**
 * POST /api/analytics/report
 * Trigger the daily analytics email report.
 * Auth-protected — call from a cron job with X-API-Key header.
 *
 * Optional body: { "days": 7 }
 */
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  let days = 7;
  try {
    const body = await request.json();
    if (typeof body.days === 'number' && body.days > 0 && body.days <= 365) {
      days = body.days;
    }
  } catch {
    // No body or invalid JSON — use default
  }

  const result = await sendDailyReport(days);

  if (result.sent) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, error: result.error },
    { status: 500 }
  );
}
