import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listCampaignRunMetadata } from '@/lib/research/campaign-evidence';
import { noStoreHeaders } from '@/lib/utils/http-safety';
import { projectRoot } from '@/lib/utils/server-paths';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  try {
    const { campaignId } = await params;
    const query = request.nextUrl.searchParams.get('query') ?? '';
    const offset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    return NextResponse.json(
      listCampaignRunMetadata(projectRoot(), campaignId, { query, offset, limit }),
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json(
      { error: message },
      { status, headers: noStoreHeaders() },
    );
  }
}
