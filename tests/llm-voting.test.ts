/**
 * Tests for LLM Voting Behavior, Prompt Templates, Response Cache, and Agent Memory
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildVotingPrompt,
  parseVoteResponse,
  parseForumPostResponse,
  parseProposalResponse,
  buildForumPostPrompt,
  describeGovernanceRule,
} from '@/lib/llm/prompt-templates';
import type { PromptContext } from '@/lib/llm/prompt-templates';
import { LLMResponseCache } from '@/lib/llm/response-cache';
import { AgentMemory } from '@/lib/llm/agent-memory';
import { LLMVotingBehavior } from '@/lib/llm/llm-voting-mixin';
import type { OllamaClient, OllamaGenerateResponse } from '@/lib/llm/ollama-client';

// =============================================================================
// Prompt Templates
// =============================================================================

function makeContext(overrides: Partial<PromptContext> = {}): PromptContext {
  return {
    agentType: 'Developer',
    agentId: 'dev_0',
    tokens: 100,
    totalSupply: 10000,
    reputation: 50,
    optimism: 0.6,
    totalMembers: 50,
    governanceRuleName: 'majority',
    proposal: {
      id: 'p1',
      title: 'Fund Development',
      topic: 'Funding',
      fundingGoal: 500,
      currentFunding: 100,
      votesFor: 10,
      votesAgainst: 3,
      status: 'open',
      stepsRemaining: 15,
    },
    treasuryFunds: 5000,
    tokenPrice: 1.5,
    ...overrides,
  };
}

describe('Prompt Templates', () => {
  describe('buildVotingPrompt', () => {
    it('builds system and user prompts', () => {
      const ctx = makeContext();
      const { system, prompt } = buildVotingPrompt(ctx);

      expect(system).toContain('software developer');
      expect(system).toContain('50 members');
      expect(system).toContain('majority');
      expect(system).toContain('JSON');

      expect(prompt).toContain('Fund Development');
      expect(prompt).toContain('Funding');
      expect(prompt).toContain('10 for / 3 against');
    });

    it('includes memory context when provided', () => {
      const ctx = makeContext({ memoryContext: '- [Step 5] Voted yes on previous proposal' });
      const { prompt } = buildVotingPrompt(ctx);
      expect(prompt).toContain('RECENT EXPERIENCE');
      expect(prompt).toContain('Voted yes on previous proposal');
    });

    it('shows percentage of supply', () => {
      const ctx = makeContext({ tokens: 500, totalSupply: 10000 });
      const { system } = buildVotingPrompt(ctx);
      expect(system).toContain('5.00%');
    });

    it('handles zero total supply', () => {
      const ctx = makeContext({ totalSupply: 0 });
      const { system } = buildVotingPrompt(ctx);
      expect(system).toContain('0.00%');
    });
  });

  describe('parseVoteResponse', () => {
    it('parses valid JSON response', () => {
      const result = parseVoteResponse(
        '{"vote":"yes","reasoning":"Good proposal","confidence":0.85}'
      );
      expect(result.vote).toBe('yes');
      expect(result.reasoning).toBe('Good proposal');
      expect(result.confidence).toBe(0.85);
    });

    it('parses JSON with wrapping text', () => {
      const result = parseVoteResponse(
        'Here is my analysis:\n{"vote":"no","reasoning":"Too expensive","confidence":0.7}'
      );
      expect(result.vote).toBe('no');
      expect(result.reasoning).toBe('Too expensive');
    });

    it('normalizes vote values', () => {
      expect(parseVoteResponse('{"vote":"for"}').vote).toBe('yes');
      expect(parseVoteResponse('{"vote":"approve"}').vote).toBe('yes');
      expect(parseVoteResponse('{"vote":"against"}').vote).toBe('no');
      expect(parseVoteResponse('{"vote":"reject"}').vote).toBe('no');
      expect(parseVoteResponse('{"vote":"maybe"}').vote).toBe('abstain');
    });

    it('falls back to regex extraction', () => {
      const result = parseVoteResponse('I vote YES because this is a great proposal.');
      expect(result.vote).toBe('yes');
      expect(result.reasoning).toContain('great proposal');
    });

    it('extracts NO from text', () => {
      const result = parseVoteResponse('I oppose this proposal. Confidence: 0.8');
      expect(result.vote).toBe('no');
      expect(result.confidence).toBe(0.8);
    });

    it('returns abstain for gibberish', () => {
      const result = parseVoteResponse('asdfghjkl');
      expect(result.vote).toBe('abstain');
    });

    it('clamps confidence to [0, 1]', () => {
      expect(parseVoteResponse('{"vote":"yes","confidence":1.5}').confidence).toBe(1);
      expect(parseVoteResponse('{"vote":"yes","confidence":-0.5}').confidence).toBe(0);
    });

    it('truncates long reasoning', () => {
      const longReasoning = 'x'.repeat(1000);
      const result = parseVoteResponse(`{"vote":"yes","reasoning":"${longReasoning}","confidence":0.5}`);
      expect(result.reasoning.length).toBeLessThanOrEqual(500);
    });
  });

  describe('parseForumPostResponse', () => {
    it('parses valid JSON forum post', () => {
      const result = parseForumPostResponse(
        '{"content":"This is my post","sentiment":0.5}'
      );
      expect(result.content).toBe('This is my post');
      expect(result.sentiment).toBe(0.5);
    });

    it('clamps sentiment to [-1, 1]', () => {
      expect(parseForumPostResponse('{"content":"x","sentiment":2.0}').sentiment).toBe(1);
      expect(parseForumPostResponse('{"content":"x","sentiment":-3}').sentiment).toBe(-1);
    });

    it('falls back to raw text', () => {
      const result = parseForumPostResponse('Just some text without JSON');
      expect(result.content).toBe('Just some text without JSON');
      expect(result.sentiment).toBe(0);
    });
  });

  describe('buildForumPostPrompt', () => {
    it('builds forum post prompt', () => {
      const ctx = {
        agentType: 'Developer',
        agentId: 'dev_0',
        tokens: 100,
        totalSupply: 10000,
        reputation: 50,
        optimism: 0.6,
        totalMembers: 50,
        governanceRuleName: 'majority',
        treasuryFunds: 5000,
        tokenPrice: 1.5,
      };
      const { system, prompt } = buildForumPostPrompt(ctx, 'Treasury Management', 0.5);

      expect(system).toContain('software developer');
      expect(system).toContain('forum post');
      expect(prompt).toContain('Treasury Management');
      expect(prompt).toContain('positive');
    });
  });
});

// =============================================================================
// DAO Briefing & Enriched Prompts
// =============================================================================

describe('DAO Briefing Prompts', () => {
  it('includes decision framework in system prompt', () => {
    const ctx = makeContext();
    const { system } = buildVotingPrompt(ctx);
    expect(system).toContain('DECISION FRAMEWORK');
    expect(system).toContain('CONFIDENCE CALIBRATION');
    expect(system).toContain('0.4');
  });

  it('includes governance rule explanation when provided', () => {
    const ctx = makeContext({
      governanceRuleExplanation: 'Simple majority: a proposal passes if more than 50% of votes are in favor.',
    });
    const { system } = buildVotingPrompt(ctx);
    expect(system).toContain('GOVERNANCE CONTEXT');
    expect(system).toContain('50% of votes');
  });

  it('includes proposal description in user prompt', () => {
    const ctx = makeContext({ proposalDescription: 'Build a new DEX integration for cross-chain swaps' });
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).toContain('Build a new DEX integration');
  });

  it('includes treasury impact analysis', () => {
    const ctx = makeContext({ treasuryPctRequested: 0.20, treasuryTrend: 'depleting' });
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).toContain('TREASURY HEALTH');
    expect(prompt).toContain('20.0%');
    expect(prompt).toContain('HIGH');
    expect(prompt).toContain('depleting');
  });

  it('includes other open proposals for portfolio reasoning', () => {
    const ctx = makeContext({
      otherOpenProposals: [
        { title: 'Marketing Budget', topic: 'Marketing', support: '75%', fundingPct: 0.05 },
        { title: 'Security Audit', topic: 'Infrastructure', support: '90%', fundingPct: 0.03 },
      ],
      activeProposalCount: 3,
      recentPassRate: 0.65,
    });
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).toContain('GOVERNANCE LANDSCAPE');
    expect(prompt).toContain('Marketing Budget');
    expect(prompt).toContain('Security Audit');
    expect(prompt).toContain('3 proposals competing');
    expect(prompt).toContain('65%');
  });

  it('includes forum sentiment', () => {
    const ctx = makeContext({ forumSentiment: -0.45 });
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).toContain('COMMUNITY DISCUSSION');
    expect(prompt).toContain('negative');
  });

  it('includes black swan context', () => {
    const ctx = makeContext({
      blackSwanActive: true,
      blackSwanDescription: 'Market shock is shifting voter sentiment by -30%',
    });
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).toContain('MARKET CONDITIONS');
    expect(prompt).toContain('CRISIS ACTIVE');
    expect(prompt).toContain('-30%');
  });

  it('includes vote track record', () => {
    const ctx = makeContext({
      recentVoteHistory: [
        { proposal: 'Treasury Proposal', vote: 'yes', outcome: 'approved' },
        { proposal: 'Marketing Budget', vote: 'no', outcome: 'rejected' },
      ],
    });
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).toContain('YOUR TRACK RECORD');
    expect(prompt).toContain('Treasury Proposal');
    expect(prompt).toContain('approved');
  });

  it('includes proposal comments', () => {
    const ctx = makeContext({
      proposalComments: [
        { member: 'whale_0', sentiment: 'support' },
        { member: 'dev_1', sentiment: 'oppose' },
      ],
    });
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).toContain('whale_0');
    expect(prompt).toContain('support');
  });

  it('omits sections when data is not available', () => {
    const ctx = makeContext(); // no enriched fields
    const { prompt } = buildVotingPrompt(ctx);
    expect(prompt).not.toContain('TREASURY HEALTH');
    expect(prompt).not.toContain('GOVERNANCE LANDSCAPE');
    expect(prompt).not.toContain('COMMUNITY DISCUSSION');
    expect(prompt).not.toContain('MARKET CONDITIONS');
    expect(prompt).not.toContain('YOUR TRACK RECORD');
  });
});

describe('describeGovernanceRule', () => {
  it('describes known governance rules', () => {
    expect(describeGovernanceRule('majority')).toContain('50%');
    expect(describeGovernanceRule('quadratic')).toContain('square root');
    expect(describeGovernanceRule('conviction')).toContain('Sustained');
    expect(describeGovernanceRule('optimistic')).toContain('veto');
    expect(describeGovernanceRule('bicameral')).toContain('two chambers');
  });

  it('provides generic description for unknown rules', () => {
    const desc = describeGovernanceRule('exotic_rule');
    expect(desc).toContain('exotic_rule');
    expect(desc).toContain('governance');
  });
});

describe('Confidence threshold safety', () => {
  it('regex fallback default confidence is below MIN_LLM_CONFIDENCE (0.4)', () => {
    // No explicit confidence in text → should default to 0.3
    const result = parseVoteResponse('I support this proposal wholeheartedly.');
    expect(result.confidence).toBe(0.3);
    // 0.3 < 0.4 (MIN_LLM_CONFIDENCE), so this would fall back to rule-based voting
  });

  it('explicit confidence in regex still parses correctly', () => {
    const result = parseVoteResponse('I oppose this. Confidence: 0.85');
    expect(result.confidence).toBe(0.85);
  });
});

// =============================================================================
// Proposal Response Parsing
// =============================================================================

describe('parseProposalResponse', () => {
  it('parses valid proposal JSON', () => {
    const raw = '{"shouldPropose":true,"title":"Fund Dev Team","topic":"Funding","description":"Hire two devs","fundingPct":0.03}';
    const result = parseProposalResponse(raw);
    expect(result.shouldPropose).toBe(true);
    expect(result.title).toBe('Fund Dev Team');
    expect(result.topic).toBe('Funding');
    expect(result.description).toBe('Hire two devs');
    expect(result.fundingPct).toBe(0.03);
  });

  it('returns no-proposal when shouldPropose is false', () => {
    const raw = '{"shouldPropose":false,"title":"","topic":"","description":"","fundingPct":0}';
    const result = parseProposalResponse(raw);
    expect(result.shouldPropose).toBe(false);
    expect(result.title).toBe('');
  });

  it('normalizes topic to valid set', () => {
    const raw = '{"shouldPropose":true,"title":"Test","topic":"development","description":"x","fundingPct":0.01}';
    const result = parseProposalResponse(raw);
    expect(result.topic).toBe('Development'); // case-normalized
  });

  it('defaults unknown topics to Governance', () => {
    const raw = '{"shouldPropose":true,"title":"Test","topic":"SomethingWeird","description":"x","fundingPct":0.01}';
    const result = parseProposalResponse(raw);
    expect(result.topic).toBe('Governance');
  });

  it('clamps fundingPct to [0, 0.05]', () => {
    const over = '{"shouldPropose":true,"title":"T","topic":"Funding","description":"x","fundingPct":0.5}';
    expect(parseProposalResponse(over).fundingPct).toBe(0.05);

    const under = '{"shouldPropose":true,"title":"T","topic":"Funding","description":"x","fundingPct":-1}';
    expect(parseProposalResponse(under).fundingPct).toBe(0);
  });

  it('truncates long title and description', () => {
    const longTitle = 'A'.repeat(300);
    const longDesc = 'B'.repeat(600);
    const raw = `{"shouldPropose":true,"title":"${longTitle}","topic":"Funding","description":"${longDesc}","fundingPct":0.01}`;
    const result = parseProposalResponse(raw);
    expect(result.title.length).toBeLessThanOrEqual(200);
    expect(result.description.length).toBeLessThanOrEqual(500);
  });

  it('handles malformed JSON gracefully', () => {
    const result = parseProposalResponse('not json at all');
    expect(result.shouldPropose).toBe(false);
    expect(result.title).toBe('');
  });

  it('handles NaN fundingPct', () => {
    const raw = '{"shouldPropose":true,"title":"T","topic":"Funding","description":"x","fundingPct":"abc"}';
    const result = parseProposalResponse(raw);
    expect(result.fundingPct).toBe(0);
  });

  it('generates default title when missing', () => {
    const raw = '{"shouldPropose":true,"topic":"Funding","description":"x","fundingPct":0.01}';
    const result = parseProposalResponse(raw);
    expect(result.title).toBe('Funding Proposal');
  });
});

// =============================================================================
// Response Cache
// =============================================================================

describe('LLMResponseCache', () => {
  let cache: LLMResponseCache;

  beforeEach(() => {
    cache = new LLMResponseCache();
  });

  it('stores and retrieves entries', () => {
    const key = LLMResponseCache.makeKey('model', 'sys', 'prompt', 42, 0.3);
    cache.set(key, '{"vote":"yes"}', 'model');
    expect(cache.get(key)).toBe('{"vote":"yes"}');
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('tracks hit/miss statistics', () => {
    const key = LLMResponseCache.makeKey('m', 's', 'p');
    cache.set(key, 'response', 'm');

    cache.get(key); // hit
    cache.get('miss1'); // miss
    cache.get(key); // hit

    expect(cache.stats.hits).toBe(2);
    expect(cache.stats.misses).toBe(1);
    expect(cache.stats.hitRate).toBeCloseTo(2 / 3, 5);
    expect(cache.stats.size).toBe(1);
  });

  it('generates deterministic keys', () => {
    const k1 = LLMResponseCache.makeKey('model', 'sys', 'prompt', 42, 0.3);
    const k2 = LLMResponseCache.makeKey('model', 'sys', 'prompt', 42, 0.3);
    const k3 = LLMResponseCache.makeKey('model', 'sys', 'different', 42, 0.3);

    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
  });

  it('clears all entries', () => {
    cache.set('k1', 'v1', 'm');
    cache.set('k2', 'v2', 'm');
    cache.clear();
    expect(cache.stats.size).toBe(0);
  });

  it('exports and imports', () => {
    cache.set('k1', 'v1', 'm1');
    cache.set('k2', 'v2', 'm2');

    const exported = cache.export();
    const newCache = new LLMResponseCache();
    newCache.import(exported);

    expect(newCache.get('k1')).toBe('v1');
    expect(newCache.get('k2')).toBe('v2');
  });

  it('resetStats clears counters', () => {
    cache.get('miss'); // miss
    cache.resetStats();
    expect(cache.stats.hits).toBe(0);
    expect(cache.stats.misses).toBe(0);
  });
});

// =============================================================================
// Agent Memory
// =============================================================================

describe('AgentMemory', () => {
  let memory: AgentMemory;

  beforeEach(() => {
    memory = new AgentMemory(5, 10, 0.7); // Small sizes for testing
  });

  it('adds entries to short-term', () => {
    memory.add({
      type: 'vote',
      step: 1,
      summary: 'Voted yes',
      importance: 0.5,
      tags: ['governance'],
    });
    expect(memory.stats.shortTermCount).toBe(1);
  });

  it('evicts oldest short-term entries on overflow', () => {
    for (let i = 0; i < 7; i++) {
      memory.add({
        type: 'vote',
        step: i,
        summary: `Event ${i}`,
        importance: 0.3,
        tags: [],
      });
    }
    // maxShortTerm = 5, so oldest 2 should be evicted
    expect(memory.stats.shortTermCount).toBe(5);
    expect(memory.getShortTerm()[0].summary).toBe('Event 2');
  });

  it('auto-promotes high-importance entries to long-term', () => {
    memory.add({
      type: 'proposal_outcome',
      step: 1,
      summary: 'Important event',
      importance: 0.9, // above threshold (0.7)
      tags: ['governance'],
    });
    expect(memory.stats.longTermCount).toBe(1);
    expect(memory.stats.shortTermCount).toBe(1);
  });

  it('does not promote low-importance entries', () => {
    memory.add({
      type: 'vote',
      step: 1,
      summary: 'Routine vote',
      importance: 0.3,
      tags: [],
    });
    expect(memory.stats.longTermCount).toBe(0);
  });

  it('retrieves long-term memories by tags', () => {
    memory.add({
      type: 'vote',
      step: 1,
      summary: 'Governance vote',
      importance: 0.9,
      tags: ['governance'],
    });
    memory.add({
      type: 'vote',
      step: 2,
      summary: 'Funding vote',
      importance: 0.8,
      tags: ['funding'],
    });

    const results = memory.retrieveByTags(['governance'], 5);
    expect(results).toHaveLength(1);
    expect(results[0].summary).toBe('Governance vote');
  });

  it('builds prompt context', () => {
    memory.add({
      type: 'vote',
      step: 1,
      summary: 'Voted yes on treasury proposal',
      importance: 0.5,
      tags: ['treasury'],
    });

    const ctx = memory.buildPromptContext(['treasury']);
    expect(ctx).toContain('Step 1');
    expect(ctx).toContain('Voted yes on treasury proposal');
  });

  it('returns empty string when no memories', () => {
    expect(memory.buildPromptContext()).toBe('');
  });

  it('exports and imports state', () => {
    memory.add({
      type: 'vote',
      step: 1,
      summary: 'Test',
      importance: 0.9,
      tags: [],
    });

    const exported = memory.export();
    const newMemory = new AgentMemory();
    newMemory.import(exported);
    expect(newMemory.stats.shortTermCount).toBe(1);
    expect(newMemory.stats.longTermCount).toBe(1);
  });

  it('clears all memory', () => {
    memory.add({ type: 'vote', step: 1, summary: 'x', importance: 0.9, tags: [] });
    memory.clear();
    expect(memory.stats.shortTermCount).toBe(0);
    expect(memory.stats.longTermCount).toBe(0);
  });

  it('deduplicates long-term entries', () => {
    memory.add({ type: 'vote', step: 1, summary: 'Same event', importance: 0.9, tags: [] });
    memory.add({ type: 'vote', step: 2, summary: 'Same event', importance: 0.9, tags: [] });
    expect(memory.stats.longTermCount).toBe(1);
  });
});

// =============================================================================
// LLM Voting Behavior
// =============================================================================

describe('LLMVotingBehavior', () => {
  let mockClient: OllamaClient;
  let cache: LLMResponseCache;

  beforeEach(() => {
    mockClient = {
      generate: vi.fn().mockResolvedValue({
        model: 'test',
        response: '{"vote":"yes","reasoning":"Solid proposal","confidence":0.85}',
        done: true,
      } as OllamaGenerateResponse),
      totalRequests: 0,
      totalErrors: 0,
      totalLatencyMs: 0,
    } as unknown as OllamaClient;

    cache = new LLMResponseCache();
  });

  it('pre-computes vote decisions', async () => {
    const behavior = new LLMVotingBehavior(mockClient, cache, 'test-model');
    const ctx = makeContext();

    await behavior.prepareVoteDecisions(
      [{ proposalId: 'p1', context: ctx }],
      10
    );

    const decision = behavior.getDecision('p1');
    expect(decision).toBeDefined();
    expect(decision!.vote).toBe('yes');
    expect(decision!.reasoning).toBe('Solid proposal');
    expect(decision!.confidence).toBe(0.85);
  });

  it('uses cache for repeated requests', async () => {
    const behavior = new LLMVotingBehavior(mockClient, cache, 'test-model');
    const ctx = makeContext();

    // First call: hits LLM
    await behavior.prepareVoteDecisions([{ proposalId: 'p1', context: ctx }], 10);
    expect(mockClient.generate).toHaveBeenCalledTimes(1);

    // Second call: should use cache
    behavior.clearDecisions();
    await behavior.prepareVoteDecisions([{ proposalId: 'p1', context: ctx }], 11);
    // Still just 1 LLM call
    expect(mockClient.generate).toHaveBeenCalledTimes(1);

    const decision = behavior.getDecision('p1');
    expect(decision!.vote).toBe('yes');
  });

  it('returns abstain on LLM failure', async () => {
    const failingClient = {
      generate: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    } as unknown as OllamaClient;

    const behavior = new LLMVotingBehavior(failingClient, null, 'test-model');
    const ctx = makeContext();

    await behavior.prepareVoteDecisions([{ proposalId: 'p1', context: ctx }], 10);

    const decision = behavior.getDecision('p1');
    expect(decision).toBeDefined();
    expect(decision!.vote).toBe('abstain');
    expect(decision!.confidence).toBe(0);
  });

  it('returns undefined for unknown proposals', () => {
    const behavior = new LLMVotingBehavior(mockClient, null, 'test-model');
    expect(behavior.getDecision('nonexistent')).toBeUndefined();
  });

  it('tracks vote history', async () => {
    const behavior = new LLMVotingBehavior(mockClient, null, 'test-model');
    const ctx = makeContext();

    await behavior.prepareVoteDecisions(
      [
        { proposalId: 'p1', context: ctx },
        { proposalId: 'p2', context: { ...ctx, proposal: { ...ctx.proposal, id: 'p2' } } },
      ],
      10
    );

    expect(behavior.voteHistory).toHaveLength(2);
    expect(behavior.voteHistory[0].proposalId).toBe('p1');
    expect(behavior.voteHistory[0].cached).toBe(false);
  });

  it('provides metrics', async () => {
    const behavior = new LLMVotingBehavior(mockClient, cache, 'test-model');
    const ctx = makeContext();

    await behavior.prepareVoteDecisions([{ proposalId: 'p1', context: ctx }], 10);

    // Second call uses cache
    behavior.clearDecisions();
    await behavior.prepareVoteDecisions([{ proposalId: 'p1', context: ctx }], 11);

    const metrics = behavior.getMetrics();
    expect(metrics.totalDecisions).toBe(2);
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.cacheMisses).toBe(1);
  });

  it('clears decisions between steps', async () => {
    const behavior = new LLMVotingBehavior(mockClient, null, 'test-model');
    const ctx = makeContext();

    await behavior.prepareVoteDecisions([{ proposalId: 'p1', context: ctx }], 10);
    expect(behavior.hasDecisions()).toBe(true);

    behavior.clearDecisions();
    expect(behavior.hasDecisions()).toBe(false);
  });

  it('includes memory context in prompts', async () => {
    const behavior = new LLMVotingBehavior(mockClient, null, 'test-model');
    const ctx = makeContext();
    const memory = new AgentMemory();
    memory.add({
      type: 'vote',
      step: 5,
      summary: 'Voted no on bad proposal',
      importance: 0.6,
      tags: ['funding'],
    });

    await behavior.prepareVoteDecisions(
      [{ proposalId: 'p1', context: ctx }],
      10,
      memory
    );

    // Check that generate was called with memory-injected prompt
    const generateCall = (mockClient.generate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(generateCall.prompt).toContain('Voted no on bad proposal');
  });
});
