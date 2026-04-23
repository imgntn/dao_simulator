import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const DATA_FILES = [
  'public/data/calibration-profiles.json',
  'public/data/market-timeseries.json',
];

export async function GET() {
  const results = await Promise.all(DATA_FILES.map(async (relativePath) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    await access(absolutePath);
    const fileStat = await stat(absolutePath);

    return {
      path: relativePath,
      bytes: fileStat.size,
    };
  }));

  return NextResponse.json({
    ok: true,
    service: 'dao-simulator-simulate',
    dataFiles: results,
    timestamp: new Date().toISOString(),
  });
}
