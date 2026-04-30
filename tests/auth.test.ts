// Auth module tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { safeCompare, rateLimiter, requireAuth } from '@/lib/auth';

function expectNoStoreNosniff(response: Response) {
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
}

describe('safeCompare', () => {
  it('should return true for matching strings', () => {
    expect(safeCompare('hello', 'hello')).toBe(true);
    expect(safeCompare('api-key-123', 'api-key-123')).toBe(true);
  });

  it('should return false for non-matching strings', () => {
    expect(safeCompare('hello', 'world')).toBe(false);
    expect(safeCompare('api-key-123', 'api-key-456')).toBe(false);
  });

  it('should return false for different length strings', () => {
    expect(safeCompare('short', 'much-longer-string')).toBe(false);
    expect(safeCompare('a', 'ab')).toBe(false);
  });

  it('should return false for empty strings', () => {
    expect(safeCompare('', 'something')).toBe(false);
    expect(safeCompare('something', '')).toBe(false);
  });

  it('should return true for two empty strings', () => {
    expect(safeCompare('', '')).toBe(true);
  });

  it('should handle special characters', () => {
    expect(safeCompare('key!@#$%^&*()', 'key!@#$%^&*()')).toBe(true);
    expect(safeCompare('key!@#$%', 'key!@#$^')).toBe(false);
  });

  it('should return false for non-string inputs', () => {
    // @ts-expect-error - testing invalid input
    expect(safeCompare(null, 'string')).toBe(false);
    // @ts-expect-error - testing invalid input
    expect(safeCompare('string', undefined)).toBe(false);
    // @ts-expect-error - testing invalid input
    expect(safeCompare(123, 'string')).toBe(false);
  });
});

describe('RateLimiter', () => {
  const testClientId = 'test-client-123';

  beforeEach(async () => {
    // Reset rate limiter state
    await rateLimiter.reset(testClientId);
  });

  it('should not block on first attempt', async () => {
    await rateLimiter.reset(testClientId);
    expect((await rateLimiter.check(testClientId)).limited).toBe(false);
  });

  it('should record attempts', async () => {
    await rateLimiter.reset(testClientId);
    await rateLimiter.record(testClientId);
    await rateLimiter.record(testClientId);

    // Should still not be blocked (under threshold)
    expect((await rateLimiter.check(testClientId)).limited).toBe(false);
  });

  it('should block after max attempts', async () => {
    await rateLimiter.reset(testClientId);
    // Record 10 attempts (the default max)
    for (let i = 0; i < 10; i++) {
      await rateLimiter.record(testClientId);
    }

    expect((await rateLimiter.check(testClientId)).limited).toBe(true);
  });

  it('should reset attempts', async () => {
    await rateLimiter.reset(testClientId);
    // Record several attempts
    for (let i = 0; i < 10; i++) {
      await rateLimiter.record(testClientId);
    }

    expect((await rateLimiter.check(testClientId)).limited).toBe(true);

    // Reset
    await rateLimiter.reset(testClientId);

    expect((await rateLimiter.check(testClientId)).limited).toBe(false);
  });

  it('should not block different clients', async () => {
    const client1 = 'client-1';
    const client2 = 'client-2';
    await rateLimiter.reset(client1);
    await rateLimiter.reset(client2);

    // Block client1
    for (let i = 0; i < 10; i++) {
      await rateLimiter.record(client1);
    }

    expect((await rateLimiter.check(client1)).limited).toBe(true);
    expect((await rateLimiter.check(client2)).limited).toBe(false);

    // Cleanup
    await rateLimiter.reset(client1);
    await rateLimiter.reset(client2);
  });
});

describe('requireAuth', () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const originalEnv = { ...mutableEnv };

  beforeEach(() => {
    // Reset environment
    for (const key of Object.keys(mutableEnv)) {
      delete mutableEnv[key];
    }
    Object.assign(mutableEnv, originalEnv);
    delete mutableEnv.API_KEY;
    delete mutableEnv.NODE_ENV;
  });

  afterEach(() => {
    for (const key of Object.keys(mutableEnv)) {
      delete mutableEnv[key];
    }
    Object.assign(mutableEnv, originalEnv);
  });

  it('should allow requests in development without API_KEY', async () => {
    mutableEnv.NODE_ENV = 'development';

    const request = new Request('http://localhost/api/test', {
      headers: {},
    });

    const result = await requireAuth(request);
    expect(result).toBeNull();
  });

  it('should reject requests in production without API_KEY', async () => {
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.NEXTAUTH_SECRET = 'auth-test-nextauth-secret-32chars';
    mutableEnv.ADMIN_USERNAME = 'operator';
    mutableEnv.ADMIN_PASSWORD = 'auth-test-password';

    const request = new Request('http://localhost/api/test', {
      headers: {},
    });

    const result = await requireAuth(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(503);
    expectNoStoreNosniff(result!);
  });

  it('should allow requests with valid API_KEY', async () => {
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'valid-api-key-for-auth-tests';
    mutableEnv.NEXTAUTH_SECRET = 'auth-test-nextauth-secret-32chars';
    mutableEnv.ADMIN_USERNAME = 'operator';
    mutableEnv.ADMIN_PASSWORD = 'auth-test-password';

    const request = new Request('http://localhost/api/test', {
      headers: {
        'X-API-Key': 'valid-api-key-for-auth-tests',
      },
    });

    const result = await requireAuth(request);
    expect(result).toBeNull();
  });

  it('should reject requests with invalid API_KEY', async () => {
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'valid-api-key-for-auth-tests';
    mutableEnv.NEXTAUTH_SECRET = 'auth-test-nextauth-secret-32chars';
    mutableEnv.ADMIN_USERNAME = 'operator';
    mutableEnv.ADMIN_PASSWORD = 'auth-test-password';

    const request = new Request('http://localhost/api/test', {
      headers: {
        'X-API-Key': 'invalid-api-key',
      },
    });

    const result = await requireAuth(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    expectNoStoreNosniff(result!);
  });

  it('should reject rate-limited clients', async () => {
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'valid-api-key-for-auth-tests';
    mutableEnv.NEXTAUTH_SECRET = 'auth-test-nextauth-secret-32chars';
    mutableEnv.ADMIN_USERNAME = 'operator';
    mutableEnv.ADMIN_PASSWORD = 'auth-test-password';
    mutableEnv.TRUST_PROXY = 'true';

    const clientIp = '192.168.1.100';

    // Simulate rate limit
    for (let i = 0; i < 10; i++) {
      await rateLimiter.record(clientIp);
    }

    const request = new Request('http://localhost/api/test', {
      headers: {
        'X-Forwarded-For': clientIp,
        'X-API-Key': 'invalid-key',
      },
    });

    const result = await requireAuth(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
    expectNoStoreNosniff(result!);

    const body = await result?.json();
    expect(body.error).toContain('Too many');

    // Cleanup
    await rateLimiter.reset(clientIp);
  });
});
