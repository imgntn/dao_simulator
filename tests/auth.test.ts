// Auth module tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { safeCompare, rateLimiter, requireAuth } from '@/lib/auth';

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

  beforeEach(() => {
    // Reset rate limiter state
    rateLimiter.reset(testClientId);
  });

  it('should not block on first attempt', () => {
    expect(rateLimiter.isBlocked(testClientId)).toBe(false);
  });

  it('should record attempts', () => {
    rateLimiter.recordAttempt(testClientId);
    rateLimiter.recordAttempt(testClientId);

    // Should still not be blocked (under threshold)
    expect(rateLimiter.isBlocked(testClientId)).toBe(false);
  });

  it('should block after max attempts', () => {
    // Record 10 attempts (the default max)
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordAttempt(testClientId);
    }

    expect(rateLimiter.isBlocked(testClientId)).toBe(true);
  });

  it('should reset attempts', () => {
    // Record several attempts
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordAttempt(testClientId);
    }

    expect(rateLimiter.isBlocked(testClientId)).toBe(true);

    // Reset
    rateLimiter.reset(testClientId);

    expect(rateLimiter.isBlocked(testClientId)).toBe(false);
  });

  it('should not block different clients', () => {
    const client1 = 'client-1';
    const client2 = 'client-2';

    // Block client1
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordAttempt(client1);
    }

    expect(rateLimiter.isBlocked(client1)).toBe(true);
    expect(rateLimiter.isBlocked(client2)).toBe(false);

    // Cleanup
    rateLimiter.reset(client1);
    rateLimiter.reset(client2);
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

    const request = new Request('http://localhost/api/test', {
      headers: {},
    });

    const result = await requireAuth(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it('should allow requests with valid API_KEY', async () => {
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'valid-api-key';

    const request = new Request('http://localhost/api/test', {
      headers: {
        'X-API-Key': 'valid-api-key',
      },
    });

    const result = await requireAuth(request);
    expect(result).toBeNull();
  });

  it('should reject requests with invalid API_KEY', async () => {
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'valid-api-key';

    const request = new Request('http://localhost/api/test', {
      headers: {
        'X-API-Key': 'invalid-api-key',
      },
    });

    const result = await requireAuth(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it('should reject rate-limited clients', async () => {
    mutableEnv.NODE_ENV = 'production';
    mutableEnv.API_KEY = 'valid-api-key';
    mutableEnv.TRUST_PROXY = 'true';

    const clientIp = '192.168.1.100';

    // Simulate rate limit
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordAttempt(clientIp);
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

    const body = await result?.json();
    expect(body.error).toContain('Too many');

    // Cleanup
    rateLimiter.reset(clientIp);
  });
});
