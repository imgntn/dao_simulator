import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from '../proxy';

function expectSecurityHeaders(response: Response) {
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  expect(response.headers.get('Permissions-Policy')).toContain('camera=()');
  expect(response.headers.get('x-nonce')).toMatch(/[0-9a-f-]{36}/);
  expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  expect(response.headers.get('Content-Security-Policy')).toContain(`'nonce-${response.headers.get('x-nonce')}'`);
}

describe('proxy', () => {
  it('adds security headers to localized page responses', () => {
    const response = proxy(new NextRequest('https://example.test/en/simulate'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expectSecurityHeaders(response);
  });

  it('adds security headers to locale redirects', () => {
    const response = proxy(new NextRequest('https://example.test/simulate', {
      headers: { 'accept-language': 'es,en;q=0.8' },
    }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.test/es/simulate');
    expectSecurityHeaders(response);
  });

  it('uses a valid locale cookie before accept-language', () => {
    const response = proxy(new NextRequest('https://example.test/results', {
      headers: {
        cookie: 'NEXT_LOCALE=ja',
        'accept-language': 'es,en;q=0.8',
      },
    }));

    expect(response.headers.get('location')).toBe('https://example.test/ja/results');
  });
});
