import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Space_Grotesk, Source_Serif_4 } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';
import { getMessages, isValidLocale, locales, defaultLocale, ogLocaleMap } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

const BASE_URL = 'https://daosimulator.com';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const m = getMessages(locale);

  const alternates: Record<string, string> = {};
  for (const loc of locales) {
    alternates[loc] = `${BASE_URL}/${loc}`;
  }

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: m.metadata.title,
      template: m.metadata.titleTemplate,
    },
    description: m.metadata.description,
    keywords: m.metadata.keywords,
    authors: [{ name: 'James B. Pollack', url: 'https://jamesbpollack.com' }],
    openGraph: {
      title: m.metadata.ogTitle,
      description: m.metadata.ogDescription,
      type: 'article',
      locale: ogLocaleMap[locale],
      siteName: m.metadata.ogSiteName,
      authors: ['James B. Pollack'],
      publishedTime: '2025-05-01T00:00:00Z',
      tags: [
        'DAO governance',
        'agent-based modeling',
        'digital twins',
        'quadratic voting',
        'governance capture',
        'treasury management',
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: m.metadata.twitterTitle,
      description: m.metadata.twitterDescription,
    },
    robots: { index: true, follow: true },
    icons: { icon: '/icon.svg' },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: alternates,
    },
    other: {
      // Highwire Press citation tags for Google Scholar indexing
      'citation_title': 'DAO Simulator: Governance Findings from 16,370 Agent-Based Simulation Runs',
      'citation_author': 'James B. Pollack',
      'citation_publication_date': '2025/05/01',
      'citation_pdf_url': `${BASE_URL}/paper/main.pdf`,
      'citation_language': locale,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4efe3',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;

  if (!isValidLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const m = getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('theme-dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} ${sourceSerif.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--accent-teal)] focus:text-white focus:rounded-lg"
        >
          {m.a11y.skipToMain}
        </a>
        <ThemeProvider>
          <LocaleProvider locale={locale} messages={m}>
            <div id="main-content" tabIndex={-1} className="outline-none">
              {children}
            </div>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
