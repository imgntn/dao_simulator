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

export type KeyTerm = {
  term: string;
  definition: string;
};

export type FindingEntry = {
  headline: string;
  detail: string;
};

export type CuratedBriefCopy = {
  summary: string;
  whatWeFound: FindingEntry[];
  whatToDo: string[];
  evidence: string;
  confidence?: string;
  keyTerms?: KeyTerm[];
};

// ---------------------------------------------------------------------------
// Digital Twin Calibration Scores (10 episodes, 720 steps)
// ---------------------------------------------------------------------------

export const CALIBRATION_SCORES: Record<string, number> = {
  Gitcoin: 0.922,
  Lido: 0.887,
  Curve: 0.878,
  Aave: 0.875,
  Balancer: 0.870,
  SushiSwap: 0.867,
  dYdX: 0.864,
  ENS: 0.859,
  MakerDAO: 0.854,
  Uniswap: 0.850,
  Arbitrum: 0.846,
  Optimism: 0.818,
  Compound: 0.818,
  Nouns: 0.780,
};

// ---------------------------------------------------------------------------
// Digital Twin URLs (governance portals)
// ---------------------------------------------------------------------------

export const DAO_URLS: Record<string, string> = {
  Uniswap: 'https://app.uniswap.org/vote',
  Compound: 'https://compound.finance/governance',
  Aave: 'https://governance.aave.com',
  Arbitrum: 'https://www.tally.xyz/gov/arbitrum',
  Optimism: 'https://vote.optimism.io',
  ENS: 'https://www.tally.xyz/gov/ens',
  Lido: 'https://vote.lido.fi',
  Gitcoin: 'https://www.tally.xyz/gov/gitcoin',
  MakerDAO: 'https://vote.makerdao.com',
  Curve: 'https://dao.curve.fi',
  Nouns: 'https://nouns.wtf/vote',
  Balancer: 'https://vote.balancer.fi',
  dYdX: 'https://www.mintscan.io/dydx/proposals',
  SushiSwap: 'https://snapshot.org/#/sushigov.eth',
};

// ---------------------------------------------------------------------------
// Digital Twin Feature Highlights (per-DAO)
// ---------------------------------------------------------------------------

export type DAOTwinFeature = {
  governance: string;
  features: string[];
};

export const DAO_TWIN_FEATURES: Record<string, DAOTwinFeature> = {
  Uniswap: {
    governance: 'Token Quorum',
    features: ['High activity, 93% pass rate', 'Calibrated 5.7% participation', '4 voter clusters modeled'],
  },
  Compound: {
    governance: 'Token Quorum',
    features: ['79% pass rate with opposition agents', 'Low 1.8% participation calibrated', 'Governor Bravo rule modeled'],
  },
  Aave: {
    governance: 'Token Quorum',
    features: ['97% pass rate, high optimism agents', 'Dual executor tiers mapped', 'High proposal frequency calibrated'],
  },
  Arbitrum: {
    governance: 'Category Quorum',
    features: ['Constitutional vs non-constitutional rules', '94% pass rate calibrated', 'L2 token price oracle modeled'],
  },
  Optimism: {
    governance: 'Bicameral',
    features: ['Token + Citizens\u2019 House rule mapped', '73% pass rate with opposition bias', 'Highest participation (13.8%)'],
  },
  ENS: {
    governance: 'Token Quorum',
    features: ['12.4% participation (second highest)', '93% pass rate calibrated', 'Forum activity modeled'],
  },
  Lido: {
    governance: 'Dual Governance',
    features: ['99.6% pass rate, peak optimism agents', 'Veto + rage quit rule mapped', 'Forum & market oracle calibrated'],
  },
  Gitcoin: {
    governance: 'Quorum',
    features: ['Highest calibration score (92.2%)', '92.6% pass rate, 11.5% turnout', 'Steward-gated quorum modeled'],
  },
  MakerDAO: {
    governance: 'Approval Voting',
    features: ['Competing proposal approval rule', 'Unique approval-based mechanism', 'Highest token price oracle ($1,559)'],
  },
  Curve: {
    governance: 'Quorum',
    features: ['85% pass rate calibrated', 'Sub-dollar token oracle ($0.60)', 'Forum + market data modeled'],
  },
  Nouns: {
    governance: 'Quorum',
    features: ['45% pass rate (most contentious)', '33% of agents get opposition bias', 'No market data (NFT-based)'],
  },
  Balancer: {
    governance: 'Quorum',
    features: ['100% pass rate, max optimism agents', 'Low 1.3% participation calibrated', 'Market oracle modeled ($1.01)'],
  },
  dYdX: {
    governance: 'Quorum',
    features: ['100% pass rate calibrated', 'Sub-dollar token oracle ($0.22)', 'Low proposal frequency modeled'],
  },
  SushiSwap: {
    governance: 'Majority',
    features: ['Simple majority rule (no quorum)', 'Sub-dollar token oracle ($0.30)', 'No forum data calibrated'],
  },
};

