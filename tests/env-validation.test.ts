import { describe, expect, it } from 'vitest';
import { validateRuntimeEnv } from '@/lib/config/env';

describe('runtime environment validation', () => {
  it('allows non-production environments without production secrets', () => {
    const result = validateRuntimeEnv({ nodeEnv: 'development', env: {} });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('skips validation during Next.js production build phase', () => {
    const result = validateRuntimeEnv({
      nodeEnv: 'production',
      phase: 'phase-production-build',
      env: {},
    });

    expect(result.ok).toBe(true);
  });

  it('rejects missing and weak production secrets', () => {
    const result = validateRuntimeEnv({
      nodeEnv: 'production',
      env: {
        NEXTAUTH_SECRET: 'generate-a-secret-key-here',
        API_KEY: 'short',
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'password',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'NEXTAUTH_SECRET must not use a placeholder or development value.',
      'API_KEY must be at least 24 characters.',
      'ADMIN_PASSWORD must not use a placeholder or development value.',
    ]));
  });

  it('accepts strong production configuration', () => {
    const result = validateRuntimeEnv({
      nodeEnv: 'production',
      env: {
        NEXTAUTH_SECRET: 'n'.repeat(32),
        API_KEY: 'k'.repeat(32),
        ADMIN_USERNAME: 'operator',
        ADMIN_PASSWORD: 'p'.repeat(16),
        USE_REDIS: 'true',
        REDIS_URL: 'redis://localhost:6379',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires REDIS_URL when Redis is explicitly enabled', () => {
    const result = validateRuntimeEnv({
      nodeEnv: 'production',
      env: {
        NEXTAUTH_SECRET: 'n'.repeat(32),
        API_KEY: 'k'.repeat(32),
        ADMIN_USERNAME: 'operator',
        ADMIN_PASSWORD: 'p'.repeat(16),
        USE_REDIS: 'true',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('REDIS_URL is required when USE_REDIS=true.');
  });
});
