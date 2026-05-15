import type { MetadataRoute } from 'next';

const locales = ['en', 'es', 'zh', 'ja'] as const;
const baseUrl = 'https://daosimulator.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const corePages = ['', '/console', '/simulate', '/health'];

  const localizedEntries = corePages.flatMap((page) =>
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

  const paperEntries = [
    {
      url: `${baseUrl}/api/artifacts/paper/main.pdf`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ];

  const llmsTxtEntry = {
    url: `${baseUrl}/llms.txt`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  };

  return [...localizedEntries, ...paperEntries, llmsTxtEntry];
}
