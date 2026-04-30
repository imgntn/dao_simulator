import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isPathInside, projectPath } from '@/lib/utils/server-paths';
import { requireAuth } from '@/lib/auth';
import { noStoreHeaders } from '@/lib/utils/http-safety';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const relativePath = id.join('/');

    // Path traversal protection
    const resultsRoot = path.resolve(projectPath('results'));
    const resolved = path.resolve(resultsRoot, relativePath);
    if (!isPathInside(resultsRoot, resolved)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400, headers: noStoreHeaders() });
    }

    const statusPath = path.join(resolved, 'status.json');
    const summaryPath = path.join(resolved, 'summary.json');

    let status = null;
    let summary = null;

    if (fs.existsSync(statusPath)) {
      try {
        status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      } catch { /* skip malformed */ }
    }

    if (fs.existsSync(summaryPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        // Strip values arrays from MetricStatistics to keep payload small
        if (raw.metricsSummary && Array.isArray(raw.metricsSummary)) {
          for (const ms of raw.metricsSummary) {
            if (ms.metrics && Array.isArray(ms.metrics)) {
              for (const metric of ms.metrics) {
                delete metric.values;
              }
            }
          }
        }
        summary = raw;
      } catch { /* skip malformed */ }
    }

    if (!status && !summary) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404, headers: noStoreHeaders() });
    }

    return NextResponse.json({ status, summary }, { headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: noStoreHeaders() });
  }
}
