/**
 * Structured Data (JSON-LD) for SEO & AI Discoverability
 *
 * Generates a rich @graph with ResearchProject, Person, WebSite,
 * ScholarlyArticle (×7), Dataset, and FAQPage schemas.
 */

import { intlLocaleMap } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const BASE_URL = 'https://daosimulator.com';
const AUTHOR_ID = `${BASE_URL}/#author`;
const SITE_ID = `${BASE_URL}/#website`;

/* ------------------------------------------------------------------ */
/*  Person                                                             */
/* ------------------------------------------------------------------ */

function personSchema() {
  return {
    '@type': 'Person',
    '@id': AUTHOR_ID,
    name: 'James B. Pollack',
    url: 'https://jamesbpollack.com',
    jobTitle: 'Independent Researcher — DAO Governance Simulation',
    knowsAbout: [
      'DAO governance',
      'agent-based modeling',
      'decentralized organizations',
      'quadratic voting',
      'governance capture',
      'treasury management',
      'digital twins',
      'reinforcement learning',
      'LLM-augmented governance',
      'prediction markets',
    ],
    sameAs: [
      'https://github.com/imgntn',
      'https://jamesbpollack.com',
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  WebSite                                                            */
/* ------------------------------------------------------------------ */

function webSiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    name: 'DAO Simulator',
    url: BASE_URL,
    potentialAction: {
      '@type': 'ReadAction',
      target: `${BASE_URL}/en`,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  ScholarlyArticles (one per research brief)                         */
/* ------------------------------------------------------------------ */

interface BriefMeta {
  id: string;
  headline: string;
  abstract: string;
  keywords: string[];
  datePublished: string;
  pdfUrl: string;
}

const BRIEF_META: BriefMeta[] = [
  {
    id: 'rq1',
    headline: 'Participation Dynamics in DAO Governance',
    abstract:
      'Agent-based simulation of voter participation across 16,370 runs reveals a quorum cliff: at 5% quorum 99.9% of proposals pass, but at 20% only 25.4% reach quorum. Practical quorum should be set at roughly 80% of observed natural turnout.',
    keywords: ['DAO participation', 'quorum design', 'voter turnout', 'agent-based modeling', 'governance simulation'],
    datePublished: '2025-05-01',
    pdfUrl: `${BASE_URL}/api/artifacts/paper/main.pdf`,
  },
  {
    id: 'rq2',
    headline: 'Governance Capture Mitigation in DAOs',
    abstract:
      'Quadratic voting with a 250-token threshold cut whale influence 43% (0.449 to 0.256) and capture risk 42% (0.464 to 0.269) while governance throughput improved from 92.7% to 98.5% pass rate. Power-distribution rules outperform activity-only throttles.',
    keywords: ['governance capture', 'quadratic voting', 'whale influence', 'delegation caps', 'DAO security'],
    datePublished: '2025-05-01',
    pdfUrl: `${BASE_URL}/api/artifacts/paper/main.pdf`,
  },
  {
    id: 'rq3',
    headline: 'Proposal Pipeline Effects on DAO Governance',
    abstract:
      'Moderate temp-check filtering (5% to 50% pressure) raised pass rate from 96.4% to 98.5%. Fast-tracking with a 12-day minimum window kept quorum reach above 99% while accelerating consensus proposals. Zero abandonment across core runs.',
    keywords: ['proposal pipeline', 'temp-check', 'fast-track governance', 'time-to-decision', 'DAO operations'],
    datePublished: '2025-05-01',
    pdfUrl: `${BASE_URL}/api/artifacts/paper/main.pdf`,
  },
  {
    id: 'rq4',
    headline: 'Treasury Resilience Under Governance Stress',
    abstract:
      'Stabilization mechanisms cut treasury volatility roughly in half (0.45\u20130.50 to 0.24\u20130.27). Reserve buffers of 15\u201320% with spending caps of 2\u20135% per period and emergency triggers produced final treasury values of $10,048\u2013$13,147.',
    keywords: ['treasury management', 'DAO treasury', 'reserve buffers', 'spending limits', 'volatility'],
    datePublished: '2025-05-01',
    pdfUrl: `${BASE_URL}/api/artifacts/paper/main.pdf`,
  },
  {
    id: 'rq5',
    headline: 'Inter-DAO Cooperation Patterns and Outcomes',
    abstract:
      'Cross-DAO cooperation achieved a 21\u201323% success rate with designed coordination versus 0% in isolation. Specialized topology generated more inter-DAO proposals (75.8 vs 50.3) and higher ecosystem treasury ($26,107 vs $24,071).',
    keywords: ['inter-DAO cooperation', 'cross-DAO coordination', 'cooperation topology', 'DAO ecosystem'],
    datePublished: '2025-05-01',
    pdfUrl: `${BASE_URL}/api/artifacts/paper/main.pdf`,
  },
  {
    id: 'rq6',
    headline: 'LLM Agent Reasoning in DAO Governance',
    abstract:
      'Across 52 runs, hybrid LLM governance (30% AI agents) matched baseline participation and pass rates while preserving decision quality. All-LLM mode collapsed participation to 8.8% and pass rates to 23%. Hybrid mode is the recommended default.',
    keywords: ['LLM governance', 'AI voting agents', 'hybrid AI governance', 'large language models', 'DAO automation'],
    datePublished: '2025-09-01',
    pdfUrl: `${BASE_URL}/api/artifacts/paper/main.pdf`,
  },
  {
    id: 'rq7',
    headline: 'Counterfactual Governance Rule Comparison',
    abstract:
      'Five calibrated DAO digital twins tested under alternative voting rules. Conviction voting universally collapsed pass rates (0\u201320% vs 47\u2013100% baseline). Majority, quadratic, and token-quorum rules were largely interchangeable. Quadratic voting gave a small edge only to the most contentious DAO (Nouns).',
    keywords: ['counterfactual governance', 'conviction voting', 'governance rules', 'digital twins', 'voting mechanisms'],
    datePublished: '2026-01-15',
    pdfUrl: `${BASE_URL}/api/artifacts/paper/main.pdf`,
  },
];

function scholarlyArticleSchemas() {
  return BRIEF_META.map((b) => ({
    '@type': 'ScholarlyArticle',
    '@id': `${BASE_URL}/en#${b.id}`,
    headline: b.headline,
    abstract: b.abstract,
    datePublished: b.datePublished,
    author: { '@id': AUTHOR_ID },
    publisher: { '@id': SITE_ID },
    keywords: b.keywords,
    url: `${BASE_URL}/en#${b.id}`,
    isPartOf: { '@id': SITE_ID },
  }));
}

/* ------------------------------------------------------------------ */
/*  Dataset — calibration data                                         */
/* ------------------------------------------------------------------ */

function datasetSchema() {
  return {
    '@type': 'Dataset',
    name: 'DAO Digital Twin Calibration Data',
    description:
      '14 real DAO digital twins calibrated against on-chain governance votes, Snapshot data, forum activity, and token prices. Average calibration accuracy 0.85 across all DAOs.',
    creator: { '@id': AUTHOR_ID },
    temporalCoverage: '2021/2026',
    spatialCoverage: 'Ethereum, Arbitrum, Optimism',
    variableMeasured: [
      'proposal frequency',
      'participation rate',
      'pass rate',
      'voter concentration',
      'token price',
      'forum activity',
    ],
    measurementTechnique: 'Agent-based simulation calibrated against on-chain governance data',
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${BASE_URL}/en`,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  FAQPage — key findings as Q&A for AI citation                      */
/* ------------------------------------------------------------------ */

function faqPageSchema() {
  const qaPairs: { q: string; a: string }[] = [
    {
      q: 'What is the optimal quorum setting for a DAO?',
      a: 'Research from 16,370 simulation runs shows quorum should be set at approximately 80% of observed natural turnout. At 5% quorum, 99.9% of proposals reached quorum. At 10% quorum, 82% reached it. At 20%, only 25.4% did — creating a "quorum cliff" where governance stalls. The pass rate among proposals that reached quorum stayed high (97.6–98.5%) regardless of quorum level, proving the bottleneck is reaching the threshold, not voter disagreement. Set quorum from observed behavior, not aspiration.',
    },
    {
      q: 'How effective is quadratic voting at preventing governance capture?',
      a: 'Quadratic voting with a 250-token threshold reduced whale influence by 43% (from 0.449 to 0.256 on a 0–1 scale) and cut governance capture risk by 42% (from 0.464 to 0.269). Critically, governance throughput improved rather than collapsed — pass rate moved from 92.7% to 98.5%. The most effective anti-capture stack combines quadratic voting as a base with delegation caps and 30–60 day velocity controls. Power-distribution mechanisms consistently outperform activity-only throttles.',
    },
    {
      q: 'How can DAOs protect treasury value during market volatility?',
      a: 'Stabilization mechanisms cut treasury volatility roughly in half, reducing value-swing scores from the 0.45–0.50 range to 0.24–0.27 on a 0–1 scale. The recommended policy stack includes reserve buffers of 15–20% of total treasury, spending limits aligned to burn rate (2–5% per period), and emergency top-up triggers when reserves fall below 50% of the target buffer. Stabilized runs produced final treasury values of $10,048–$13,147. Lower volatility does come with modest growth tradeoffs, requiring continuous tuning.',
    },
    {
      q: 'Can AI agents improve DAO governance decision-making?',
      a: 'Across 52 runs (13 per config), hybrid LLM governance with 30% AI agents matched baseline participation (20%) and pass rates (43%) while preserving decision quality. All-LLM mode collapsed participation to 8.8% and pass rates to 23%, showing that AI governance needs human anchoring. LLM vote consistency was 46% in hybrid mode but only 22% in all-LLM mode. Hybrid mode is recommended as the default deployment.',
    },
    {
      q: 'What is a DAO digital twin and how accurate are they?',
      a: 'A DAO digital twin is an agent-based simulation model calibrated against a real DAO\'s on-chain governance data, Snapshot votes, forum activity, and token prices. The DAO Simulator built digital twins of 14 major DAOs including Uniswap, Compound, Aave, Arbitrum, Optimism, ENS, Lido, Gitcoin, MakerDAO, Curve, Nouns, Balancer, dYdX, and SushiSwap. Each twin captures the DAO\'s actual governance stack: quorum thresholds, voting periods, proposal pipelines, and member archetypes. Calibration scores average 0.85, with Gitcoin highest at 0.922.',
    },
    {
      q: 'What happens if you change a DAO\'s governance rule?',
      a: 'Counterfactual experiments across 5 calibrated DAOs (Optimism, Uniswap, Compound, Nouns, Lido) show that conviction voting universally collapsed pass rates to 0\u201320% versus 47\u2013100% baseline. Majority, quadratic, token-quorum, and bicameral rules were largely interchangeable within each DAO. Only Nouns \u2014 the most contentious DAO with a 45% baseline pass rate \u2014 showed measurable improvement under quadratic voting. The governance rule matters less than the participation and opposition dynamics underneath.',
    },
    {
      q: 'Does cross-DAO cooperation actually work?',
      a: 'Inter-DAO cooperation achieved a 21–23% success rate with designed coordination versus 0% when DAOs operated in isolation. Specialized topology — where DAOs contribute different strengths — generated more inter-DAO proposals (75.8 vs 50.3) and higher ecosystem treasury ($26,107 vs $24,071) than generic uniform connections. Cross-DAO alignment stayed moderate (0.534–0.557), which is why fairness design, coordinator/hub patterns, and recurring joint work matter for success. Define cost splits, value splits, and dispute paths before launch.',
    },
  ];

  return {
    '@type': 'FAQPage',
    mainEntity: qaPairs.map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.a,
      },
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  ResearchProject (preserved from original)                          */
/* ------------------------------------------------------------------ */

function researchProjectSchema(locale: Locale) {
  return {
    '@type': 'ResearchProject',
    '@id': `${BASE_URL}/#research`,
    name: 'DAO Simulator',
    description:
      'Actionable governance findings from 16,370 simulation runs across 21 experiment configurations covering participation, capture, treasury, cooperation, and LLM governance.',
    url: `${BASE_URL}/${locale}`,
    inLanguage: intlLocaleMap[locale] ?? 'en-US',
    author: { '@id': AUTHOR_ID },
    about: [
      { '@type': 'Thing', name: 'DAO Governance' },
      { '@type': 'Thing', name: 'Agent-Based Simulation' },
      { '@type': 'Thing', name: 'Decentralized Organizations' },
    ],
    keywords:
      'DAO, governance, simulation, decentralized, agent-based modeling, treasury, participation, capture',
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function generateResearchProjectJsonLd(locale: Locale = 'en'): string {
  const graph = [
    webSiteSchema(),
    personSchema(),
    researchProjectSchema(locale),
    ...scholarlyArticleSchemas(),
    datasetSchema(),
    faqPageSchema(),
  ];

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}
