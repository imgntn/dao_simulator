import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'es', 'zh', 'ja'];
const defaultLocale = 'en';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    return NextResponse.next();
  }

  // Check if pathname already has a valid locale prefix.
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) {
    return NextResponse.next();
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
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon|robots\\.txt|sitemap\\.xml).*)',
  ],
};
