/**
 * Prompt Templates & Response Parsing
 *
 * Builds prompts for LLM agents and parses structured responses.
 * System prompt establishes persona from agent type + traits.
 * Vote response parsing with robust JSON + regex fallback.
 */

export interface PromptContext {
  agentType: string;
  agentId: string;
  tokens: number;
  totalSupply: number;
  reputation: number;
  optimism: number;
  totalMembers: number;
  governanceRuleName: string;
  proposal: {
    id: string;
    title: string;
    topic: string;
    fundingGoal: number;
    currentFunding: number;
    votesFor: number;
    votesAgainst: number;
    status: string;
    stepsRemaining: number;
  };
  treasuryFunds: number;
  tokenPrice: number;
  memoryContext?: string;

  // DAO briefing fields (all optional for backward compat)
  proposalDescription?: string;
  proposalComments?: Array<{ member: string; sentiment: string }>;
  treasuryPctRequested?: number;
  treasuryTrend?: string;
  recentPassRate?: number;
  governanceRuleExplanation?: string;
  activeProposalCount?: number;
  otherOpenProposals?: Array<{ title: string; topic: string; support: string; fundingPct: number }>;
  forumSentiment?: number;
  forumThreadSummary?: string;
  blackSwanActive?: boolean;
  blackSwanDescription?: string;
  recentVoteHistory?: Array<{ proposal: string; vote: string; outcome: string }>;
}

export interface VoteDecision {
  vote: 'yes' | 'no' | 'abstain';
  reasoning: string;
  confidence: number;
}

export interface ForumPostResult {
  content: string;
  sentiment: number; // -1 to 1
}

export interface ProposalIdea {
  shouldPropose: boolean;
  title: string;
  topic: string;
  description: string;
  fundingPct: number; // 0-1 fraction of treasury to request
}

export interface ProposalGenerationContext {
  agentType: string;
  agentId: string;
  tokens: number;
  totalSupply: number;
  reputation: number;
  optimism: number;
  totalMembers: number;
  governanceRuleName: string;
  treasuryFunds: number;
  tokenPrice: number;
  openProposalCount: number;
  recentTopics: string[];
  recentPassRate: number; // 0-1
  memoryContext?: string;
}

/**
 * Map optimism value (0-1) to a descriptive disposition
 */
function describeOptimism(optimism: number): string {
  if (optimism > 0.75) return 'optimistic about governance proposals';
  if (optimism > 0.55) return 'moderately supportive of new initiatives';
  if (optimism > 0.45) return 'neutral and analytical';
  if (optimism > 0.25) return 'cautious and skeptical of changes';
  return 'highly conservative and risk-averse';
}

/**
 * Map agent type to a role description
 */
function describeRole(agentType: string): string {
  const roleMap: Record<string, string> = {
    Developer: 'a software developer who values technical quality and sustainable growth',
    Investor: 'an investor focused on token value and ROI of proposals',
    Trader: 'a trader who watches market dynamics and price impact',
    GovernanceExpert: 'a governance specialist who evaluates proposal structure and precedent',
    GovernanceWhale: 'a large token holder with significant influence on outcomes',
    ProposalCreator: 'an active contributor who creates and champions proposals',
    RiskManager: 'a risk analyst who assesses downside scenarios and treasury safety',
    Validator: 'a validator who ensures protocol integrity and security',
    Delegator: 'a delegator who trusts representatives but votes on important issues',
    PassiveMember: 'a casual participant who votes occasionally',
    Auditor: 'an auditor who scrutinizes financial aspects and accountability',
    MarketMaker: 'a market maker interested in liquidity and trading stability',
    Whistleblower: 'a watchdog who flags suspicious activity and governance risks',
  };

  return roleMap[agentType] || 'a DAO member participating in governance';
}

/**
 * Build the system prompt for an LLM agent voting decision
 */
