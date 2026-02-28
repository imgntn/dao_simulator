import type { MetadataRoute } from 'next';

const locales = ['en', 'es', 'zh', 'ja'] as const;
const baseUrl = 'https://daosimulator.com';

export default function sitemap(): MetadataRoute.Sitemap {
  // Core pages (localized)
  const corePages = ['', '/console'];

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

  // Research brief anchors (English only — briefs are section anchors on the homepage)
  const briefIds = ['rq1', 'rq2', 'rq3', 'rq4', 'rq5', 'rq6'];
  const briefEntries = briefIds.map((id) => ({
    url: `${baseUrl}/en#${id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Paper PDFs
  const paperPaths = [
    'paper/main.pdf',
    'paper/rq1/main.pdf',
    'paper/rq2/main.pdf',
    'paper/rq3/main.pdf',
    'paper/rq4/main.pdf',
    'paper/rq5/main.pdf',
    'paper_p1/main.pdf',
    'paper_p2/main.pdf',
    'paper_llm/main.pdf',
  ];
  const paperEntries = paperPaths.map((path) => ({
    url: `${baseUrl}/${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // llms.txt
  const llmsTxtEntry = {
    url: `${baseUrl}/llms.txt`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  };

  return [...localizedEntries, ...briefEntries, ...paperEntries, llmsTxtEntry];
}
