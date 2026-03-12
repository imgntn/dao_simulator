import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { projectRoot, projectResolve } from '@/lib/utils/server-paths';

export const runtime = 'nodejs';

const ALLOWED_BASES = ['paper', 'results', 'docs'];

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.tex': 'application/x-tex',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8',
  '.zip': 'application/zip',
};

function isInsideAllowedRoots(absolutePath: string): boolean {
  return ALLOWED_BASES.some((baseDir) => {
    const allowedRoot = projectResolve(baseDir);
    return absolutePath === allowedRoot || absolutePath.startsWith(`${allowedRoot}${path.sep}`);
  });
}

function resolveSafePath(slug: string[]): string | null {
  const decoded = slug
    .map((segment) => decodeURIComponent(segment))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (decoded.length === 0) return null;
  const absolutePath = projectResolve(...decoded);
  if (!isInsideAllowedRoots(absolutePath)) return null;
  return absolutePath;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const routeParams = await params;
  const fallbackSlug = (() => {
    const pathname = new URL(request.url).pathname;
    const prefix = '/api/artifacts/';
    if (!pathname.startsWith(prefix)) return [];
    return pathname
      .slice(prefix.length)
      .split('/')
      .filter((segment) => segment.length > 0);
  })();

  const resolved = resolveSafePath(routeParams?.slug ?? fallbackSlug);
  if (!resolved) {
    return NextResponse.json({ error: 'Invalid artifact path.' }, { status: 400 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 });
  }

  const stats = fs.statSync(resolved);
  if (!stats.isFile()) {
    return NextResponse.json({ error: 'Path is not a file.' }, { status: 400 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
  const fileName = path.basename(resolved);
  const isInline = ['.pdf', '.md', '.json', '.txt', '.csv', '.log', '.tex', '.yaml', '.yml'].includes(ext);

  const content = fs.readFileSync(resolved);

  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stats.size),
      'Content-Disposition': `${isInline ? 'inline' : 'attachment'}; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