function buildSystemPrompt(ctx: PromptContext): string {
  const pctSupply =
    ctx.totalSupply > 0
      ? ((ctx.tokens / ctx.totalSupply) * 100).toFixed(2)
      : '0.00';

  let prompt = `You are ${describeRole(ctx.agentType)} in a DAO with ${ctx.totalMembers} members.
Holdings: ${Math.round(ctx.tokens)} tokens (${pctSupply}% of supply). Reputation: ${Math.round(ctx.reputation)}.
Disposition: ${describeOptimism(ctx.optimism)}. Governance rule: ${ctx.governanceRuleName}.
Treasury: ${Math.round(ctx.treasuryFunds)} tokens. Token price: $${ctx.tokenPrice.toFixed(2)}.`;

  if (ctx.governanceRuleExplanation) {
    prompt += `\n\nGOVERNANCE CONTEXT: ${ctx.governanceRuleExplanation}`;
  }

  prompt += `

DECISION FRAMEWORK:
- Consider whether the proposal benefits the DAO and aligns with its goals
- Evaluate treasury impact: can the DAO afford this? Is the requested amount reasonable?
- Factor in community sentiment, current support levels, and competing proposals
- Consider your role-specific perspective and risk tolerance
- If a crisis or market shock is active, weigh its impact on proposal viability

CONFIDENCE CALIBRATION:
- Below 0.4: You are uncertain — your vote will be deferred to default behavior
- 0.4 to 0.7: Moderate conviction — you have a reasoned position but acknowledge uncertainty
- Above 0.7: Strong conviction — you have clear, well-supported reasoning

Respond with JSON only. Example:
{"vote": "yes", "reasoning": "Treasury is healthy and this funds core development at a reasonable cost.", "confidence": 0.72}`;

  return prompt;
}

/**
 * Build the user prompt as a full DAO briefing document.
 * Each section is conditional — only appears when data is available.
 * Estimated ~2,000-3,000 tokens fully populated (vs ~350 previously).
 */
