// Authentication configuration for NextAuth.js (v5)

import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { timingSafeEqual } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
// Skip checks during Next.js build phase (NEXT_PHASE is set during build)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (isProduction && !isBuildPhase) {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is required in production.');
  }
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required in production.');
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Pad shorter string to same length to prevent length-based timing attacks
  const maxLength = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLength, '\0');
  const paddedB = b.padEnd(maxLength, '\0');

  try {
    return timingSafeEqual(
      Buffer.from(paddedA, 'utf8'),
      Buffer.from(paddedB, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Simple in-memory rate limiter for API authentication
 * Tracks failed attempts by IP/key and blocks after threshold
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private attempts = new Map<string, RateLimitEntry>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 10, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;

    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60000);
    }
  }

  isBlocked(key: string): boolean {
    const entry = this.attempts.get(key);
    if (!entry) return false;

    if (Date.now() > entry.resetAt) {
      this.attempts.delete(key);
      return false;
    }

    return entry.count >= this.maxAttempts;
  }

  recordAttempt(key: string): void {
    const now = Date.now();
    const entry = this.attempts.get(key);

    if (!entry || now > entry.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count++;
    }
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      if (now > entry.resetAt) {
        this.attempts.delete(key);
      }
    }
  }
}

// Global rate limiter instance - 10 failed attempts per minute per IP
const rateLimiter = new RateLimiter(10, 60000);

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Use environment variables for credentials
        // In production, these are required (checked at module load)
        // In development, fall back to defaults for convenience
        const validUsername = process.env.ADMIN_USERNAME || (isProduction ? '' : 'admin');
        const validPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'admin123');

        // Reject if credentials not configured (should not happen in production due to startup check)
        if (!validUsername || !validPassword) {
          console.error('Auth credentials not configured');
          return null;
        }

        const username = typeof credentials?.username === 'string' ? credentials.username : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        // Use timing-safe comparison to prevent timing attacks
        const usernameValid = safeCompare(username, validUsername);
        const passwordValid = safeCompare(password, validPassword);

        if (usernameValid && passwordValid) {
          return {
            id: '1',
            name: username,
            email: `${username}@daosimulator.local`,
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Extend session user with id from JWT token
        const userWithId = session.user as typeof session.user & { id?: string };
        userWithId.id = token.id as string;
      }
      return session;
    },
  },
  // In production, NEXTAUTH_SECRET is required (checked at module load)
  // In development, use a consistent dev secret for convenience
  secret: process.env.NEXTAUTH_SECRET || (isProduction ? undefined : 'dev-secret-do-not-use-in-production'),
};

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (trustProxy) {
    // Try to get real IP from various headers (for proxied requests)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
  }

  // Fall back to a hash of the request URL origin
  return 'unknown-client';
}

/**
 * Middleware function to protect API routes
 * Includes rate limiting and timing-safe API key comparison
 */
export async function requireAuth(request: Request): Promise<Response | null> {
  const clientId = getClientId(request);

  // Check if client is rate limited
  if (rateLimiter.isBlocked(clientId)) {
    return new Response(
      JSON.stringify({
        error: 'Too many failed authentication attempts. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  // Check for API key in headers
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.API_KEY;

  // In development, allow without auth if no API_KEY is set
  if (process.env.NODE_ENV === 'development' && !validApiKey) {
    return null;
  }

  // If API_KEY is set, validate it
  if (validApiKey) {
    if (apiKey && safeCompare(apiKey, validApiKey)) {
      // Successful auth - reset rate limit counter
      rateLimiter.reset(clientId);
      return null;
    }
  }

  // Production requires API_KEY to be set
  if (process.env.NODE_ENV === 'production' && !validApiKey) {
    console.warn('API_KEY is not set. Rejecting protected requests.');
  }

  // Record failed attempt for rate limiting
  rateLimiter.recordAttempt(clientId);

  // Unauthorized
  return new Response(
    JSON.stringify({ error: 'Unauthorized - API key required' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Export rate limiter for testing purposes
export { rateLimiter, safeCompare };
