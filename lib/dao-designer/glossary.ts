/**
 * DAO Designer Glossary
 *
 * Comprehensive definitions for all governance concepts used in the DAO Designer.
 * Used for tooltips and the glossary panel.
 */

export interface GlossaryEntry {
  term: string;
  shortDescription: string;
  longDescription: string;
  category: GlossaryCategory;
  relatedTerms?: string[];
  realWorldExample?: string;
}

export type GlossaryCategory =
  | 'voting'
  | 'governance'
  | 'members'
  | 'proposals'
  | 'economics'
  | 'security';

// =============================================================================
// VOTING SYSTEMS
// =============================================================================

export const VOTING_SYSTEM_TOOLTIPS: Record<string, GlossaryEntry> = {
  simple_majority: {
    term: 'Simple Majority',
    shortDescription: 'More than 50% of votes wins',
    longDescription:
      'The most straightforward voting system. A proposal passes if it receives more YES votes than NO votes. Simple and easy to understand, but can lead to decisions with narrow margins that may not represent strong consensus.',
    category: 'voting',
    relatedTerms: ['supermajority', 'quorum'],
    realWorldExample: 'Compound Finance uses simple majority for most proposals.',
  },
  supermajority: {
    term: 'Supermajority',
    shortDescription: 'Requires 66%+ to pass',
    longDescription:
      'A higher threshold voting system requiring typically two-thirds (66.67%) or more votes in favor. Used for important decisions where broader consensus is desired. Provides more legitimacy but makes passing proposals harder.',
    category: 'voting',
    relatedTerms: ['simple_majority', 'constitutional_proposal'],
    realWorldExample: 'Arbitrum requires supermajority for constitutional amendments.',
  },
  quadratic: {
    term: 'Quadratic Voting',
    shortDescription: 'Voting power = square root of tokens',
    longDescription:
      'A voting system where voting power equals the square root of tokens held. This reduces the influence of large token holders (whales) while still giving some weight to stake. Promotes more democratic outcomes by making it expensive to dominate votes.',
    category: 'voting',
    relatedTerms: ['token_weighted', 'one_person_one_vote'],
    realWorldExample: 'Gitcoin Grants uses quadratic funding, a related concept.',
  },
  conviction: {
    term: 'Conviction Voting',
    shortDescription: 'Votes gain strength over time',
    longDescription:
      'A time-weighted voting system where votes accumulate "conviction" the longer they remain on a proposal. Encourages long-term thinking and reduces the impact of last-minute vote swings. Proposals pass when conviction exceeds a threshold.',
    category: 'voting',
    relatedTerms: ['voting_period', 'continuous_voting'],
    realWorldExample: '1Hive and some Aragon DAOs use conviction voting.',
  },
  approval: {
    term: 'Approval Voting',
    shortDescription: 'Continuous approval from token holders',
    longDescription:
      'A system where proposals (often called "spells" or "executive actions") compete for approval. Token holders can support multiple proposals, and the one with the most support can be executed. Used for ongoing parameter changes rather than one-time decisions.',
    category: 'voting',
    relatedTerms: ['executive_spell', 'continuous_voting'],
    realWorldExample: 'MakerDAO uses approval voting for executive proposals.',
  },
  ranked_choice: {
    term: 'Ranked Choice Voting',
    shortDescription: 'Voters rank options by preference',
    longDescription:
      'Voters rank multiple options in order of preference. If no option has a majority, the least popular is eliminated and those votes transfer to their next choice. Continues until one option has majority support. Good for decisions with many alternatives.',
    category: 'voting',
    relatedTerms: ['multiple_choice', 'instant_runoff'],
    realWorldExample: 'Some Snapshot votes use ranked choice for multi-option decisions.',
  },
};

// =============================================================================
// VOTING POWER MODELS
// =============================================================================