// ---------------------------------------------------------------------------
// Cross-links between related briefs
// ---------------------------------------------------------------------------

export const BRIEF_CROSS_LINKS: Record<string, { id: string; reason: string }[]> = {
  rq1: [
    { id: 'rq2', reason: 'Participation levels shape capture risk' },
    { id: 'rq3', reason: 'Turnout affects proposal pipeline throughput' },
  ],
  rq2: [
    { id: 'rq1', reason: 'Voter turnout determines whale leverage' },
    { id: 'rq5', reason: 'Capture risk rises in cross-DAO coordination' },
  ],
  rq3: [
    { id: 'rq1', reason: 'Pipeline design depends on participation rates' },
    { id: 'rq4', reason: 'Proposal flow directly impacts treasury spend' },
  ],
  rq4: [
    { id: 'rq3', reason: 'Treasury outflows follow proposal throughput' },
    { id: 'rq5', reason: 'Cross-DAO deals affect treasury exposure' },
  ],
  rq5: [
    { id: 'rq2', reason: 'Coordination introduces capture vectors' },
    { id: 'rq4', reason: 'Joint initiatives require treasury commitments' },
  ],
  rq6: [
    { id: 'rq1', reason: 'LLM agents change participation dynamics' },
    { id: 'rq2', reason: 'AI voters affect power concentration' },
  ],
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
      'Governance stalls when quorum targets exceed real turnout capacity. In the core sweep, turnout stayed near 22\u201323%, but quorum reach collapsed once quorum moved past ~10\u201315%.',
    whatWeFound: [
      { headline: 'Quorum Cliff at 10%', detail: 'At 5% quorum, 99.9% of proposals reached quorum. At 10%, reach was 82%. At 20%, only 25.4% reached quorum. By 40%, reach fell to 0%.' },
      { headline: 'Threshold, Not Disagreement', detail: 'Pass rate among proposals that did reach quorum stayed high (97.6\u201398.5%), showing the bottleneck was reaching the threshold, not voter disagreement.' },
      { headline: 'Scale Lowers Turnout', detail: 'As DAO size scaled from 50 to 500 members, participation fell (26.1% to 21.9%) but pass rate rose (92.8% to 99.7%).' },
    ],
    whatToDo: [
      'Set quorum from observed behavior, not aspiration. A practical rule from the paper is ~80% of natural turnout.',
      'Use low-to-moderate quorum first (often around 4\u20135% in tested baselines), then adjust from data.',
      'Track fatigue and retention alongside pass rate, and use delegation before raising quorum.',
    ],
    evidence: 'Core paper RQ1 + scale analysis (Experiments 01, 03, 08).',
    keyTerms: [
      {
        term: 'Quorum',
        definition:
          'The minimum percentage of eligible voters who must participate for a proposal vote to count. If turnout falls below quorum, the proposal fails regardless of how those who did vote chose.',
      },
      {
        term: 'Quorum Reach Rate',
        definition:
          'The percentage of proposals that met the quorum threshold. A reach rate of 82% means 82 out of every 100 proposals got enough voters to produce a valid result.',
      },
      {
        term: 'Turnout / Participation Rate',
        definition:
          'The share of eligible members who actually cast a vote on a given proposal. A 22% turnout means roughly one in five members voted.',
      },
      {
        term: 'Pass Rate',
        definition:
          'The percentage of proposals that were approved by voters, counting only proposals that reached quorum.',
      },
      {
        term: 'Voter Retention',
        definition:
          'The fraction of voters who continue participating over consecutive voting rounds. High retention means voters are engaged long-term, not just showing up once.',
      },
      {
        term: 'Voter Fatigue',
        definition:
          'The gradual decline in voting activity that occurs when members face too many proposals or overly complex governance demands.',
      },
      {
        term: 'Delegation',
        definition:
          'A mechanism where a member assigns their voting power to another member (a delegate) who votes on their behalf, boosting effective participation without requiring every member to vote directly.',
      },
    ],
  },
  rq2: {
    summary:
      'Capture resistance improved most when power-distribution rules changed directly, not when only rate limits were added.',
    whatWeFound: [
      { headline: '43% Less Whale Power', detail: 'Applying quadratic voting (where voting power scales with the square root of tokens held, kicking in above a 250-token threshold) cut whale influence from 0.449 to 0.256 \u2014 a 43% reduction.' },
      { headline: '42% Capture Risk Drop', detail: 'Capture risk dropped from 0.464 to 0.269 under the strongest mitigation settings, a 42% reduction.' },
      { headline: 'Throughput Held Steady', detail: 'Governance throughput improved rather than collapsed: pass rate moved from 92.7% to 98.5%. Velocity penalties alone had only small effects.' },
    ],
    whatToDo: [
      'Use a layered stack: quadratic base + delegation caps + 30\u201360 day velocity controls.',
      'Prioritize mechanisms that reshape power distribution over activity-only throttles.',
      'Evaluate capture resistance and governance throughput together before deployment.',
    ],
    evidence: 'Core paper RQ2 mitigation sweep (Experiment 04) and comparative analysis.',
    keyTerms: [
      {
        term: 'Whale',
        definition:
          'A large token holder whose holdings give them outsized voting power. In many DAOs, a single whale can control more votes than hundreds of smaller holders combined.',
      },
      {
        term: 'Whale Influence',
        definition:
          'A metric (0\u20131) measuring how much of the total voting outcome is determined by the largest holders. Higher values mean a few wallets dominate decisions.',
      },
      {
        term: 'Governance Capture',
        definition:
          'A state where a small group of actors can reliably control proposal outcomes, effectively overriding the broader membership.',
      },
      {
        term: 'Capture Risk',
        definition:
          'A metric (0\u20131) estimating the likelihood that governance is or could be captured. It combines voting-power concentration and outcome predictability.',
      },
      {
        term: 'Quadratic Voting',
        definition:
          'A voting mechanism where each additional unit of voting power costs progressively more. Voting power scales with the square root of tokens held, compressing whale advantage while preserving small-holder voice.',
      },
      {
        term: 'Velocity Penalty',
        definition:
          'A rule that reduces the voting weight of tokens acquired recently (e.g., within the last 30\u201360 days), discouraging last-minute vote buying.',
      },
      {
        term: 'Delegation Cap',
        definition:
          'A ceiling on how much voting power any single delegate can accumulate through others\u2019 delegations, preventing re-concentration of power.',
      },
      {
        term: 'Throughput',
        definition:
          'The number of proposals a governance system can process and resolve in a given period. High throughput means decisions get made; low throughput means governance stalls.',
      },
    ],
  },
  rq3: {
    summary:
      'Proposal flow improves with moderate filtering and selective fast-tracking. Extreme settings are where quality or speed starts to break.',
    whatWeFound: [
      { headline: 'Filtering Lifts Quality', detail: 'Raising temp-check pressure from 5% to 50% lifted pass rate from 96.4% to 98.5%, filtering out weak proposals before they consumed full voting resources.' },
      { headline: 'Fast-Track Keeps Quorum', detail: 'Fast-track with a 12-day minimum voting window kept quorum reach above 99% while accelerating obvious-consensus proposals.' },
      { headline: 'Zero Abandonment', detail: 'Core runs showed 47\u201350 proposals per simulated cycle with zero abandonment, though very short expiry windows remain risky for complex work.' },
    ],
    whatToDo: [
      'Use moderate thresholds (roughly 20\u201330% temp-check and ~70% fast-track as a starting point).',
      'Keep default expiry windows near 60 days, with longer windows for complex proposals.',
      'Monitor false negatives, abandonment, and time-to-decision as a single operating set.',
    ],
    evidence: 'Core paper RQ3 pipeline experiments (Experiment 05).',
    keyTerms: [
      {
        term: 'Temp-Check',
        definition:
          'A preliminary signal vote (often off-chain, e.g., via Snapshot) used to gauge community interest before a proposal enters formal on-chain voting. Proposals that fail the temp-check are filtered out early.',
      },
      {
        term: 'Fast-Track',
        definition:
          'An expedited governance path for proposals that show overwhelming early support. Fast-tracked proposals skip some process stages but still require a minimum voting window to ensure participation.',
      },
      {
        term: 'Pass Rate',
        definition:
          'The percentage of proposals that receive enough \u201cyes\u201d votes to be approved, among those that completed the voting process.',
      },
      {
        term: 'Proposal Abandonment',
        definition:
          'When a proposal expires without ever completing its vote \u2014 typically because quorum was never reached or the expiry window ran out.',
      },
      {
        term: 'Time to Decision',
        definition:
          'The average duration from when a proposal is created to when it reaches a final outcome (approved, rejected, or expired).',
      },
      {
        term: 'Expiry Window',
        definition:
          'The maximum amount of time allowed for a proposal to complete its voting process. If voting isn\u2019t finished before the window closes, the proposal expires.',
      },
    ],
  },
  rq4: {
    summary:
      'Treasury resilience came from explicit policy discipline: stabilization, reserve buffers, spending limits, and clear emergency triggers.',
    whatWeFound: [
      { headline: 'Volatility Cut in Half', detail: 'Stabilization mechanisms cut treasury value swings roughly in half \u2014 volatility scores dropped from the 0.45\u20130.50 range to 0.24\u20130.27 (on a 0\u20131 scale where lower is more stable).' },
      { headline: 'Buffers Protect Downside', detail: 'Reserve buffers and spending caps improved downside protection; stabilized runs landed around $10,048\u2013$13,147 in final treasury value.' },
      { headline: 'Growth Tradeoff Exists', detail: 'Lower volatility came with modest growth tradeoffs, so treasury policy needs continuous tuning rather than one-time setup.' },
    ],
    whatToDo: [
      'Set explicit reserves (typically 15\u201320% of total treasury) and define breach triggers.',
      'Apply spending limits aligned to burn rate (often 2\u20135% per period) with explicit emergency overrides.',
      'Trigger top-up or freeze controls when reserves fall below policy thresholds (e.g., 50% of target buffer).',
    ],
    evidence: 'Core paper RQ4 treasury resilience results (Experiment 06).',
    keyTerms: [
      {
        term: 'Treasury Volatility',
        definition:
          'A measure (0\u20131) of how much a DAO\u2019s treasury value fluctuates over time. Higher volatility means larger swings in value; lower is more predictable and stable.',
      },
      {
        term: 'Buffer Reserve',
        definition:
          'A designated portion of the treasury (e.g., 15\u201320%) held in low-risk assets as a safety net. The buffer protects core operations during market downturns.',
      },
      {
        term: 'Spending Limit',
        definition:
          'A cap on how much capital can flow out of the treasury per period (e.g., 2\u20135% per month), preventing a single large expenditure from draining reserves.',
      },
      {
        term: 'Maximum Drawdown',
        definition:
          'The largest peak-to-trough percentage decline in treasury value. A 40% max drawdown means the treasury lost 40% of its peak value at its worst point.',
      },
      {
        term: 'Stabilization',
        definition:
          'Active treasury management mechanisms (rebalancing, diversification, hedging) that reduce value swings. Tested stabilization cut volatility roughly in half.',
      },
      {
        term: 'Emergency Top-Up',
        definition:
          'A policy trigger that automatically restores depleted reserves when they fall below a critical threshold, preventing the DAO from running out of operating funds.',
      },
    ],
  },
  rq5: {
    summary:
      'Cross-DAO coordination worked, but it was fragile. Outcomes improved when fairness, structure, and partner complementarity were designed upfront.',
    whatWeFound: [
      { headline: '21% Cross-DAO Success', detail: 'Inter-DAO success rate was 21.4\u201323.4% across cooperation topologies versus 0% when DAOs operated in isolation.' },
      { headline: 'Specialization Wins', detail: 'Specialized topology generated more inter-DAO activity (75.8 vs 50.3 proposals) and higher ecosystem treasury ($26,107 vs $24,071).' },
      { headline: 'Alignment Stays Moderate', detail: 'Cross-DAO alignment stayed moderate (0.534\u20130.557), which explains why fairness design and coordination structure mattered.' },
    ],
    whatToDo: [
      'Define fairness explicitly before launch: cost split, value split, and dispute path.',
      'Use coordinator/hub patterns for multi-party collaborations where negotiation overhead is high.',
      'Build overlap and trust through recurring joint work and shared participant channels.',
    ],
    evidence: 'Core paper RQ5 cooperation experiments (Experiment 07).',
    keyTerms: [
      {
        term: 'Inter-DAO Cooperation',
        definition:
          'Any coordinated action between two or more DAOs \u2014 joint proposals, shared funding, resource exchanges, or co-governed initiatives.',
      },
      {
        term: 'Cooperation Topology',
        definition:
          'The structural pattern of how DAOs connect. Tested topologies include isolated (no links), generic (uniform connections), and specialized (role-based partnerships where DAOs contribute different strengths).',
      },
      {
        term: 'Cross-DAO Alignment',
        definition:
          'A metric (0\u20131) measuring how often cooperating DAOs reach agreement on joint proposals. Low alignment means frequent disagreement and failed initiatives.',
      },
      {
        term: 'Resource Flow',
        definition:
          'The total volume of assets (tokens, treasury funds) exchanged between DAOs through cooperation. Higher flow indicates more active economic collaboration.',
      },
      {
        term: 'Hub Coordinator',
        definition:
          'A central entity or DAO that manages multi-party cooperation \u2014 routing proposals, mediating disputes, and reducing negotiation overhead for the network.',
      },
    ],
  },
  rq6: {
    summary:
      'LLM-enabled governance showed an engagement\u2013latency tradeoff. Hybrid mode was the strongest default in the current benchmark.',
    whatWeFound: [
      { headline: 'Hybrid Matches All-LLM', detail: 'Hybrid and all-LLM modes both reached a 50% pass rate. The rule-based baseline recorded 0% in this limited 8-run benchmark, reflecting the small sample size rather than a fundamental flaw in rule-based governance.' },
      { headline: 'All-LLM Peaks Engagement', detail: 'All-LLM posted higher participation (31.2%) and vote consistency (74.7%) than hybrid mode (18.6% participation, 66.3% consistency).' },
      { headline: 'Hybrid Halves Latency', detail: 'Hybrid mode reduced average decision latency to 808 ms versus 1,381 ms in all-LLM, with stronger treasury outcomes in this run set.' },
    ],
    whatToDo: [
      'Use hybrid reasoning as default, then escalate to deeper LLM reasoning only where needed.',
      'Track latency budgets, consistency drift, and cache performance as first-class governance metrics.',
      'Increase run budgets beyond the current 8-run benchmark before turning directional findings into hard policy.',
    ],
    evidence: 'LLM profile paper (current benchmark: 8 runs across 4 configurations).',
    confidence: 'Directional confidence only: the LLM profile currently uses a smaller run set than core governance experiments.',
    keyTerms: [
      {
        term: 'LLM (Large Language Model)',
        definition:
          'An AI system trained on large text datasets that can reason about complex inputs. In this context, LLMs read proposal text and governance context to produce voting decisions.',
      },
      {
        term: 'Rule-Based Mode',
        definition:
          'Traditional governance where voting decisions follow deterministic rules (e.g., vote yes if treasury impact is below threshold). No AI reasoning is involved.',
      },
      {
        term: 'Hybrid Mode',
        definition:
          'A mix where some agents use LLM reasoning and others use rule-based logic. Balances the depth of AI analysis with the speed and predictability of rules.',
      },
      {
        term: 'All-LLM Mode',
        definition:
          'Every agent uses LLM reasoning for voting decisions. Produces the most nuanced analysis but at higher computational cost and latency.',
      },
      {
        term: 'Vote Consistency',
        definition:
          'A metric (0\u20131) measuring how predictably an agent votes given similar inputs. High consistency means an agent\u2019s behavior is reliable and auditable; low consistency may signal noise or instability.',
      },
      {
        term: 'Latency',
        definition:
          'The time (in milliseconds) between a vote request and the agent\u2019s response. Higher latency means slower governance cycles. Rule-based agents have near-zero latency; LLM agents add processing delay.',
      },
      {
        term: 'Cache Performance',
        definition:
          'How often LLM voting decisions can be served from a stored cache instead of recomputing. High cache hit rates reduce latency and cost without sacrificing decision quality.',
      },
    ],
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
