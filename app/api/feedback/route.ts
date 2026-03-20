import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS feedback (
  id         SERIAL PRIMARY KEY,
  type       VARCHAR(20) NOT NULL DEFAULT 'general',
  message    TEXT NOT NULL,
  email      VARCHAR(200),
  url        VARCHAR(500),
  user_agent VARCHAR(300),
  ip         VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
`;

const INSERT_SQL = `
INSERT INTO feedback (type, message, email, url, user_agent, ip)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id
`;

let pool: Pool | null = null;
let tableEnsured = false;

function getPool(): Pool | null {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url, max: 2 });
  return pool;
}

async function ensureTable(): Promise<boolean> {
  if (tableEnsured) return true;
  const p = getPool();
  if (!p) return false;
  try {
    await p.query(CREATE_TABLE_SQL);
    tableEnsured = true;
    return true;
  } catch (err) {
    console.error('[feedback] Failed to create table:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

const RECIPIENT = process.env.CONTACT_EMAIL || process.env.SMTP_USER || 'hello@daosimulator.com';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const TYPE_EMOJI: Record<string, string> = {
  bug: '🐛',
  feature: '💡',
  general: '💬',
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface FeedbackPayload {
  type?: string;
  message?: string;
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

  const type = (['bug', 'feature', 'general'].includes(body.type ?? '') ? body.type : 'general') as string;
  const message = body.message.trim().slice(0, 2000);
  const email = body.email?.trim().slice(0, 200) || null;
  const url = body.url?.slice(0, 500) || null;
  const userAgent = body.userAgent?.slice(0, 300) || null;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  let dbSaved = false;
  let emailSent = false;

  // 1. Store in Postgres
  if (await ensureTable()) {
    try {
      const p = getPool()!;
      await p.query(INSERT_SQL, [type, message, email, url, userAgent, ip]);
      dbSaved = true;
    } catch (err) {
      console.error('[feedback] DB insert failed:', err);
    }
  }

  // 2. Send email notification
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transport = createTransport();
      const emoji = TYPE_EMOJI[type] || '💬';
      await transport.sendMail({
        from: `"DAO Simulator Feedback" <${process.env.SMTP_USER}>`,
        replyTo: email ? `<${email}>` : undefined,
        to: RECIPIENT,
        subject: `${emoji} [Feedback] ${type}: ${message.slice(0, 60)}${message.length > 60 ? '...' : ''}`,
        text: [
          `Type: ${type}`,
          `Message: ${message}`,
          email ? `Email: ${email}` : null,
          url ? `Page: ${url}` : null,
          `IP: ${ip}`,
          `Time: ${body.timestamp || new Date().toISOString()}`,
        ].filter(Boolean).join('\n'),
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px;">
            <h3 style="margin: 0 0 12px;">${emoji} Simulator Feedback: <em>${type}</em></h3>
            <div style="background: #f4f4f5; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
              <p style="margin: 0; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/\n/g, '<br />')}</p>
            </div>
            <table style="font-size: 13px; color: #666;">
              ${email ? `<tr><td style="padding: 2px 8px 2px 0;"><strong>Email:</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>` : ''}
              ${url ? `<tr><td style="padding: 2px 8px 2px 0;"><strong>Page:</strong></td><td>${url}</td></tr>` : ''}
              <tr><td style="padding: 2px 8px 2px 0;"><strong>IP:</strong></td><td>${ip}</td></tr>
              <tr><td style="padding: 2px 8px 2px 0;"><strong>Time:</strong></td><td>${body.timestamp || new Date().toISOString()}</td></tr>
            </table>
          </div>
        `,
      });
      emailSent = true;
    } catch (err) {
      console.error('[feedback] Email send failed:', err);
    }
  }

  // At least one storage method must succeed
  if (!dbSaved && !emailSent) {
    // Fallback: log to stdout so Railway logs capture it
    console.log('[feedback]', JSON.stringify({ type, message, email, url, ip }));
  }

  return NextResponse.json({ ok: true, db: dbSaved, email: emailSent });
}
