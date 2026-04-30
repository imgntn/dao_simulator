import { NextResponse } from 'next/server';
import { noStoreHeaders } from '@/lib/utils/http-safety';
import { getReadinessReport } from '@/lib/utils/dependency-health';

export const runtime = 'nodejs';

export async function GET() {
  const readiness = await getReadinessReport();

  return NextResponse.json({
    ok: readiness.ok,
    service: 'dao-simulator-web',
    checks: readiness.checks,
    timestamp: new Date().toISOString(),
  }, {
    status: readiness.ok ? 200 : 503,
    headers: noStoreHeaders(),
  });
}