function buildUserPrompt(ctx: PromptContext): string {
  const p = ctx.proposal;
  const fundingPct =
    p.fundingGoal > 0
      ? ((p.currentFunding / p.fundingGoal) * 100).toFixed(0)
      : 'N/A';
  const totalVotes = p.votesFor + p.votesAgainst;
  const supportPct =
    totalVotes > 0
      ? ((p.votesFor / totalVotes) * 100).toFixed(0)
      : 'no votes yet';

  // === PROPOSAL UNDER REVIEW ===
  let prompt = `=== PROPOSAL UNDER REVIEW ===
Title: "${p.title}"
Topic: ${p.topic || 'General'}
Funding: ${Math.round(p.currentFunding)}/${Math.round(p.fundingGoal)} (${fundingPct}%)
Current votes: ${p.votesFor} for / ${p.votesAgainst} against (${supportPct}% support)
Steps remaining: ${p.stepsRemaining}`;

  if (ctx.proposalDescription) {
    prompt += `\nDescription: ${ctx.proposalDescription}`;
  }

  if (ctx.proposalComments && ctx.proposalComments.length > 0) {
    const commentLines = ctx.proposalComments.slice(0, 5)
      .map(c => `  ${c.member}: ${c.sentiment}`)
      .join('\n');
    prompt += `\nComments:\n${commentLines}`;
  }

  // === TREASURY HEALTH ===
  if (ctx.treasuryPctRequested !== undefined) {
    const pctLabel = (ctx.treasuryPctRequested * 100).toFixed(1);
    const impact = ctx.treasuryPctRequested > 0.15
      ? 'HIGH — significant treasury impact'
      : ctx.treasuryPctRequested > 0.05
        ? 'MODERATE — notable treasury impact'
        : 'LOW — minor treasury impact';
    prompt += `\n\n=== TREASURY HEALTH ===
Balance: ${Math.round(ctx.treasuryFunds)} tokens
This proposal requests: ${pctLabel}% of treasury (${impact})`;
    if (ctx.treasuryTrend) {
      prompt += `\nTrend: treasury is ${ctx.treasuryTrend}`;
    }
  }

  // === GOVERNANCE LANDSCAPE ===
  if (ctx.recentPassRate !== undefined || (ctx.otherOpenProposals && ctx.otherOpenProposals.length > 0)) {
    prompt += '\n\n=== GOVERNANCE LANDSCAPE ===';
    if (ctx.recentPassRate !== undefined) {
      prompt += `\nRecent pass rate: ${(ctx.recentPassRate * 100).toFixed(0)}% of proposals have passed`;
    }
    if (ctx.activeProposalCount !== undefined && ctx.activeProposalCount > 1) {
      prompt += `\nActive proposals: ${ctx.activeProposalCount} proposals competing for funds`;
    }
    if (ctx.otherOpenProposals && ctx.otherOpenProposals.length > 0) {
      prompt += '\nOther open proposals:';
      for (const op of ctx.otherOpenProposals.slice(0, 5)) {
        prompt += `\n  - "${op.title}" (${op.topic}) — ${op.support} support, requesting ${(op.fundingPct * 100).toFixed(1)}% of treasury`;
      }
    }
  }

  // === COMMUNITY DISCUSSION ===
  if (ctx.forumSentiment !== undefined || ctx.forumThreadSummary) {
    prompt += '\n\n=== COMMUNITY DISCUSSION ===';
    if (ctx.forumSentiment !== undefined) {
      const sentimentLabel = ctx.forumSentiment > 0.3 ? 'positive'
        : ctx.forumSentiment < -0.3 ? 'negative' : 'mixed';
      prompt += `\nForum sentiment: ${sentimentLabel} (${ctx.forumSentiment.toFixed(2)})`;
    }
    if (ctx.forumThreadSummary) {
      prompt += `\nDiscussion:\n${ctx.forumThreadSummary}`;
    }
  }

  // === MARKET CONDITIONS ===
  if (ctx.blackSwanActive) {
    prompt += '\n\n=== MARKET CONDITIONS ===';
    prompt += `\nCRISIS ACTIVE: ${ctx.blackSwanDescription || 'An exogenous shock is affecting the market.'}`;
  }

  // === YOUR TRACK RECORD ===
  if (ctx.recentVoteHistory && ctx.recentVoteHistory.length > 0) {
    prompt += '\n\n=== YOUR TRACK RECORD ===';
    for (const v of ctx.recentVoteHistory.slice(0, 10)) {
      prompt += `\n  - Voted ${v.vote} on "${v.proposal}" → ${v.outcome}`;
    }
  }

  // === YOUR RECENT EXPERIENCE ===
  if (ctx.memoryContext) {
    prompt += `\n\n=== YOUR RECENT EXPERIENCE ===\n${ctx.memoryContext}`;
  }

  return prompt;
}

/**
 * Build a complete voting prompt with system and user parts
 */
export function buildVotingPrompt(ctx: PromptContext): {
  system: string;
  prompt: string;
} {
  return {
    system: buildSystemPrompt(ctx),
    prompt: buildUserPrompt(ctx),
  };
}

/**
 * Build a forum post prompt
 */
export function buildForumPostPrompt(
  ctx: Pick<PromptContext, 'agentType' | 'agentId' | 'tokens' | 'totalSupply' | 'reputation' | 'optimism' | 'totalMembers' | 'governanceRuleName' | 'treasuryFunds' | 'tokenPrice'>,
  topicTitle: string,
  topicSentiment: number
): { system: string; prompt: string } {
  const pctSupply =
    ctx.totalSupply > 0
      ? ((ctx.tokens / ctx.totalSupply) * 100).toFixed(2)
      : '0.00';

  const system = `You are ${describeRole(ctx.agentType)} in a DAO with ${ctx.totalMembers} members.
Holdings: ${Math.round(ctx.tokens)} tokens (${pctSupply}% of supply). Reputation: ${Math.round(ctx.reputation)}.
Disposition: ${describeOptimism(ctx.optimism)}.

Write a brief forum post (1-3 sentences) and respond with JSON:
{"content": "your post text", "sentiment": -1.0 to 1.0}`;

  const sentimentDesc =
    topicSentiment > 0.3
      ? 'positive'
      : topicSentiment < -0.3
        ? 'negative'
        : 'mixed';

  const prompt = `FORUM TOPIC: "${topicTitle}"
Current discussion sentiment: ${sentimentDesc} (${topicSentiment.toFixed(2)})`;

  return { system, prompt };
}

