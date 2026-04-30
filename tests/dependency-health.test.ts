import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('dependency readiness checks', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('skips optional dependencies that are not configured', async () => {
    const { getReadinessReport } = await import('@/lib/utils/dependency-health');
    const report = await getReadinessReport({ NODE_ENV: 'development' });

    expect(report.ok).toBe(true);
    expect(report.checks.runtimeEnv.status).toBe('ok');
    expect(report.checks.redis.status).toBe('skipped');
    expect(report.checks.postgres.status).toBe('skipped');
  });

  it('fails readiness when production env validation fails', async () => {
    const { getReadinessReport } = await import('@/lib/utils/dependency-health');
    const report = await getReadinessReport({ NODE_ENV: 'production' });

    expect(report.ok).toBe(false);
    expect(report.checks.runtimeEnv.status).toBe('failed');
    expect(report.checks.runtimeEnv.errors).toContain('NEXTAUTH_SECRET is required in production.');
  });

  it('fails Redis readiness when Redis is enabled without a URL', async () => {
    const { checkRedisHealth } = await import('@/lib/utils/dependency-health');
    const result = await checkRedisHealth({ USE_REDIS: 'true' });

    expect(result.status).toBe('failed');
    expect(result.message).toBe('REDIS_URL is required when Redis is enabled.');
  });

  it('reports Redis connection failures without throwing', async () => {
    vi.doMock('ioredis', () => ({
      default: class MockRedis {
        async connect() {
          throw new Error('redis unavailable');
        }

        async ping() {
          return 'PONG';
        }

        disconnect() {}
      },
    }));

    try {
      const { checkRedisHealth } = await import('@/lib/utils/dependency-health');
      const result = await checkRedisHealth({ REDIS_URL: 'redis://example.invalid:6379' });

      expect(result.status).toBe('failed');
      expect(result.message).toContain('redis unavailable');
    } finally {
      vi.doUnmock('ioredis');
    }
  });

  it('reports PostgreSQL connection failures without throwing', async () => {
    vi.doMock('pg', () => ({
      Pool: class MockPool {
        async query() {
          throw new Error('postgres unavailable');
        }

        async end() {}
      },
    }));

    try {
      const { checkPostgresHealth } = await import('@/lib/utils/dependency-health');
      const result = await checkPostgresHealth({ DATABASE_URL: 'postgres://example.invalid/db' });

      expect(result.status).toBe('failed');
      expect(result.message).toContain('postgres unavailable');
    } finally {
      vi.doUnmock('pg');
    }
  });
});
