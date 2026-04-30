import Redis from 'ioredis';
import { Pool } from 'pg';
import { validateRuntimeEnv } from '@/lib/config/env';

export type DependencyStatus = 'ok' | 'failed' | 'skipped';

export interface HealthCheck {
  status: DependencyStatus;
  latencyMs?: number;
  message?: string;
  errors?: string[];
  warnings?: string[];
}

export interface ReadinessReport {
  ok: boolean;
  checks: {
    runtimeEnv: HealthCheck;
    redis: HealthCheck;
    postgres: HealthCheck;
  };
}

const DEFAULT_TIMEOUT_MS = 2_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function withTimeout<T>(
  label: string,
  timeoutMs: number,
  task: () => Promise<T>
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        if (typeof (timeout as { unref?: () => void }).unref === 'function') {
          (timeout as { unref: () => void }).unref();
        }
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function timedCheck(task: () => Promise<void>): Promise<Pick<HealthCheck, 'latencyMs'>> {
  const start = Date.now();
  await task();
  return { latencyMs: Date.now() - start };
}

export async function checkRedisHealth(
  env: Record<string, string | undefined> = process.env,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<HealthCheck> {
  const redisUrl = env.REDIS_URL;
  const enabled = Boolean(redisUrl) || env.USE_REDIS === 'true';
  if (!enabled) {
    return { status: 'skipped', message: 'Redis is not configured.' };
  }
  if (!redisUrl) {
    return { status: 'failed', message: 'REDIS_URL is required when Redis is enabled.' };
  }

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  try {
    const timing = await timedCheck(async () => {
      await withTimeout('Redis health check', timeoutMs, async () => {
        await client.connect();
        await client.ping();
      });
    });
    return { status: 'ok', ...timing };
  } catch (error) {
    return { status: 'failed', message: errorMessage(error) };
  } finally {
    client.disconnect();
  }
}

export async function checkPostgresHealth(
  env: Record<string, string | undefined> = process.env,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<HealthCheck> {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return { status: 'skipped', message: 'PostgreSQL analytics is not configured.' };
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });

  try {
    const timing = await timedCheck(async () => {
      await withTimeout('PostgreSQL health check', timeoutMs, async () => {
        await pool.query('SELECT 1');
      });
    });
    return { status: 'ok', ...timing };
  } catch (error) {
    return { status: 'failed', message: errorMessage(error) };
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function getReadinessReport(
  env: Record<string, string | undefined> = process.env
): Promise<ReadinessReport> {
  const runtimeEnv = validateRuntimeEnv({ env });
  const [redis, postgres] = await Promise.all([
    checkRedisHealth(env),
    checkPostgresHealth(env),
  ]);

  const runtimeCheck: HealthCheck = runtimeEnv.ok
    ? {
        status: 'ok',
        warnings: runtimeEnv.warnings,
      }
    : {
        status: 'failed',
        errors: runtimeEnv.errors,
        warnings: runtimeEnv.warnings,
      };

  const checks = {
    runtimeEnv: runtimeCheck,
    redis,
    postgres,
  };

  return {
    ok: Object.values(checks).every((check) => check.status !== 'failed'),
    checks,
  };
}
