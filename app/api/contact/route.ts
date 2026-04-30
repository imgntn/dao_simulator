import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createRateLimiter, getClientIdentifier } from '@/lib/utils/rate-limit';
import {
  escapeHtml,
  isRecord,
  isValidEmail,
  noStoreHeaders,
  readStringField,
  sanitizeHeaderValue,
} from '@/lib/utils/http-safety';

const RECIPIENT = process.env.CONTACT_EMAIL || process.env.SMTP_USER || 'hello@daosimulator.com';
const contactLimiter = createRateLimiter(5, 10 * 60 * 1000, 'contact');

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

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request, 'contact');
  const rateLimit = await contactLimiter.check(clientId);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Too many contact requests. Please try again later.' },
      { status: 429, headers: noStoreHeaders({ 'Retry-After': String(rateLimit.retryAfter) }) }
    );
  }
  await contactLimiter.record(clientId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: noStoreHeaders() });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400, headers: noStoreHeaders() });
  }

  const name = sanitizeHeaderValue(body.name, 120);
  const email = readStringField(body.email, 200);
  const message = readStringField(body.message, 4000);
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400, headers: noStoreHeaders() });
  }

  // Basic email validation
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400, headers: noStoreHeaders() });
  }

  // If SMTP is not configured, log and return success (dev mode)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Contact Form] SMTP not configured.', JSON.stringify({
      emailPresent: Boolean(email),
      messageLength: message.length,
    }));
    return NextResponse.json({ ok: true, dev: true }, { headers: noStoreHeaders() });
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"DAO Simulator Contact" <${process.env.SMTP_USER}>`,
      replyTo: `"${name}" <${email}>`,
      to: RECIPIENT,
      subject: sanitizeHeaderValue(`[DAO Simulator] Contact from ${name}`, 180),
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <h3>New contact form submission</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <hr />
        <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
      `,
    });

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  } catch (err) {
    console.error('[Contact Form] Send failed:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500, headers: noStoreHeaders() });
  }
}
