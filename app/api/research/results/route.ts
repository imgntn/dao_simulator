import { NextRequest, NextResponse } from 'next/server';
import { listResults } from '@/lib/research/experiment-listing';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const stateFilter = request.nextUrl.searchParams.get('state') ?? undefined;
    const results = listResults(stateFilter);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
