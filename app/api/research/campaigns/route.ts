import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { noStoreHeaders } from '@/lib/utils/http-safety';
import { projectRoot } from '@/lib/utils/server-paths';
import { listCampaignEvidence } from '@/lib/research/campaign-evidence';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  try {
    const verify = request.nextUrl.searchParams.get('verify') === '1';
    const includeRuns = request.nextUrl.searchParams.get('includeRuns') === '1';
    const campaignId = request.nextUrl.searchParams.get('campaignId') ?? undefined;
    return NextResponse.json(
      { campaigns: listCampaignEvidence(projectRoot(), { verify, includeRuns, campaignId }) },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
