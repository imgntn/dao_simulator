import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow everything except private routes
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/en/console', '/es/console', '/zh/console', '/ja/console'],
      },
      // OpenAI crawlers
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      // Anthropic
      { userAgent: 'ClaudeBot', allow: '/' },
      // Perplexity
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },
      // Google (Gemini training)
      { userAgent: 'Google-Extended', allow: '/' },
      // Apple Intelligence
      { userAgent: 'Applebot-Extended', allow: '/' },
      // Other AI crawlers
      { userAgent: 'cohere-ai', allow: '/' },
      { userAgent: 'DuckAssistBot', allow: '/' },
      { userAgent: 'Bytespider', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
    ],
    sitemap: 'https://daosimulator.com/sitemap.xml',
  };
}