export const VOTING_POWER_TOOLTIPS: Record<string, GlossaryEntry> = {
  token_weighted: {
    term: 'Token Weighted',
    shortDescription: '1 token = 1 vote',
    longDescription:
      'The standard model where voting power directly equals token holdings. Simple and aligned with economic stake, but can lead to plutocracy where wealthy holders dominate governance. Most common in DeFi protocols.',
    category: 'voting',
    relatedTerms: ['quadratic', 'whale', 'plutocracy'],
    realWorldExample: 'Uniswap, Compound, and most DAOs use token-weighted voting.',
  },
  quadratic: {
    term: 'Quadratic Voting Power',
    shortDescription: 'Voting power = √tokens',
    longDescription:
      'Voting power equals the square root of tokens held. A holder with 100 tokens gets 10 votes, while a holder with 10,000 tokens gets 100 votes (not 100x more). Significantly reduces whale influence while still rewarding stake.',
    category: 'voting',
    relatedTerms: ['token_weighted', 'whale_resistance'],
    realWorldExample: 'Used in various experimental governance systems.',
  },
  one_person_one_vote: {
    term: 'One Person One Vote',
    shortDescription: 'Equal voting power for all',
    longDescription:
      'Every participant gets exactly one vote regardless of token holdings. Most democratic but requires identity verification (Sybil resistance) to prevent one person from creating multiple accounts. Often used alongside token voting in bicameral systems.',
    category: 'voting',
    relatedTerms: ['sybil_resistance', 'citizen', 'bicameral'],
    realWorldExample: 'Optimism Citizens House uses badge-based one-person-one-vote.',
  },
};

// =============================================================================
// GOVERNANCE FEATURES
// =============================================================================

