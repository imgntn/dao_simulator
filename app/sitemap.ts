import type { MetadataRoute } from 'next';

const locales = ['en', 'es', 'zh', 'ja'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://daosimulator.com';

  const pages = ['', '/console'];

  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? ('weekly' as const) : ('monthly' as const),
      priority: page === '' ? 1 : 0.5,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alt) => [alt, `${baseUrl}/${alt}${page}`])
        ),
      },
    }))
  );
}
