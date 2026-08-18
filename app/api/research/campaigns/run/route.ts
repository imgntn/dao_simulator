import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { noStoreHeaders } from '@/lib/utils/http-safety';
import { projectRoot } from '@/lib/utils/server-paths';
import { readVerifiedCampaignRun } from '@/lib/research/campaign-evidence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const campaignId = request.nextUrl.searchParams.get('campaignId') ?? '';
  const runId = request.nextUrl.searchParams.get('runId') ?? '';
  if (!campaignId || !runId) {
    return NextResponse.json(
      { error: 'campaignId and runId are required' },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  try {
    return NextResponse.json(
      { campaignId, runId, run: readVerifiedCampaignRun(projectRoot(), campaignId, runId) },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status, headers: noStoreHeaders() });
  }
}