export const GOVERNANCE_FEATURE_TOOLTIPS: Record<string, GlossaryEntry> = {
  bicameral: {
    term: 'Bicameral Governance',
    shortDescription: 'Two houses with different roles',
    longDescription:
      'A governance structure with two separate voting bodies (houses), each with distinct membership and powers. Typically one house represents token holders (economic stake) and another represents contributors or citizens (participation). Both houses must approve proposals, or one can veto the other.',
    category: 'governance',
    relatedTerms: ['token_house', 'citizens_house', 'veto'],
    realWorldExample: 'Optimism has Token House (token holders) and Citizens House (badge holders).',
  },
  dualGovernance: {
    term: 'Dual Governance',
    shortDescription: 'Stakers can veto DAO decisions',
    longDescription:
      'A mechanism giving one stakeholder group (usually stakers/users) veto power over another group (usually token holders). Designed to protect users from harmful governance decisions. If enough stakers signal opposition, the timelock extends or the proposal is blocked.',
    category: 'governance',
    relatedTerms: ['veto', 'timelock', 'ragequit'],
    realWorldExample: 'Lido uses dual governance where stETH holders can veto LDO decisions.',
  },
  timelockEnabled: {
    term: 'Timelock',
    shortDescription: 'Delay before proposals execute',
    longDescription:
      'A mandatory waiting period between when a proposal passes and when it can be executed. Gives users time to react to governance decisions (e.g., exit the protocol if they disagree). Timelocks range from hours to weeks depending on proposal severity.',
    category: 'governance',
    relatedTerms: ['execution', 'security', 'ragequit'],
    realWorldExample: 'Compound has a 2-day timelock; Arbitrum has up to 12 days for constitutional changes.',
  },
  approvalVoting: {
    term: 'Approval Voting System',
    shortDescription: 'Continuous approval-based decisions',
    longDescription:
      'An ongoing voting system where proposals compete for token holder approval. Unlike one-time votes, approval can be moved between proposals. The proposal with the most approval can be executed. Good for frequent parameter adjustments.',
    category: 'governance',
    relatedTerms: ['approval', 'executive_spell', 'continuous'],
    realWorldExample: 'MakerDAO Governance uses this for executive votes.',
  },
  convictionVoting: {
    term: 'Conviction Voting System',
    shortDescription: 'Time-weighted community preference',
    longDescription:
      'A system where voting power on a proposal grows the longer tokens remain staked to it. This "conviction" accumulates over time and proposals pass when conviction exceeds a threshold. Encourages long-term alignment and continuous participation.',
    category: 'governance',
    relatedTerms: ['conviction', 'staking', 'time_weighted'],
    realWorldExample: 'Used by 1Hive and some Commons Stack deployments.',
  },
  easyTrack: {
    term: 'Easy Track / Fast Track',
    shortDescription: 'Streamlined process for routine decisions',
    longDescription:
      'A simplified governance process for routine, low-risk proposals. Uses shorter voting periods and lower thresholds. Often includes an objection-based system where proposals pass automatically unless enough members object. Reduces governance fatigue.',
    category: 'governance',
    relatedTerms: ['optimistic_governance', 'objection', 'routine'],
    realWorldExample: 'Lido Easy Track handles routine reward distributions automatically.',
  },
  proposalGates: {
    term: 'Proposal Threshold',
    shortDescription: 'Minimum tokens to create proposals',
    longDescription:
      'A requirement that proposal creators hold or have delegated a minimum number of tokens. Prevents spam proposals while ensuring proposers have skin in the game. Thresholds range from thousands to millions of tokens depending on DAO size.',
    category: 'proposals',
    relatedTerms: ['delegation', 'spam_prevention', 'threshold'],
    realWorldExample: 'Uniswap requires 2.5M UNI (0.25%) to create a proposal.',
  },
  ragequit: {
    term: 'Rage Quit',
    shortDescription: 'Exit with your share of treasury',
    longDescription:
      'The ability for members to exit a DAO and withdraw their proportional share of the treasury, typically during a timelock period. Provides an escape hatch for members who disagree with governance decisions. Originally from Moloch DAO design.',
    category: 'economics',
    relatedTerms: ['treasury', 'timelock', 'exit_rights'],
    realWorldExample: 'Moloch DAOs and Lido (via dual governance) support rage quit mechanics.',
  },
  tokenLocking: {
    term: 'Token Locking',
    shortDescription: 'Lock tokens for voting power',
    longDescription:
      'A mechanism requiring tokens to be locked (unable to be transferred) for a period to participate in voting. Longer lock periods often grant more voting power (ve-tokenomics). Aligns voter incentives with long-term protocol health.',
    category: 'voting',
    relatedTerms: ['ve_token', 'staking', 'commitment'],
    realWorldExample: 'Curve veCRV locks tokens up to 4 years for maximum voting power.',
  },
  governanceCycles: {
    term: 'Governance Cycles / Seasons',
    shortDescription: 'Structured governance periods',
    longDescription:
      'A system organizing governance into discrete time periods (seasons, cycles). Each cycle may have specific phases: proposal submission, voting, reflection. Provides predictability and helps coordinate community attention. Common in DAOs with grants programs.',
    category: 'governance',
    relatedTerms: ['season', 'reflection_period', 'grants'],
    realWorldExample: 'Optimism runs governance in "Seasons" with defined voting phases.',
  },
  retroPGF: {
    term: 'Retroactive Public Goods Funding',
    shortDescription: 'Reward past contributions',
    longDescription:
      'A funding mechanism that rewards contributors based on the impact of their past work rather than promises of future work. Citizens or a committee evaluate contributions after the fact and allocate funding retroactively. Reduces speculation and rewards proven value.',
    category: 'economics',
    relatedTerms: ['public_goods', 'grants', 'citizens_house'],
    realWorldExample: 'Optimism RetroPGF has distributed millions to public goods contributors.',
  },
  securityCouncil: {
    term: 'Security Council',
    shortDescription: 'Emergency response team',
    longDescription:
      'A small group with emergency powers to act quickly in crisis situations (hacks, critical bugs). Typically a multisig that can pause contracts, execute emergency fixes, or fast-track security proposals. Members are usually elected and have term limits.',
    category: 'security',
    relatedTerms: ['multisig', 'emergency', 'guardian'],
    realWorldExample: 'Arbitrum Security Council is a 12-member multisig with 9/12 threshold.',
  },
  citizenHouse: {
    term: 'Citizens House',
    shortDescription: 'Non-token-based voting body',
    longDescription:
      'A governance body where membership is based on contribution or reputation rather than token holdings. Members (citizens) typically receive non-transferable badges. Used to balance plutocratic token voting with more democratic participation.',
    category: 'governance',
    relatedTerms: ['bicameral', 'soulbound', 'badge'],
    realWorldExample: 'Optimism Citizens House allocates RetroPGF funding.',
  },
};

// =============================================================================
// MEMBER ARCHETYPES
// =============================================================================

