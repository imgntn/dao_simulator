import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { noStoreHeaders } from '@/lib/utils/http-safety';
import {
  METRIC_REGISTRY,
  METRIC_REGISTRY_SCHEMA_VERSION,
} from '@/lib/research/metric-registry';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  return NextResponse.json(
    {
      schemaVersion: METRIC_REGISTRY_SCHEMA_VERSION,
      metrics: Object.values(METRIC_REGISTRY),
    },
    { headers: noStoreHeaders() },
  );
}
