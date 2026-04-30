import Redis from 'ioredis';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfter: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult | Promise<RateLimitResult>;
  record(key: string): void | Promise<void>;
  reset(key: string): void | Promise<void>;
}

export class InMemoryRateLimiter {
  private entries = new Map<string, RateLimitEntry>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number
  ) {
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.cleanup(), Math.min(windowMs, 60_000));
      if (typeof (timer as { unref?: () => void }).unref === 'function') {
        (timer as { unref: () => void }).unref();
      }
    }
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.resetAt) {
      return { limited: false, retryAfter: 0 };
    }

    if (entry.count >= this.maxAttempts) {
      return {
        limited: true,
        retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    }

    return { limited: false, retryAfter: 0 };
  }

  record(key: string): void {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    entry.count += 1;
  }

  isBlocked(key: string): boolean {
    return this.check(key).limited;
  }

  recordAttempt(key: string): void {
    this.record(key);
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }
}

export class RedisRateLimiter implements RateLimiter {
  private client: Redis | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly prefix = 'rate',
    private readonly redisUrl = process.env.REDIS_URL
  ) {}

  private key(key: string): string {
    return `dao-sim:rate:${this.prefix}:${encodeURIComponent(key).slice(0, 240)}`;
  }

  private async connect(): Promise<Redis> {
    if (this.client) return this.client;
    this.client = new Redis(this.redisUrl || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
    this.client.on('error', (error) => {
      console.error('[rate-limit] Redis error:', error);
    });
    this.connectPromise ??= this.client.connect();
    await this.connectPromise;
    return this.client;
  }

  async check(key: string): Promise<RateLimitResult> {
    try {
      const client = await this.connect();
      const redisKey = this.key(key);
      const [countRaw, ttlMs] = await Promise.all([
        client.get(redisKey),
        client.pttl(redisKey),
      ]);
      const count = Number.parseInt(countRaw || '0', 10);
      if (count >= this.maxAttempts) {
        return {
          limited: true,
          retryAfter: Math.max(1, Math.ceil(Math.max(ttlMs, 0) / 1000)),
        };
      }
    } catch (error) {
      console.error('[rate-limit] Redis check failed; allowing request:', error);
    }
    return { limited: false, retryAfter: 0 };
  }

  async record(key: string): Promise<void> {
    try {
      const client = await this.connect();
      const redisKey = this.key(key);
      const count = await client.incr(redisKey);
      if (count === 1) {
        await client.pexpire(redisKey, this.windowMs);
      }
    } catch (error) {
      console.error('[rate-limit] Redis record failed:', error);
    }
  }

  async reset(key: string): Promise<void> {
    try {
      const client = await this.connect();
      await client.del(this.key(key));
    } catch (error) {
      console.error('[rate-limit] Redis reset failed:', error);
    }
  }
}

export function createRateLimiter(
  maxAttempts: number,
  windowMs: number,
  prefix: string
): RateLimiter {
  const shouldUseRedis = typeof window === 'undefined'
    && Boolean(process.env.REDIS_URL)
    && process.env.USE_REDIS_RATE_LIMITS !== 'false';

  if (shouldUseRedis) {
    return new RedisRateLimiter(maxAttempts, windowMs, prefix);
  }

  return new InMemoryRateLimiter(maxAttempts, windowMs);
}

export function getClientIdentifier(request: Request, prefix = 'client'): string {
  const headers = request.headers;
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    headers.get('fly-client-ip'),
  ].filter((value): value is string => Boolean(value));

  if (candidates.length > 0) {
    return prefix ? `${prefix}:${candidates[0]}` : candidates[0];
  }

  const userAgent = headers.get('user-agent') ?? 'unknown-ua';
  return prefix ? `${prefix}:unknown:${userAgent.slice(0, 80)}` : `unknown:${userAgent.slice(0, 80)}`;
}