export const MEMBER_ARCHETYPE_TOOLTIPS: Record<string, GlossaryEntry> = {
  passive_holder: {
    term: 'Passive Holder',
    shortDescription: 'Holds tokens but rarely participates',
    longDescription:
      'Token holders who rarely or never vote. May hold tokens for speculation, staking rewards, or simply lack time/interest in governance. Represent the majority of token holders in most DAOs. Their non-participation affects quorum calculations.',
    category: 'members',
    relatedTerms: ['voter_turnout', 'quorum', 'delegation'],
    realWorldExample: 'Studies show 90%+ of token holders never vote in most DAOs.',
  },
  active_voter: {
    term: 'Active Voter',
    shortDescription: 'Participates in most governance votes',
    longDescription:
      'Engaged community members who regularly participate in governance. Vote on most proposals, may comment in forums, but typically don\'t create proposals themselves. Form the backbone of healthy governance participation.',
    category: 'members',
    relatedTerms: ['participation_rate', 'forum', 'engagement'],
  },
  delegate: {
    term: 'Delegate',
    shortDescription: 'Accepts delegations from other holders',
    longDescription:
      'Members who accept voting power delegated from other token holders. Act as representatives, expected to stay informed and vote thoughtfully. May receive compensation or grants. Critical for governance participation in large DAOs.',
    category: 'members',
    relatedTerms: ['delegation', 'representative', 'voting_power'],
    realWorldExample: 'ENS, Uniswap, and Gitcoin have active delegate programs.',
  },
  whale: {
    term: 'Whale',
    shortDescription: 'Large token holder with significant influence',
    longDescription:
      'A holder with a large percentage of tokens, giving them significant voting power. Can single-handedly swing votes in token-weighted systems. May be early investors, team members, or treasury wallets. Whale behavior significantly impacts governance outcomes.',
    category: 'members',
    relatedTerms: ['plutocracy', 'quadratic', 'concentration'],
    realWorldExample: 'a]6z (a16z) is a known whale in many DeFi governance systems.',
  },
  governance_expert: {
    term: 'Governance Expert',
    shortDescription: 'Deep knowledge of governance mechanics',
    longDescription:
      'Members with expertise in governance design, game theory, and protocol mechanics. Often create proposals, analyze trade-offs, and guide governance discussions. May work across multiple DAOs as consultants or researchers.',
    category: 'members',
    relatedTerms: ['proposal_author', 'research', 'design'],
  },
  builder: {
    term: 'Builder',
    shortDescription: 'Contributes code, products, or projects',
    longDescription:
      'Active contributors who build on or for the protocol. May be core team, grant recipients, or independent developers. Often have strong opinions on technical proposals but may lack time for non-technical governance.',
    category: 'members',
    relatedTerms: ['contributor', 'grants', 'technical'],
  },
  steward: {
    term: 'Steward',
    shortDescription: 'Grants oversight and proposal review',
    longDescription:
      'Members responsible for stewarding community resources, often managing grants programs. Review proposals, mentor recipients, and ensure funds are used effectively. Usually elected or selected based on reputation and expertise.',
    category: 'members',
    relatedTerms: ['grants', 'oversight', 'workstream'],
    realWorldExample: 'Gitcoin and ENS have formal Steward roles.',
  },
  staker: {
    term: 'Staker',
    shortDescription: 'Stakes tokens for security or rewards',
    longDescription:
      'Members who lock tokens to secure the protocol or earn staking rewards. May have different governance interests than pure token holders. In dual governance systems, stakers often have veto power to protect against harmful decisions.',
    category: 'members',
    relatedTerms: ['staking', 'security', 'dual_governance'],
    realWorldExample: 'Lido stETH holders are stakers who can participate in dual governance.',
  },
  citizen: {
    term: 'Citizen',
    shortDescription: 'Non-token-based voting member',
    longDescription:
      'Members who participate based on contribution or identity rather than token holdings. Receive non-transferable badges or credentials. Vote in Citizens House or similar bodies. Represent the "voice" aspect of governance versus economic stake.',
    category: 'members',
    relatedTerms: ['citizens_house', 'soulbound', 'identity'],
    realWorldExample: 'Optimism Citizens are badge holders who vote on RetroPGF.',
  },
  security_council: {
    term: 'Security Council Member',
    shortDescription: 'Emergency powers and oversight',
    longDescription:
      'Members of a multisig with emergency powers. Can act quickly in crisis situations without full governance process. Usually highly vetted, experienced community members. Positions often have term limits and are subject to recall.',
    category: 'members',
    relatedTerms: ['multisig', 'emergency', 'guardian'],
    realWorldExample: 'Arbitrum Security Council members are elected annually.',
  },
};

