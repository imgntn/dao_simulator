import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'dao-simulator-web',
    timestamp: new Date().toISOString(),
  });
}
