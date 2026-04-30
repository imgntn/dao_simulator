import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { InMemoryRateLimiter, getClientIdentifier } from '@/lib/utils/rate-limit';
import {
  escapeHtml,
  isRecord,
  isValidEmail,
  noStoreHeaders,
  readStringField,
  sanitizeHeaderValue,
} from '@/lib/utils/http-safety';

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

const RECIPIENT = process.env.CONTACT_EMAIL || process.env.SMTP_USER || 'hello@daosimulator.com';
const TYPE_LABEL: Record<string, string> = {
  bug: 'Bug',
  feature: 'Feature',
  general: 'General',
};

let pool: Pool | null = null;
let tableEnsured = false;

const feedbackLimiter = new InMemoryRateLimiter(10, 10 * 60 * 1000);

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

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: Number.parseInt(process.env.SMTP_PORT || '465', 10),
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request, 'feedback');
  const rateLimit = feedbackLimiter.check(clientId);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Too many feedback requests. Please try again later.' },
      { status: 429, headers: noStoreHeaders({ 'Retry-After': String(rateLimit.retryAfter) }) }
    );
  }
  feedbackLimiter.record(clientId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: noStoreHeaders() });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400, headers: noStoreHeaders() });
  }

  const message = readStringField(body.message, 2000);
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400, headers: noStoreHeaders() });
  }

  const typeCandidate = readStringField(body.type, 20);
  const type = ['bug', 'feature', 'general'].includes(typeCandidate) ? typeCandidate : 'general';
  const emailCandidate = readStringField(body.email, 200);
  if (emailCandidate && !isValidEmail(emailCandidate)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400, headers: noStoreHeaders() });
  }

  const email = emailCandidate || null;
  const url = readStringField(body.url, 500, { trim: false }) || null;
  const userAgent = readStringField(body.userAgent, 300, { trim: false }) || null;
  const ip = getClientIdentifier(request, '');
  const timestamp = readStringField(body.timestamp, 80) || new Date().toISOString();

  let dbSaved = false;
  let emailSent = false;

  if (await ensureTable()) {
    try {
      const p = getPool()!;
      await p.query(INSERT_SQL, [type, message, email, url, userAgent, ip]);
      dbSaved = true;
    } catch (err) {
      console.error('[feedback] DB insert failed:', err);
    }
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transport = createTransport();
      const label = TYPE_LABEL[type] || TYPE_LABEL.general;
      await transport.sendMail({
        from: `"DAO Simulator Feedback" <${process.env.SMTP_USER}>`,
        replyTo: email ? `<${email}>` : undefined,
        to: RECIPIENT,
        subject: sanitizeHeaderValue(`[Feedback] ${label}: ${message.slice(0, 60)}${message.length > 60 ? '...' : ''}`, 180),
        text: [
          `Type: ${type}`,
          `Message: ${message}`,
          email ? `Email: ${email}` : null,
          url ? `Page: ${url}` : null,
          `IP: ${ip}`,
          `Time: ${timestamp}`,
        ].filter(Boolean).join('\n'),
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px;">
            <h3 style="margin: 0 0 12px;">Simulator Feedback: <em>${escapeHtml(label)}</em></h3>
            <div style="background: #f4f4f5; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
              <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message).replace(/\n/g, '<br />')}</p>
            </div>
            <table style="font-size: 13px; color: #666;">
              ${email ? `<tr><td style="padding: 2px 8px 2px 0;"><strong>Email:</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>` : ''}
              ${url ? `<tr><td style="padding: 2px 8px 2px 0;"><strong>Page:</strong></td><td>${escapeHtml(url)}</td></tr>` : ''}
              <tr><td style="padding: 2px 8px 2px 0;"><strong>IP:</strong></td><td>${escapeHtml(ip)}</td></tr>
              <tr><td style="padding: 2px 8px 2px 0;"><strong>Time:</strong></td><td>${escapeHtml(timestamp)}</td></tr>
            </table>
          </div>
        `,
      });
      emailSent = true;
    } catch (err) {
      console.error('[feedback] Email send failed:', err);
    }
  }

  if (!dbSaved && !emailSent) {
    console.log('[feedback]', JSON.stringify({
      type,
      messageLength: message.length,
      emailPresent: Boolean(email),
      urlPresent: Boolean(url),
      clientKnown: !ip.startsWith('unknown:'),
    }));
  }

  return NextResponse.json({ ok: true, db: dbSaved, email: emailSent }, { headers: noStoreHeaders() });
}
