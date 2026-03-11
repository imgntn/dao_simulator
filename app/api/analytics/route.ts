import { NextRequest, NextResponse } from 'next/server';
import { increment, getStats } from '@/lib/analytics/store';
import { requireAuth } from '@/lib/auth';

const VALID_CATEGORIES = new Set(['pageview', 'event', 'referrer', 'device']);
const MAX_KEY_LENGTH = 200;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const { type, path, name, referrer, device } = body as {
    type?: string;
    path?: string;
    name?: string;
    referrer?: string;
    device?: string;
  };

  if (typeof type !== 'string' || (type !== 'pageview' && type !== 'event')) {
    return new NextResponse(null, { status: 400 });
  }

  if (type === 'pageview') {
    if (typeof path !== 'string' || path.length === 0 || path.length > MAX_KEY_LENGTH) {
      return new NextResponse(null, { status: 400 });
    }
    await increment('pageview', path);

    if (typeof referrer === 'string' && referrer.length > 0 && referrer.length <= MAX_KEY_LENGTH) {
      await increment('referrer', referrer);
    }
    if (typeof device === 'string' && VALID_CATEGORIES.has('device') && device.length <= MAX_KEY_LENGTH) {
      await increment('device', device);
    }
  } else {
    // type === 'event'
    if (typeof name !== 'string' || name.length === 0 || name.length > MAX_KEY_LENGTH) {
      return new NextResponse(null, { status: 400 });
    }
    await increment('event', name);
  }

  return new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10) || 30;
  const rows = await getStats(Math.min(days, 365));

  // Group by category → date → key → count
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
  });
}
