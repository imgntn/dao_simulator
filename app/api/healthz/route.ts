import { NextResponse } from 'next/server';
import { noStoreHeaders } from '@/lib/utils/http-safety';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'dao-simulator-web',
    timestamp: new Date().toISOString(),
  }, {
    headers: noStoreHeaders(),
  });
}
