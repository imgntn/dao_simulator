import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const calibrationProfilesPath = path.join(process.cwd(), 'public', 'data', 'calibration-profiles.json');
const marketTimeseriesPath = path.join(process.cwd(), 'public', 'data', 'market-timeseries.json');

async function fileHealth(relativePath: string, absolutePath: string) {
  await access(absolutePath);
  const fileStat = await stat(absolutePath);

  return {
    path: relativePath,
    bytes: fileStat.size,
  };
}

export async function GET() {
  const results = await Promise.all([
    fileHealth('public/data/calibration-profiles.json', calibrationProfilesPath),
    fileHealth('public/data/market-timeseries.json', marketTimeseriesPath),
  ]);

  return NextResponse.json({
    ok: true,
    service: 'dao-simulator-simulate',
    dataFiles: results,
    timestamp: new Date().toISOString(),
  });
}
