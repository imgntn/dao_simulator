import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/en/console', '/es/console', '/zh/console', '/ja/console'],
    },
    sitemap: 'https://daosimulator.com/sitemap.xml',
  };
}
