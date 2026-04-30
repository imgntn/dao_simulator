import { NextRequest, NextResponse } from 'next/server';
import { listResults } from '@/lib/research/experiment-listing';
import { requireAuth } from '@/lib/auth';
import { noStoreHeaders } from '@/lib/utils/http-safety';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const stateFilter = request.nextUrl.searchParams.get('state') ?? undefined;
    const results = listResults(stateFilter);
    return NextResponse.json({ results }, { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: noStoreHeaders() });
  }
}
