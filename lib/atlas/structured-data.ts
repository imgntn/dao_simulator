/**
 * Structured Data (JSON-LD) for SEO
 *
 * Generates a ResearchProject schema for the homepage.
 */

import { intlLocaleMap } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function generateResearchProjectJsonLd(locale: Locale = 'en'): string {
  const baseUrl = 'https://daosimulator.com';

  const data = {
    '@context': 'https://schema.org',
    '@type': 'ResearchProject',
    name: 'DAO Research Atlas',
    description:
      'Actionable governance findings from 16,370 simulation runs across 21 experiment configurations covering participation, capture, treasury, cooperation, and LLM governance.',
    url: `${baseUrl}/${locale}`,
    inLanguage: intlLocaleMap[locale] ?? 'en-US',
    author: {
      '@type': 'Person',
      name: 'James B. Pollack',
      url: 'https://jamesbpollack.com',
    },
    about: [
      { '@type': 'Thing', name: 'DAO Governance' },
      { '@type': 'Thing', name: 'Agent-Based Simulation' },
      { '@type': 'Thing', name: 'Decentralized Organizations' },
    ],
    keywords:
      'DAO, governance, simulation, decentralized, agent-based modeling, treasury, participation, capture',
  };

  return JSON.stringify(data);
}
