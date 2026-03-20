import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const FEEDBACK_FILE = path.join(process.cwd(), 'feedback.jsonl');

interface FeedbackPayload {
  type: 'bug' | 'feature' | 'general';
  message: string;
  email?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  let body: FeedbackPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const entry = {
    type: body.type || 'general',
    message: body.message.trim().slice(0, 2000),
    email: body.email?.trim().slice(0, 200),
    url: body.url?.slice(0, 500),
    userAgent: body.userAgent?.slice(0, 300),
    timestamp: body.timestamp || new Date().toISOString(),
    ip: request.headers.get('x-forwarded-for') || 'unknown',
  };

  try {
    fs.appendFileSync(FEEDBACK_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.error('Failed to write feedback:', err);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