// =============================================================================
// PROPOSAL STAGES
// =============================================================================

export const PROPOSAL_STAGE_TOOLTIPS: Record<string, GlossaryEntry> = {
  discussion: {
    term: 'Discussion Phase',
    shortDescription: 'Forum discussion before formal vote',
    longDescription:
      'The initial phase where proposals are discussed in forums or governance platforms. Allows community feedback, refinement of ideas, and gauging support before moving to formal voting. No binding votes occur during this phase.',
    category: 'proposals',
    relatedTerms: ['rfc', 'forum', 'feedback'],
    realWorldExample: 'Most DAOs require forum discussion before Snapshot or on-chain votes.',
  },
  temp_check: {
    term: 'Temperature Check',
    shortDescription: 'Non-binding signal vote',
    longDescription:
      'A preliminary, non-binding vote to gauge community sentiment. Usually conducted on Snapshot (off-chain) before committing to an on-chain vote. Helps filter proposals that lack support and saves gas costs. Also called "signal vote" or "sentiment check".',
    category: 'proposals',
    relatedTerms: ['snapshot', 'signal', 'off_chain'],
    realWorldExample: 'Uniswap requires a Snapshot temp check before on-chain voting.',
  },
  voting: {
    term: 'Voting Phase',
    shortDescription: 'Active on-chain or binding vote',
    longDescription:
      'The formal voting period where token holders cast binding votes. May be on-chain (recorded in smart contracts) or off-chain (Snapshot) depending on DAO design. Votes are tallied and checked against quorum and passing threshold requirements.',
    category: 'proposals',
    relatedTerms: ['on_chain', 'quorum', 'threshold'],
  },
  timelock: {
    term: 'Timelock Phase',
    shortDescription: 'Mandatory delay before execution',
    longDescription:
      'A waiting period after a proposal passes before it can be executed. Gives users time to review the outcome and exit if they disagree. Timelock length often varies by proposal type (longer for major changes). Security mechanism against governance attacks.',
    category: 'proposals',
    relatedTerms: ['execution', 'delay', 'security'],
  },
  veto_window: {
    term: 'Veto Window',
    shortDescription: 'Period where vetoes can be raised',
    longDescription:
      'A phase where certain stakeholders (Citizens House, Security Council, or stakers) can veto a passed proposal. If veto threshold is reached, the proposal is blocked or sent back for reconsideration. Provides checks and balances in governance.',
    category: 'proposals',
    relatedTerms: ['veto', 'dual_governance', 'bicameral'],
    realWorldExample: 'Optimism Citizens House has veto power over certain Token House decisions.',
  },
  execution: {
    term: 'Execution Phase',
    shortDescription: 'Proposal ready to be implemented',
    longDescription:
      'The final phase where a passed proposal is actually executed. For on-chain proposals, this means calling smart contract functions. May require a specific transaction to trigger execution. Some proposals execute automatically; others require manual action.',
    category: 'proposals',
    relatedTerms: ['transaction', 'implementation', 'on_chain'],
  },
};

// =============================================================================
// QUORUM & THRESHOLDS
// =============================================================================

export const QUORUM_TOOLTIPS: Record<string, GlossaryEntry> = {
  quorum: {
    term: 'Quorum',
    shortDescription: 'Minimum participation required',
    longDescription:
      'The minimum number of votes (or voting power) required for a proposal to be valid. Ensures decisions have sufficient community engagement. If quorum is not reached, the proposal fails regardless of vote outcome. Usually expressed as a percentage of total tokens or eligible voters.',
    category: 'voting',
    relatedTerms: ['participation', 'threshold', 'legitimacy'],
    realWorldExample: 'Uniswap requires 40M UNI (4%) quorum for proposals.',
  },
  fixed_percent: {
    term: 'Fixed Quorum',
    shortDescription: 'Same quorum for all proposals',
    longDescription:
      'A simple quorum system where all proposals require the same percentage of participation. Easy to understand but may be too high for routine decisions or too low for major changes.',
    category: 'voting',
    relatedTerms: ['quorum', 'simple'],
  },
  dynamic: {
    term: 'Dynamic Quorum',
    shortDescription: 'Quorum adjusts based on conditions',
    longDescription:
      'A quorum system that adjusts based on various factors like proposal controversy (vote margin), historical participation, or time elapsed. Can help ensure contentious decisions get more scrutiny while routine decisions pass more easily.',
    category: 'voting',
    relatedTerms: ['adaptive', 'controversy'],
  },
  per_category: {
    term: 'Per-Category Quorum',
    shortDescription: 'Different quorum for different proposal types',
    longDescription:
      'A system with different quorum requirements based on proposal category. Constitutional or high-impact proposals may require higher quorum than routine parameter changes. Balances security with governance efficiency.',
    category: 'voting',
    relatedTerms: ['constitutional', 'tiered'],
    realWorldExample: 'Arbitrum has 5% quorum for constitutional vs 3% for non-constitutional.',
  },
};

