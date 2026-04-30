interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfter: number;
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
