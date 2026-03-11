import nodemailer from 'nodemailer';
import type { AnalyticsRow } from './store';
import { getStats } from './store';

const DEFAULT_RECIPIENTS = [
  'hello@daosimulator.com',
  'james@jamesbpollack.com',
  'hello@playablefuture.com',
];

function getRecipients(): string[] {
  const env = process.env.REPORT_RECIPIENTS;
  if (env) return env.split(',').map(e => e.trim()).filter(Boolean);
  return DEFAULT_RECIPIENTS;
}

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

/** Group raw rows into { [category]: { [key]: totalCount } } for a given date range */
function summarize(rows: AnalyticsRow[]) {
  const byCategory: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!byCategory[r.category]) byCategory[r.category] = {};
    byCategory[r.category][r.key] = (byCategory[r.category][r.key] || 0) + r.count;
  }
  return byCategory;
}

function renderTable(title: string, data: Record<string, number> | undefined): string {
  if (!data || Object.keys(data).length === 0) {
    return `<h3 style="margin:16px 0 4px">${title}</h3><p style="color:#888">No data</p>`;
  }

  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const rows = sorted
    .map(([key, count]) => `<tr><td style="padding:4px 12px 4px 0;border-bottom:1px solid #eee">${key}</td><td style="padding:4px 0;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">${count.toLocaleString()}</td></tr>`)
    .join('');

  return `
    <h3 style="margin:16px 0 4px">${title}</h3>
    <table style="border-collapse:collapse;width:100%;max-width:500px;font-size:14px">
      <thead><tr><th style="text-align:left;padding:4px 12px 4px 0;border-bottom:2px solid #ccc">Key</th><th style="text-align:right;padding:4px 0;border-bottom:2px solid #ccc">Count</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildHtml(summary: ReturnType<typeof summarize>, days: number): string {
  const date = new Date().toISOString().slice(0, 10);
  const totalPageviews = Object.values(summary['pageview'] || {}).reduce((s, n) => s + n, 0);
  const totalEvents = Object.values(summary['event'] || {}).reduce((s, n) => s + n, 0);

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222">
  <h2 style="margin:0 0 4px">DAO Simulator — Analytics Report</h2>
  <p style="color:#666;margin:0 0 16px">${date} &middot; Last ${days} days &middot; ${totalPageviews.toLocaleString()} page views &middot; ${totalEvents.toLocaleString()} events</p>
  ${renderTable('Page Views', summary['pageview'])}
  ${renderTable('Events', summary['event'])}
  ${renderTable('Referrers', summary['referrer'])}
  ${renderTable('Devices', summary['device'])}
  <hr style="margin:24px 0;border:none;border-top:1px solid #ddd">
  <p style="color:#999;font-size:12px">Sent from DAO Simulator analytics. No PII is collected or stored.</p>
</body></html>`;
}

export async function sendDailyReport(days = 7): Promise<{ sent: boolean; error?: string }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return { sent: false, error: 'SMTP_USER and SMTP_PASS are required' };
  }

  const rows = await getStats(days);
  const summary = summarize(rows);
  const html = buildHtml(summary, days);
  const date = new Date().toISOString().slice(0, 10);

  const transport = createTransport();

  try {
    await transport.sendMail({
      from: `"DAO Simulator" <${user}>`,
      to: getRecipients().join(', '),
      subject: `DAO Simulator Analytics — ${date}`,
      html,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analytics] report send failed:', message);
    return { sent: false, error: message };
  } finally {
    transport.close();
  }
}