/**
 * Build a prompt for proposal generation
 */
export function buildProposalPrompt(ctx: ProposalGenerationContext): {
  system: string;
  prompt: string;
} {
  const pctSupply =
    ctx.totalSupply > 0
      ? ((ctx.tokens / ctx.totalSupply) * 100).toFixed(2)
      : '0.00';

  const system = `You are ${describeRole(ctx.agentType)} in a DAO with ${ctx.totalMembers} members.
Holdings: ${Math.round(ctx.tokens)} tokens (${pctSupply}% of supply). Reputation: ${Math.round(ctx.reputation)}.
Disposition: ${describeOptimism(ctx.optimism)}. Governance rule: ${ctx.governanceRuleName}.

Decide whether to create a governance proposal. Consider the DAO's current needs, treasury health, and recent activity.
Respond with JSON:
{"shouldPropose": true/false, "title": "short title", "topic": "Funding|Governance|Development|Community|Infrastructure|Marketing", "description": "1-2 sentence description", "fundingPct": 0.0-0.05}
If shouldPropose is false, set title/description to empty strings, topic to "", and fundingPct to 0.`;

  const recentTopicList =
    ctx.recentTopics.length > 0
      ? ctx.recentTopics.join(', ')
      : 'none';

  const passRateDesc =
    ctx.recentPassRate > 0.7
      ? 'high (most proposals pass)'
      : ctx.recentPassRate > 0.4
        ? 'moderate'
        : 'low (many proposals fail)';

  let prompt = `DAO STATE:
Treasury: ${Math.round(ctx.treasuryFunds)} tokens. Token price: $${ctx.tokenPrice.toFixed(2)}.
Open proposals: ${ctx.openProposalCount}
Recent proposal topics: ${recentTopicList}
Recent pass rate: ${passRateDesc} (${(ctx.recentPassRate * 100).toFixed(0)}%)`;

  if (ctx.memoryContext) {
    prompt += `\n\nYOUR RECENT EXPERIENCE:\n${ctx.memoryContext}`;
  }

  return { system, prompt };
}

/**
 * Extract the best JSON object from raw LLM output.
 * Tries all {…} matches and returns the first one that parses successfully.
 */
function extractJSON(raw: string): Record<string, unknown> | null {
  // Match all potential JSON objects (non-greedy), try each
  const matches = raw.match(/\{[^{}]*\}/g);
  if (!matches) return null;

  for (const m of matches) {
    try {
      return JSON.parse(m) as Record<string, unknown>;
    } catch {
      // try next match
    }
  }
  return null;
}

/**
 * Parse a proposal generation response from raw LLM output
 */
export function parseProposalResponse(raw: string): ProposalIdea {
  const noProposal: ProposalIdea = {
    shouldPropose: false,
    title: '',
    topic: '',
    description: '',
    fundingPct: 0,
  };

  try {
    const parsed = extractJSON(raw);
    if (parsed) {
      if (!parsed.shouldPropose) return noProposal;

      const validTopics = ['Funding', 'Governance', 'Development', 'Community', 'Infrastructure', 'Marketing'];
      let topic = typeof parsed.topic === 'string' ? parsed.topic : 'Governance';
      // Normalize topic to match valid set
      const matched = validTopics.find(
        (t) => t.toLowerCase() === topic.toLowerCase()
      );
      topic = matched || 'Governance';

      const fundingPct = Math.max(0, Math.min(0.05, Number(parsed.fundingPct) || 0));

      return {
        shouldPropose: true,
        title: typeof parsed.title === 'string' ? parsed.title.slice(0, 200) : `${topic} Proposal`,
        topic,
        description: typeof parsed.description === 'string' ? parsed.description.slice(0, 500) : `A proposal about ${topic.toLowerCase()}.`,
        fundingPct,
      };
    }
  } catch {
    // fall through
  }

  return noProposal;
}

/**
 * Parse a vote response from raw LLM output.
 * Tries JSON first, then falls back to regex extraction.
 */
