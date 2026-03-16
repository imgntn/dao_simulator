import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, message } = body;
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // If SMTP is not configured, log and return success (dev mode)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Contact Form] SMTP not configured. Message from:', name, email, message);
    return NextResponse.json({ ok: true, dev: true });
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"DAO Simulator Contact" <${process.env.SMTP_USER}>`,
      replyTo: `"${name}" <${email}>`,
      to: RECIPIENT,
      subject: `[DAO Simulator] Contact from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <h3>New contact form submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <hr />
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Contact Form] Send failed:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
