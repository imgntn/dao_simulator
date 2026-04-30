import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analyticsMocks = vi.hoisted(() => ({
  getStats: vi.fn(),
  increment: vi.fn(),
}));

vi.mock('@/lib/analytics/store', () => analyticsMocks);

const mutableEnv = process.env as Record<string, string | undefined>;
const originalEnv = { ...mutableEnv };

function resetEnv() {
  for (const key of Object.keys(mutableEnv)) {
    delete mutableEnv[key];
  }
  Object.assign(mutableEnv, originalEnv);
  delete mutableEnv.API_KEY;
  delete mutableEnv.NODE_ENV;
}

describe('analytics API route', () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
    analyticsMocks.getStats.mockReset();
    analyticsMocks.increment.mockReset();
    analyticsMocks.getStats.mockResolvedValue([]);
  });

  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it('rejects non-object JSON payloads', async () => {
    const { POST } = await import('../app/api/analytics/route');
    const response = await POST(new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'null',
    }) as never);

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(analyticsMocks.increment).not.toHaveBeenCalled();
  });

  it('rate limits malformed analytics payload floods', async () => {
    const { POST } = await import('../app/api/analytics/route');
    let response: Response | null = null;

    for (let index = 0; index < 121; index += 1) {
      response = await POST(new Request('http://localhost/api/analytics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.121',
        },
        body: 'null',
      }) as never);
      await response.body?.cancel();
    }

    expect(response?.status).toBe(429);
    expect(analyticsMocks.increment).not.toHaveBeenCalled();
  });

  it('records valid pageview analytics', async () => {
    const { POST } = await import('../app/api/analytics/route');
    const response = await POST(new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'pageview',
        path: '/en',
        referrer: 'https://example.test',
        device: 'desktop',
      }),
    }) as never);

    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(analyticsMocks.increment).toHaveBeenCalledWith('pageview', '/en');
    expect(analyticsMocks.increment).toHaveBeenCalledWith('referrer', 'https://example.test');
    expect(analyticsMocks.increment).toHaveBeenCalledWith('device', 'desktop');
  });

  it('records valid event analytics', async () => {
    const { POST } = await import('../app/api/analytics/route');
    const response = await POST(new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'event',
        name: 'cta_click',
      }),
    }) as never);

    expect(response.status).toBe(204);
    expect(analyticsMocks.increment).toHaveBeenCalledWith('event', 'cta_click');
  });

  it('does not fail client requests when analytics writes fail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    analyticsMocks.increment.mockRejectedValueOnce(new Error('database offline'));

    const { POST } = await import('../app/api/analytics/route');
    const response = await POST(new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'event',
        name: 'cta_click',
      }),
    }) as never);

    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('returns a controlled error when analytics stats fail unexpectedly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'test-api-key';
    mutableEnv.NEXTAUTH_SECRET = 'test-nextauth-secret';
    mutableEnv.ADMIN_USERNAME = 'admin';
    mutableEnv.ADMIN_PASSWORD = 'password';
    analyticsMocks.getStats.mockRejectedValueOnce(new Error('database offline'));

    const { GET } = await import('../app/api/analytics/route');
    const response = await GET(new NextRequest('http://localhost/api/analytics?days=7', {
      headers: { 'X-API-Key': 'test-api-key' },
    }));

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to load analytics stats',
    });
  });
});
