import { NextRequest, NextResponse } from 'next/server';
import { increment, getStats } from '@/lib/analytics/store';
import { requireAuth } from '@/lib/auth';
import { isRecord, noStoreHeaders, readStringField } from '@/lib/utils/http-safety';
import { createRateLimiter, getClientIdentifier } from '@/lib/utils/rate-limit';

const VALID_CATEGORIES = new Set(['pageview', 'event', 'referrer', 'device']);
const MAX_KEY_LENGTH = 200;
const analyticsLimiter = createRateLimiter(120, 60 * 1000, 'analytics');

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request, 'analytics');
  const rateLimit = await analyticsLimiter.check(clientId);
  if (rateLimit.limited) {
    return new NextResponse(null, {
      status: 429,
      headers: noStoreHeaders({ 'Retry-After': String(rateLimit.retryAfter) }),
    });
  }
  await analyticsLimiter.record(clientId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400, headers: noStoreHeaders() });
  }

  if (!isRecord(body)) {
    return new NextResponse(null, { status: 400, headers: noStoreHeaders() });
  }

  const type = readStringField(body.type, 20);
  if (type !== 'pageview' && type !== 'event') {
    return new NextResponse(null, { status: 400, headers: noStoreHeaders() });
  }

  try {
    if (type === 'pageview') {
      const path = readStringField(body.path, MAX_KEY_LENGTH, { trim: false });
      if (!path) {
        return new NextResponse(null, { status: 400, headers: noStoreHeaders() });
      }
      await increment('pageview', path);

      const referrer = readStringField(body.referrer, MAX_KEY_LENGTH, { trim: false });
      if (referrer) {
        await increment('referrer', referrer);
      }

      const device = readStringField(body.device, MAX_KEY_LENGTH);
      if (VALID_CATEGORIES.has('device') && device) {
        await increment('device', device);
      }
    } else {
      const name = readStringField(body.name, MAX_KEY_LENGTH);
      if (!name) {
        return new NextResponse(null, { status: 400, headers: noStoreHeaders() });
      }
      await increment('event', name);
    }
  } catch (error) {
    console.error('[analytics] route increment failed:', error);
  }

  return new NextResponse(null, { status: 204, headers: noStoreHeaders() });
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const requestedDays = Number.parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(requestedDays, 365)) : 30;
  let rows: Awaited<ReturnType<typeof getStats>>;
  try {
    rows = await getStats(days);
  } catch (error) {
    console.error('[analytics] route stats failed:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics stats' },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  // Group by category, date, key, then count.
  const grouped: Record<string, Record<string, Record<string, number>>> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = {};
    if (!grouped[row.category][row.date]) grouped[row.category][row.date] = {};
    grouped[row.category][row.date][row.key] = row.count;
  }

  return NextResponse.json({
    pageviews: grouped['pageview'] ?? {},
    events: grouped['event'] ?? {},
    referrers: grouped['referrer'] ?? {},
    devices: grouped['device'] ?? {},
  }, {
    headers: noStoreHeaders(),
  });
}
