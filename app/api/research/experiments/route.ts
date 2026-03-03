import { NextResponse } from 'next/server';
import { listExperimentConfigs } from '@/lib/research/experiment-listing';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const experiments = listExperimentConfigs();
    return NextResponse.json({ experiments });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