// =============================================================================
// ECONOMICS
// =============================================================================

export const ECONOMICS_TOOLTIPS: Record<string, GlossaryEntry> = {
  treasury: {
    term: 'Treasury',
    shortDescription: 'Community-controlled funds',
    longDescription:
      'The pool of assets controlled by the DAO through governance. May include the native token, stablecoins, or other assets. Treasury is used for grants, operations, and strategic initiatives. Its management is a key governance responsibility.',
    category: 'economics',
    relatedTerms: ['grants', 'budget', 'diversification'],
    realWorldExample: 'Uniswap treasury holds billions in UNI tokens.',
  },
  tokenSupply: {
    term: 'Token Supply',
    shortDescription: 'Total governance tokens in circulation',
    longDescription:
      'The total number of governance tokens that exist. Important for calculating quorum requirements and understanding voting power distribution. May be fixed or inflationary depending on tokenomics design.',
    category: 'economics',
    relatedTerms: ['inflation', 'distribution', 'dilution'],
  },
  proposalThreshold: {
    term: 'Proposal Threshold',
    shortDescription: 'Tokens needed to create proposals',
    longDescription:
      'The minimum token amount required to submit a governance proposal. Prevents spam while ensuring proposers have meaningful stake. Can be met through direct holdings or delegation. Higher thresholds increase proposal quality but reduce accessibility.',
    category: 'economics',
    relatedTerms: ['delegation', 'accessibility', 'spam'],
    realWorldExample: 'Compound requires 25K COMP (0.25%) to propose.',
  },
};

// =============================================================================
// COMBINED GLOSSARY
// =============================================================================

export const FULL_GLOSSARY: Record<string, GlossaryEntry> = {
  ...VOTING_SYSTEM_TOOLTIPS,
  ...VOTING_POWER_TOOLTIPS,
  ...GOVERNANCE_FEATURE_TOOLTIPS,
  ...MEMBER_ARCHETYPE_TOOLTIPS,
  ...PROPOSAL_STAGE_TOOLTIPS,
  ...QUORUM_TOOLTIPS,
  ...ECONOMICS_TOOLTIPS,
};

/**
 * Get all glossary entries by category
 */
export function getGlossaryByCategory(category: GlossaryCategory): GlossaryEntry[] {
  return Object.values(FULL_GLOSSARY).filter((entry) => entry.category === category);
}

/**
 * Get all categories with their entries
 */
export function getGlossaryGroupedByCategory(): Record<GlossaryCategory, GlossaryEntry[]> {
  const categories: GlossaryCategory[] = [
    'voting',
    'governance',
    'members',
    'proposals',
    'economics',
    'security',
  ];

  return categories.reduce(
    (acc, category) => {
      acc[category] = getGlossaryByCategory(category);
      return acc;
    },
    {} as Record<GlossaryCategory, GlossaryEntry[]>
  );
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  voting: 'Voting Systems',
  governance: 'Governance Structures',
  members: 'Member Types',
  proposals: 'Proposal Process',
  economics: 'Economics & Treasury',
  security: 'Security & Safety',
};

/**
 * Category icons (emoji)
 */
export const CATEGORY_ICONS: Record<GlossaryCategory, string> = {
  voting: '🗳️',
  governance: '🏛️',
  members: '👥',
  proposals: '📋',
  economics: '💰',
  security: '🛡️',
};
