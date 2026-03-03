import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const ROOT_DIR = process.cwd();
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const { id } = await params;
    const relativePath = id.join('/');

    // Path traversal protection
    const resolved = path.resolve(RESULTS_DIR, relativePath);
    if (!resolved.startsWith(path.resolve(RESULTS_DIR))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
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
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    return NextResponse.json({ status, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
