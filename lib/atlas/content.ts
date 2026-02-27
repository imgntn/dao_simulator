/**
 * Atlas Content Data
 *
 * Extracted from the monolithic homepage — all static data, types,
 * and curated copy for decision briefs and paper profiles.
 */

export const JAMES_SITE_URL = 'https://jamesbpollack.com';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BriefSection = {
  id: string;
  title: string;
  question: string;
  whyItMatters: string;
  filePath: string;
  relatedPaperPath: string;
};

export type PaperProfile = {
  id: 'paper' | 'paper_p1' | 'paper_p2' | 'paper_llm';
  label: string;
  description: string;
  directory: string;
  archivePrefix: string;
};

export type ParsedBrief = {
  overview: string | null;
  takeaways: string[];
  notes: string[];
};

export type CuratedBriefCopy = {
  summary: string;
  whatWeFound: string[];
  whatToDo: string[];
  evidence: string;
  confidence?: string;
};

// ---------------------------------------------------------------------------
// Decision Brief Sections
// ---------------------------------------------------------------------------

export const DECISION_BRIEF_SECTIONS: BriefSection[] = [
  {
    id: 'rq1',
    title: 'Participation Dynamics',
    question: 'How do we get more people to vote consistently?',
    whyItMatters: 'Healthy participation is the baseline for every other governance decision.',
    filePath: 'paper/plain-english/rq1-participation.md',
    relatedPaperPath: 'paper/rq1/main.pdf',
  },
  {
    id: 'rq2',
    title: 'Governance Capture Mitigation',
    question: 'How do we reduce whale control without freezing the DAO?',
    whyItMatters: 'Fairness and safety matter, but governance still has to ship decisions.',
    filePath: 'paper/plain-english/rq2-governance-capture.md',
    relatedPaperPath: 'paper/rq2/main.pdf',
  },
  {
    id: 'rq3',
    title: 'Proposal Pipeline Effects',
    question: 'How do we make proposals move faster without lowering quality?',
    whyItMatters: 'Slow governance burns momentum and increases operational risk.',
    filePath: 'paper/plain-english/rq3-proposal-pipeline.md',
    relatedPaperPath: 'paper/rq3/main.pdf',
  },
  {
    id: 'rq4',
    title: 'Treasury Resilience',
    question: 'How do we protect treasury health through volatility?',
    whyItMatters: 'Treasury policy drives long-term survival, growth, and strategic optionality.',
    filePath: 'paper/plain-english/rq4-treasury.md',
    relatedPaperPath: 'paper/rq4/main.pdf',
  },
  {
    id: 'rq5',
    title: 'Inter-DAO Cooperation',
    question: 'What kinds of cross-DAO coordination actually work?',
    whyItMatters: 'Ecosystem collaboration can unlock scale that single DAOs cannot reach alone.',
    filePath: 'paper/plain-english/rq5-cooperation.md',
    relatedPaperPath: 'paper/rq5/main.pdf',
  },
  {
    id: 'rq6',
    title: 'LLM Agent Reasoning',
    question: 'Where do LLMs help governance, and where do they add risk?',
    whyItMatters: 'AI governance is moving from theory to production, so evaluation quality is critical.',
    filePath: 'paper/plain-english/rq6-llm-agent-reasoning.md',
    relatedPaperPath: 'paper_llm/main.pdf',
  },
];

// ---------------------------------------------------------------------------
// Curated Brief Copy
// ---------------------------------------------------------------------------

