import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportMocks = vi.hoisted(() => ({
  sendDailyReport: vi.fn(),
}));

vi.mock('@/lib/analytics/report', () => reportMocks);

const mutableEnv = process.env as Record<string, string | undefined>;
const originalEnv = { ...mutableEnv };

function resetEnv() {
  for (const key of Object.keys(mutableEnv)) {
    delete mutableEnv[key];
  }
  Object.assign(mutableEnv, originalEnv);
  mutableEnv.NODE_ENV = 'production';
  mutableEnv.API_KEY = 'test-api-key';
  mutableEnv.NEXTAUTH_SECRET = 'test-nextauth-secret';
  mutableEnv.ADMIN_USERNAME = 'admin';
  mutableEnv.ADMIN_PASSWORD = 'password';
}

function authorizedRequest(body: unknown = { days: 14 }) {
  return new NextRequest('http://localhost/api/analytics/report', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-API-Key': 'test-api-key',
    },
    body: JSON.stringify(body),
  });
}

function expectNoStoreNosniff(response: Response) {
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
}

describe('analytics report API route', () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
    reportMocks.sendDailyReport.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetEnv();
  });

  it('sends analytics reports with the requested day window', async () => {
    reportMocks.sendDailyReport.mockResolvedValueOnce({ sent: true });

    const { POST } = await import('../app/api/analytics/report/route');
    const response = await POST(authorizedRequest({ days: 14 }));

    expect(response.status).toBe(200);
    expectNoStoreNosniff(response);
    expect(reportMocks.sendDailyReport).toHaveBeenCalledWith(14);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('returns a controlled error when report sending fails normally', async () => {
    reportMocks.sendDailyReport.mockResolvedValueOnce({
      sent: false,
      error: 'SMTP_USER and SMTP_PASS are required',
    });

    const { POST } = await import('../app/api/analytics/report/route');
    const response = await POST(authorizedRequest({ days: 30 }));

    expect(response.status).toBe(500);
    expectNoStoreNosniff(response);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'SMTP_USER and SMTP_PASS are required',
    });
  });

  it('returns a controlled error when report sending throws unexpectedly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportMocks.sendDailyReport.mockRejectedValueOnce(new Error('transport crashed'));

    const { POST } = await import('../app/api/analytics/report/route');
    const response = await POST(authorizedRequest({ days: 7 }));

    expect(response.status).toBe(500);
    expectNoStoreNosniff(response);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'transport crashed',
    });
  });
});
