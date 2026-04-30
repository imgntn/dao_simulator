import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  isRecord,
  isValidEmail,
  noStoreHeadersFrom,
  noStoreHeaders,
  readStringField,
  sanitizeContentDispositionFilename,
  sanitizeHeaderValue,
} from '@/lib/utils/http-safety';
import { InMemoryRateLimiter, getClientIdentifier } from '@/lib/utils/rate-limit';

describe('http-safety helpers', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml(`<script data-x="1">alert('x')</script>`)).toBe(
      '&lt;script data-x=&quot;1&quot;&gt;alert(&#39;x&#39;)&lt;/script&gt;'
    );
  });

  it('removes header-control characters', () => {
    expect(sanitizeHeaderValue('Hello\r\nBcc: attacker@example.com\u0000', 200)).toBe(
      'Hello Bcc: attacker@example.com'
    );
    expect(sanitizeHeaderValue(123)).toBe('');
  });

  it('sanitizes quoted content-disposition filenames', () => {
    expect(sanitizeContentDispositionFilename('report"; filename="evil.txt')).toBe(
      'report_ filename=_evil.txt'
    );
    expect(sanitizeContentDispositionFilename('../nested\\report.csv')).toBe(
      '.._nested_report.csv'
    );
    expect(sanitizeContentDispositionFilename('', 'fallback.csv')).toBe('fallback.csv');
  });

  it('adds no-store and nosniff response headers without dropping custom headers', () => {
    expect(noStoreHeaders({ 'Retry-After': '60' })).toEqual({
      'Retry-After': '60',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    const headers = noStoreHeadersFrom([['X-Custom', 'value']]);
    expect(headers.get('x-custom')).toBe('value');
    expect(headers.get('cache-control')).toBe('no-store');
    expect(headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('validates simple email shape', () => {
    expect(isValidEmail('person@example.com')).toBe(true);
    expect(isValidEmail('bad-address')).toBe(false);
    expect(isValidEmail('person@example')).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });

  it('extracts strings from untrusted payload fields', () => {
    expect(readStringField('  hello  ', 20)).toBe('hello');
    expect(readStringField('abcdef', 3)).toBe('abc');
    expect(readStringField(123, 20)).toBe('');
    expect(readStringField('  padded  ', 20, { trim: false })).toBe('  padded  ');
  });

  it('identifies JSON-like records', () => {
    expect(isRecord({ ok: true })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord(['nope'])).toBe(false);
  });
});

describe('rate limit helpers', () => {
  it('prefers forwarded client IPs over user-agent fallback', () => {
    const request = new Request('https://example.test', {
      headers: {
        'x-forwarded-for': '203.0.113.7, 10.0.0.1',
        'user-agent': 'test-agent',
      },
    });

    expect(getClientIdentifier(request, 'form')).toBe('form:203.0.113.7');
  });

  it('blocks after the configured number of attempts', () => {
    const limiter = new InMemoryRateLimiter(2, 60_000);
    expect(limiter.check('client').limited).toBe(false);
    limiter.record('client');
    limiter.record('client');
    expect(limiter.check('client').limited).toBe(true);
    limiter.reset('client');
    expect(limiter.check('client').limited).toBe(false);
  });
});
