/**
 * Home Content Data
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
  rq7: [
    { id: 'rq1', reason: 'Alternative rules change quorum dynamics' },
    { id: 'rq2', reason: 'Governance rule choice shapes capture resistance' },
  ],
};

// ---------------------------------------------------------------------------
// Decision Brief Sections
// ---------------------------------------------------------------------------

export const DECISION_BRIEF_SECTIONS: BriefSection[] = [
  {
    id: 'rq1',
    title: 'Quorum Design & Governance Cliffs',
    question: 'Where are the hidden cliffs in quorum design?',
    whyItMatters: 'Most DAOs set quorum by gut feel. A 5-point miscalibration can silently kill governance.',
    filePath: 'paper/plain-english/rq1-participation.md',
    relatedPaperPath: 'paper/rq1/main.pdf',
  },
  {
    id: 'rq2',
    title: 'Governance Capture Mitigation',
    question: 'Can you reduce whale dominance without killing governance speed?',
    whyItMatters: 'The conventional wisdom says fairness costs efficiency. The data says otherwise.',
    filePath: 'paper/plain-english/rq2-governance-capture.md',
    relatedPaperPath: 'paper/rq2/main.pdf',
  },
  {
    id: 'rq3',
    title: 'Governance Throughput',
    question: 'Is the speed-vs-quality tradeoff in governance real?',
    whyItMatters: 'Everyone assumes faster governance means worse decisions. Filtering mechanics break that assumption.',
    filePath: 'paper/plain-english/rq3-proposal-pipeline.md',
    relatedPaperPath: 'paper/rq3/main.pdf',
  },
  {
    id: 'rq4',
    title: 'The Cost of Stability',
    question: 'What does treasury stability actually cost in growth?',
    whyItMatters: 'Stabilization halves volatility \u2014 but nothing is free. The growth tradeoff is real and quantifiable.',
    filePath: 'paper/plain-english/rq4-treasury.md',
    relatedPaperPath: 'paper/rq4/main.pdf',
  },
  {
    id: 'rq5',
    title: 'Inter-DAO Cooperation',
    question: 'Why does specialization beat scale in cross-DAO partnerships?',
    whyItMatters: 'Generic partnerships fail. The structure of collaboration matters more than the intent.',
    filePath: 'paper/plain-english/rq5-cooperation.md',
    relatedPaperPath: 'paper/rq5/main.pdf',
  },
  {
    id: 'rq6',
    title: 'LLM Governance (Exploratory)',
    question: 'What happens when AI agents participate in governance votes?',
    whyItMatters: '52-run experiment. Hybrid AI governance preserves participation; pure-LLM mode does not.',
    filePath: 'paper/plain-english/rq6-llm-agent-reasoning.md',
    relatedPaperPath: 'paper_llm/main.pdf',
  },
  {
    id: 'rq7',
    title: 'Counterfactual Governance',
    question: 'What if your DAO used a different governance rule?',
    whyItMatters: 'We ran 5 real DAOs under alternative voting rules. One mechanism consistently destroys governance.',
    filePath: 'paper/plain-english/rq7-counterfactual-governance.md',
    relatedPaperPath: 'paper/rq7/main.pdf',
  },
];

// ---------------------------------------------------------------------------
// Curated Brief Copy
// ---------------------------------------------------------------------------

export const CURATED_BRIEF_COPY: Record<string, CuratedBriefCopy> = {
  rq1: {
    summary:
      'There\u2019s a narrow band in quorum design where governance collapses. Turnout holds steady near 22%, but moving quorum past 10\u201315% causes a cliff \u2014 not a gradual decline \u2014 in proposal passage.',
    whatWeFound: [
      { headline: '5-Point Cliff, Not a Slope', detail: 'At 5% quorum, 99.9% of proposals pass. At 10%, 82%. At 20%, 25%. At 40%, zero. The drop is catastrophic, not gradual.' },
      { headline: 'Voters Agree \u2014 They Just Don\u2019t Show Up', detail: 'Pass rate among proposals that reached quorum stayed 97\u201398%. The bottleneck is turnout, not disagreement.' },
      { headline: 'Bigger DAOs, Lower Turnout', detail: 'Scaling from 50 to 500 members dropped participation from 26% to 22%, while pass rate actually rose. Size dilutes engagement.' },
    ],
    whatToDo: [
      'Set quorum from observed turnout data, not aspirational targets. A practical rule: ~80% of natural turnout.',
      'Start low (4\u20135%) and adjust upward from data, not downward from failure.',
      'Use delegation to boost effective participation before raising thresholds.',
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
      'Reducing whale power didn\u2019t slow governance \u2014 it sped it up. Quadratic voting cut whale influence 43% while pass rate improved from 93% to 99%.',
    whatWeFound: [
      { headline: 'Fairness Improved Speed', detail: 'Quadratic voting cut whale influence from 0.449 to 0.256 (43% reduction) while pass rate rose from 92.7% to 98.5%. The expected tradeoff didn\u2019t exist.' },
      { headline: 'Power Shape > Activity Throttles', detail: 'Velocity penalties alone had only small effects. Changing how power distributes mattered far more than limiting how often whales can act.' },
      { headline: '42% Capture Risk Drop', detail: 'Capture risk fell from 0.464 to 0.269 under the strongest settings, using a layered stack of quadratic voting + delegation caps + velocity controls.' },
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
      'The speed-quality tradeoff is a false dilemma \u2014 with the right pipeline design. Moderate temp-checks filtered weak proposals early, while fast-tracking cleared obvious consensus, achieving both higher quality and faster throughput.',
    whatWeFound: [
      { headline: 'No Tradeoff Found', detail: 'Raising temp-check pressure from 5% to 50% lifted pass rate from 96.4% to 98.5% while maintaining full throughput. Better filtering meant better outcomes, not slower ones.' },
      { headline: '12-Day Floor Held Quorum', detail: 'Fast-tracking with a 12-day minimum voting window kept quorum reach above 99%. Speed didn\u2019t come at the cost of participation.' },
      { headline: 'Zero Proposals Abandoned', detail: '47\u201350 proposals per cycle completed without a single abandonment, though very short expiry windows remain risky for complex work.' },
    ],
    whatToDo: [
      'Start with moderate thresholds: ~20\u201330% temp-check, ~70% fast-track consensus.',
      'Keep default expiry near 60 days; extend for complex proposals.',
      'Monitor false negatives and time-to-decision together \u2014 optimizing one in isolation breaks the other.',
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
      'Treasury stabilization works \u2014 volatility dropped roughly in half. But every configuration showed negative growth (\u20130.71), which mirrors the broader DAO ecosystem where most treasuries have declined in real terms since 2022. The real question isn\u2019t whether to stabilize, but how much runway you\u2019re buying.',
    whatWeFound: [
      { headline: 'Negative Growth Is the Norm, Not a Bug', detail: 'Average growth stayed at \u20130.71 across all 12 configurations \u2014 matching the broader DAO industry trend where few treasuries have grown in real terms. Stabilization cut volatility from 0.45\u20130.50 to 0.24\u20130.27, buying time rather than generating returns.' },
      { headline: 'Buffers Beat Active Management', detail: 'Reserve buffers with spending caps ($10K\u2013$13K final treasury) outperformed configurations without them, providing downside protection without complex rebalancing.' },
      { headline: 'No Set-and-Forget', detail: 'The negative growth floor reflects real market conditions. Treasury policy can\u2019t create growth from nothing \u2014 it manages decline. Parameters need quarterly review as market conditions shift.' },
    ],
    whatToDo: [
      'Set explicit reserves (15\u201320% of total) with defined breach triggers.',
      'Cap spending at 2\u20135% per period with emergency overrides.',
      'Re-evaluate policy quarterly \u2014 stability parameters that worked in a bull market may choke growth in recovery.',
    ],
    evidence: 'Core paper RQ4 treasury resilience results (Experiment 06).',
    confidence: 'Strong: 12 configurations \u00d7 100 runs at 2,000 steps each. Negative growth finding is consistent across all parameter combinations, matching observed DAO treasury trajectories (2022\u20132025).',
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
      'Cross-DAO coordination worked when partners brought complementary strengths. Generic connections produced half the activity and lower treasury outcomes than specialized, role-based partnerships.',
    whatWeFound: [
      { headline: 'Structure > Intent', detail: 'Specialized partnerships generated 50% more inter-DAO proposals (75.8 vs 50.3) and 8% higher ecosystem treasury ($26,107 vs $24,071) than generic connections.' },
      { headline: '21% Success Is the Ceiling (So Far)', detail: 'Inter-DAO proposal success reached 21\u201323% with the best topology, versus 0% in isolation. Cooperation is fragile and needs explicit design.' },
      { headline: 'Moderate Alignment Is Normal', detail: 'Cross-DAO alignment stabilized at 0.53\u20130.56, not near 1.0. Expecting high alignment between autonomous organizations is unrealistic \u2014 design for disagreement.' },
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
      'Across 52 runs, adding LLM agents to governance preserved decision quality while shifting voting dynamics. Hybrid mode (30% LLM) matched baseline participation, but all-LLM mode saw steep engagement drops \u2014 suggesting AI governance needs human anchoring.',
    whatWeFound: [
      { headline: 'Hybrid Preserved Governance Quality', detail: 'Hybrid mode (30% LLM agents) achieved 43% pass rate and 20% participation \u2014 comparable to the 58% / 18% baseline. Adding AI voters didn\u2019t break governance.' },
      { headline: 'All-LLM Collapsed Participation', detail: 'With 100% LLM agents, participation fell to 8.8% and pass rates to 23%. AI agents without human anchoring under-engage, producing more conservative but less active governance.' },
      { headline: 'LLM Consistency Was 46% in Hybrid', detail: 'LLM agents voted consistently 46% of the time in hybrid mode but only 22% in all-LLM mode. With human agents present, AI reasoning was more stable and auditable.' },
    ],
    whatToDo: [
      'Hybrid mode is the safer deployment default \u2014 it preserves participation while adding AI reasoning depth.',
      'Pure-LLM governance produces conservative outcomes but loses engagement. Pair AI agents with human voters.',
      'Monitor LLM vote consistency as a governance health metric \u2014 consistency drops signal reasoning instability.',
    ],
    evidence: '52 runs (13 per config) across 4 modes: disabled, hybrid (30% LLM), all-LLM, hybrid+reporter. Local qwen3:8b model via Ollama.',
    confidence: 'Exploratory but credible: 13 runs per config provides moderate statistical power. Findings are consistent across seeds but limited to a single LLM model.',
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
  rq7: {
    summary:
      'We ran 5 calibrated DAO digital twins under alternative governance rules. Conviction voting destroyed pass rates universally (0\u201320% vs 47\u2013100% baseline), while majority, quadratic, and token-quorum were largely interchangeable.',
    whatWeFound: [
      { headline: 'Conviction Voting Universally Collapsed', detail: 'Across all 5 DAOs, conviction voting dropped pass rates to 0\u201320%. Lido went from 100% to 0%. Compound from 81% to 0%. The mechanism\'s continuous-signal design doesn\'t survive discrete proposal cycles.' },
      { headline: 'Most Rules Are Interchangeable', detail: 'Majority, quadratic, token-quorum, and bicameral produced identical scores within each DAO. The governance rule matters less than the participation and opposition dynamics underneath.' },
      { headline: 'Quadratic Gave Nouns a Small Edge', detail: 'Only Nouns \u2014 the most contentious DAO (45% baseline pass rate) \u2014 showed measurable improvement under quadratic voting: +2.9% score, +0.6% pass rate, +8.3% throughput.' },
    ],
    whatToDo: [
      'Avoid conviction voting for discrete proposal governance \u2014 it\'s designed for continuous funding allocation, not binary yes/no votes.',
      'Don\'t expect a governance rule swap to fix participation or pass-rate problems. Those are driven by agent behavior, not vote-counting mechanics.',
      'For contentious DAOs (low pass rate), quadratic voting offers marginal improvement by compressing whale power.',
    ],
    evidence: 'Counterfactual experiments across 5 DAOs (Optimism, Uniswap, Compound, Nouns, Lido) \u00d7 4 alternative rules, 5 episodes each at 720 steps.',
    confidence: 'Strong for the conviction finding (consistent across all 5 DAOs). Moderate for rule-interchangeability (5 episodes gives limited statistical power for subtle effects).',
    keyTerms: [
      {
        term: 'Counterfactual Experiment',
        definition:
          'A simulation that asks "what if?" by running a calibrated DAO model under a governance rule it doesn\'t actually use, keeping all other parameters identical.',
      },
      {
        term: 'Conviction Voting',
        definition:
          'A mechanism where voters signal support continuously over time, and proposals pass when accumulated conviction exceeds a threshold. Designed for budget allocation, not discrete proposals.',
      },
      {
        term: 'Digital Twin',
        definition:
          'A simulation model calibrated to match a real DAO\'s historical behavior \u2014 participation rates, pass rates, voter concentration, price dynamics, and forum activity.',
      },
      {
        term: 'Governance Rule',
        definition:
          'The vote-counting mechanism that determines whether a proposal passes. Examples: majority (>50% yes), quorum (minimum turnout), quadratic (square-root vote weighting), conviction (time-accumulated support).',
      },
      {
        term: 'Baseline',
        definition:
          'The DAO\'s real-world governance rule, used as the control condition. Alternatives are compared against this baseline to measure the counterfactual effect.',
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
