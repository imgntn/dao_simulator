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

  return `You are ${describeRole(ctx.agentType)} in a DAO with ${ctx.totalMembers} members.
Holdings: ${Math.round(ctx.tokens)} tokens (${pctSupply}% of supply). Reputation: ${Math.round(ctx.reputation)}.
Disposition: ${describeOptimism(ctx.optimism)}. Governance rule: ${ctx.governanceRuleName}.
Treasury: ${Math.round(ctx.treasuryFunds)} tokens. Token price: $${ctx.tokenPrice.toFixed(2)}.

Evaluate the proposal and respond with JSON only:
{"vote": "yes" or "no", "reasoning": "1-2 sentences", "confidence": 0.0-1.0}`;
}

/**
 * Build the user prompt (proposal details + memory context)
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

  let prompt = `PROPOSAL: "${p.title}"
Topic: ${p.topic || 'General'}
Funding: ${Math.round(p.currentFunding)}/${Math.round(p.fundingGoal)} (${fundingPct}%)
Current votes: ${p.votesFor} for / ${p.votesAgainst} against (${supportPct}% support)
Steps remaining: ${p.stepsRemaining}`;

  if (ctx.memoryContext) {
    prompt += `\n\nYOUR RECENT EXPERIENCE:\n${ctx.memoryContext}`;
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
  const confidence = confMatch ? clampConfidence(confMatch[1]) : 0.5;

  // Use first sentence as reasoning
  const reasoning = raw.split(/[.!?\n]/).filter((s) => s.trim().length > 5)[0]?.trim() || '';

  return { vote, reasoning: reasoning.slice(0, 500), confidence };
}
