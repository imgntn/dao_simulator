import type { MetadataRoute } from 'next';

const locales = ['en', 'es', 'zh', 'ja'] as const;
const baseUrl = 'https://daosimulator.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const corePages = ['', '/simulate', '/privacy'];

  const localizedEntries = corePages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${page}`,
      changeFrequency: page === '' ? ('weekly' as const) : ('monthly' as const),
      priority: page === '' ? 1 : 0.5,
      alternates: {
        languages: Object.fromEntries(
          [
            ...locales.map((alt) => [alt, `${baseUrl}/${alt}${page}`]),
            ['x-default', `${baseUrl}/en${page}`],
          ]
        ),
      },
    }))
  );

  const llmsTxtEntry = {
    url: `${baseUrl}/llms.txt`,
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  };

  return [...localizedEntries, llmsTxtEntry];
}
