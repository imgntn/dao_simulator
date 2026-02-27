import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/console'],
    },
    sitemap: 'https://dao-research-atlas.vercel.app/sitemap.xml',
  };
}
