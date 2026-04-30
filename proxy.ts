import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'es', 'zh', 'ja'];
const defaultLocale = 'en';

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()'],
];

function buildContentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    isDevelopment ? "'unsafe-eval'" : null,
  ].filter(Boolean).join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "media-src 'self' blob: data:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  for (const [name, value] of SECURITY_HEADERS) {
    response.headers.set(name, value);
  }
  response.headers.set('x-nonce', nonce);

  const cspHeader = process.env.CSP_REPORT_ONLY === 'true'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';
  response.headers.set(cspHeader, buildContentSecurityPolicy(nonce));

  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const nextInit = { request: { headers: requestHeaders } };

  // Skip API routes, Next.js internals, and static/public assets.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname.startsWith('/apple-icon') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.\w{2,5}$/.test(pathname)
  ) {
    return withSecurityHeaders(NextResponse.next(nextInit), nonce);
  }

  // Check if pathname already has a valid locale prefix.
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) {
    return withSecurityHeaders(NextResponse.next(nextInit), nonce);
  }

  // Check cookie first (set when user manually switches locale).
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const savedLocale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : null;

  // Fall back to Accept-Language header detection.
  const acceptLang = request.headers.get('accept-language') ?? '';
  const preferred = acceptLang
    .split(',')
    .map((part) => part.split(';')[0].trim().substring(0, 2).toLowerCase())
    .find((lang) => locales.includes(lang));

  const locale = savedLocale ?? preferred ?? defaultLocale;

  // Redirect to locale-prefixed path.
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return withSecurityHeaders(NextResponse.redirect(url), nonce);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon|robots\\.txt|sitemap\\.xml).*)',
  ],
};