export const CURATED_BRIEF_COPY: Record<string, CuratedBriefCopy> = {
  rq1: {
    summary:
      'Governance stalls when quorum targets exceed real turnout capacity. In the core sweep, turnout stayed near 22-23%, but quorum reach collapsed once quorum moved past ~10-15%.',
    whatWeFound: [
      'At 5% quorum, 99.9% of proposals reached quorum. At 20%, only 25.4% reached quorum. At 40%+, quorum reach fell to 0%.',
      'Pass rate among proposals that did reach quorum stayed high (97.6-98.5%), showing the bottleneck was threshold reach, not voter disagreement.',
      'As DAO size scaled from 50 to 500 members, participation fell (26.1% to 21.9%) but pass rate rose (92.8% to 99.7%).',
    ],
    whatToDo: [
      'Set quorum from observed behavior, not aspiration. A practical rule from the paper is ~80% of natural turnout.',
      'Use low-to-moderate quorum first (often around 4-5% in tested baselines), then adjust from data.',
      'Track fatigue and retention alongside pass rate, and use delegation before raising quorum.',
    ],
    evidence: 'Core paper RQ1 + scale analysis (Experiments 01, 03, 08).',
  },
  rq2: {
    summary:
      'Capture resistance improved most when power-distribution rules changed directly, not when only rate limits were added.',
    whatWeFound: [
      'A quadratic threshold of 250 cut whale influence from 0.449 to 0.256, a 43% reduction.',
      'Capture risk dropped from 0.464 to 0.269 in strong mitigation settings, a 42% reduction.',
      'Throughput improved rather than collapsed: pass rate moved from 92.7% to 98.5%. Velocity penalties alone were weak (small effects).',
    ],
    whatToDo: [
      'Use a layered stack: quadratic base + delegation caps + 30-60 day velocity controls.',
      'Prioritize mechanisms that reshape power distribution over activity-only throttles.',
      'Evaluate capture resistance and governance throughput together before deployment.',
    ],
    evidence: 'Core paper RQ2 mitigation sweep (Experiment 04) and comparative analysis.',
  },
  rq3: {
    summary:
      'Proposal flow improves with moderate filtering and selective fast-tracking. Extreme settings are where quality or speed starts to break.',
    whatWeFound: [
      'In Experiment 05, raising temp-check pressure from 0.05 to 0.50 lifted pass rate from 96.4% to 98.5%.',
      'Fast-track with a 12-step minimum kept quorum reach above 99% while accelerating obvious-consensus proposals.',
      'Core runs showed 47-50 proposals per 720-step cycle with zero abandonment; companion RQ3 analysis still flags very short expiry windows as risky for complex work.',
    ],
    whatToDo: [
      'Use moderate thresholds (roughly 20-30% temp-check and ~70% fast-track as a starting point).',
      'Keep default expiry windows near 60 days, with longer windows for complex proposals.',
      'Monitor false negatives, abandonment, and time-to-decision as a single operating set.',
    ],
    evidence: 'Core paper RQ3 pipeline experiments (Experiment 05).',
  },
  rq4: {
    summary:
      'Treasury resilience came from explicit policy discipline: stabilization, reserve buffers, spending limits, and clear emergency triggers.',
    whatWeFound: [
      'Stabilization reduced treasury volatility by about 50%: from roughly 0.448-0.500 down to 0.235-0.271.',
      'Reserve buffers and spending caps improved downside protection; stabilized runs landed around $10,048-$13,147 final treasury in tested settings.',
      'Lower volatility came with modest growth tradeoffs, so treasury policy needs continuous tuning rather than one-time setup.',
    ],
    whatToDo: [
      'Set explicit reserves (typically 15-20% in companion guidance) and define breach triggers.',
      'Apply spending limits aligned to burn rate (often 2-5% per period) with explicit emergency overrides.',
      'Trigger top-up or freeze controls when reserves fall below policy thresholds (e.g., 50% of target buffer).',
    ],
    evidence: 'Core paper RQ4 treasury resilience results (Experiment 06).',
  },
  rq5: {
    summary:
      'Cross-DAO coordination worked, but it was fragile. Outcomes improved when fairness, structure, and partner complementarity were designed upfront.',
    whatWeFound: [
      'Inter-DAO success rate was 21.4-23.4% across cooperation topologies versus 0% in isolated mode.',
      'Specialized topology generated more inter-DAO activity (75.8 vs 50.3 proposals) and higher ecosystem treasury ($26,107 vs $24,071).',
      'Cross-DAO alignment stayed moderate (0.534-0.557), which explains why fairness design and coordination structure mattered.',
    ],
    whatToDo: [
      'Define fairness explicitly before launch: cost split, value split, and dispute path.',
      'Use coordinator/hub patterns for multi-party collaborations where negotiation overhead is high.',
      'Build overlap and trust through recurring joint work and shared participant channels.',
    ],
    evidence: 'Core paper RQ5 cooperation experiments (Experiment 07).',
  },
  rq6: {
    summary:
      'LLM-enabled governance showed an engagement-latency tradeoff. Hybrid mode was the strongest default in the current benchmark.',
    whatWeFound: [
      'Hybrid and all-LLM both reached 0.50 pass rate, while the rule-based baseline was 0.00 in this short-horizon setup.',
      'All-LLM posted higher participation and consistency (0.3115 participation, 0.7474 consistency) than hybrid (0.1863, 0.6625).',
      'Hybrid reduced average latency to 807.98 ms versus 1,380.76 ms in all-LLM, with stronger treasury outcome in this run set.',
    ],
    whatToDo: [
      'Use hybrid reasoning as default, then escalate to deeper LLM reasoning only where needed.',
      'Track latency budgets, consistency drift, and cache performance as first-class governance metrics.',
      'Increase run budgets beyond the current 8-run benchmark before turning directional findings into hard policy.',
    ],
    evidence: 'LLM profile paper results/discussion (current benchmark: 8 runs).',
    confidence: 'Directional confidence only: the LLM profile currently uses a smaller run set than core governance experiments.',
  },
};

// ---------------------------------------------------------------------------
// Paper Profiles
// ---------------------------------------------------------------------------

export const PAPER_PROFILES: PaperProfile[] = [
  {
    id: 'paper',
    label: 'Core Governance Paper',
    description: 'Full synthesis across the complete research program.',
    directory: 'paper',
    archivePrefix: 'dao-governance-paper',
  },
  {
    id: 'paper_p1',
    label: 'Part I: Participation + Capture',
    description: 'Focus on fairness, participation quality, and anti-capture design.',
    directory: 'paper_p1',
    archivePrefix: 'dao-governance-paper_p1',
  },
  {
    id: 'paper_p2',
    label: 'Part II: Operations + Treasury',
    description: 'Focus on proposal flow, treasury resilience, and inter-DAO outcomes.',
    directory: 'paper_p2',
    archivePrefix: 'dao-governance-paper_p2',
  },
  {
    id: 'paper_llm',
    label: 'LLM Governance Paper',
    description: 'Dedicated analysis of LLM and hybrid governance modes.',
    directory: 'paper_llm',
    archivePrefix: 'dao-governance-paper_llm',
  },
];