export function parseVoteResponse(raw: string): VoteDecision {
  // Try JSON parse first
  try {
    const parsed = extractJSON(raw);
    if (parsed) {
      const vote = normalizeVote(parsed.vote);
      const confidence = clampConfidence(parsed.confidence);
      const reasoning =
        typeof parsed.reasoning === 'string'
          ? (parsed.reasoning as string).slice(0, 500)
          : '';
      return { vote, reasoning, confidence };
    }
  } catch {
    // Fall through to regex
  }

  // Regex fallback
  return parseVoteRegex(raw);
}

/**
 * Parse a forum post response from raw LLM output
 */
export function parseForumPostResponse(raw: string): ForumPostResult {
  try {
    const parsed = extractJSON(raw);
    if (parsed) {
      return {
        content:
          typeof parsed.content === 'string'
            ? (parsed.content as string).slice(0, 1000)
            : 'No comment.',
        sentiment: Math.max(-1, Math.min(1, Number(parsed.sentiment) || 0)),
      };
    }
  } catch {
    // fall through
  }

  return { content: raw.slice(0, 200), sentiment: 0 };
}

// ==========================================================================
// PUBLIC HELPERS
// ==========================================================================

/** Map governance rule names to plain-English explanations for LLM context */
export function describeGovernanceRule(ruleName: string): string {
  const descriptions: Record<string, string> = {
    majority: 'Simple majority: a proposal passes if more than 50% of votes are in favor.',
    supermajority: 'Supermajority: a proposal needs at least 66% support to pass.',
    tokenquorum: 'Token-weighted quorum: a minimum percentage of total token supply must vote, and simple majority wins.',
    quadratic: 'Quadratic voting: voting power is the square root of tokens held, reducing whale influence. Majority of quadratic-weighted votes wins.',
    conviction: 'Conviction voting: votes accumulate weight over time. Sustained support is rewarded over brief surges.',
    optimistic: 'Optimistic approval: proposals pass by default unless enough members actively veto them.',
    bicameral: 'Bicameral governance: two chambers must both approve a proposal. Either chamber can veto.',
    dualgovernance: 'Dual governance: proposals require approval from two separate bodies, with veto and rage-quit mechanisms.',
    categoryquorum: 'Category-based quorum: constitutional proposals require higher quorum than standard proposals.',
    'instant-runoff': 'Instant-runoff voting: members rank choices, lowest-ranked options are eliminated in rounds until one wins.',
    futarchy: 'Futarchy: decisions are made through prediction markets. The outcome that traders bet will produce better results wins.',
  };

  return descriptions[ruleName] || `${ruleName} governance: proposals are evaluated and voted on by DAO members.`;
}

// ==========================================================================
// PRIVATE HELPERS
// ==========================================================================

function normalizeVote(vote: unknown): 'yes' | 'no' | 'abstain' {
  const str = String(vote).toLowerCase().trim();
  if (str === 'yes' || str === 'for' || str === 'approve') return 'yes';
  if (str === 'no' || str === 'against' || str === 'reject') return 'no';
  return 'abstain';
}

function clampConfidence(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

function parseVoteRegex(raw: string): VoteDecision {
  const lower = raw.toLowerCase();

  // Look for vote direction
  let vote: 'yes' | 'no' | 'abstain' = 'abstain';
  if (/\byes\b|\bfor\b|\bapprove\b|\bsupport\b/i.test(lower)) {
    vote = 'yes';
  } else if (/\bno\b|\bagainst\b|\breject\b|\boppose\b/i.test(lower)) {
    vote = 'no';
  }

  // Look for confidence
  const confMatch = lower.match(/confidence[:\s]+(\d*\.?\d+)/);
  // Default 0.3 for regex fallback — below MIN_LLM_CONFIDENCE (0.4),
  // so malformed JSON responses safely fall back to rule-based voting
  const confidence = confMatch ? clampConfidence(confMatch[1]) : 0.3;

  // Use first sentence as reasoning
  const reasoning = raw.split(/[.!?\n]/).filter((s) => s.trim().length > 5)[0]?.trim() || '';

  return { vote, reasoning: reasoning.slice(0, 500), confidence };
}
