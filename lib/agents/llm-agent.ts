/**
 * LLM-Powered Agent
 *
 * Extends DAOMember with LLM-based voting decisions. Uses composition
 * pattern: LLMVotingBehavior pre-computes decisions asynchronously,
 * decideVote() reads them synchronously.
 *
 * Falls back to rule-based voting when LLM is unavailable or low-confidence.
 */

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import type { OllamaClient } from '../llm/ollama-client';
import { LLMResponseCache } from '../llm/response-cache';
import { LLMVotingBehavior } from '../llm/llm-voting-mixin';
import { AgentMemory } from '../llm/agent-memory';
import type { PromptContext, ProposalGenerationContext, ProposalIdea } from '../llm/prompt-templates';
import { buildProposalPrompt, parseProposalResponse, describeGovernanceRule } from '../llm/prompt-templates';
import { createRandomProposal } from '../utils/proposal-utils';
import { random } from '../utils/random';
import { logger } from '../utils/logger';
import { settings } from '../config/settings';

/** Minimum confidence to use LLM decision instead of rule-based fallback */
const MIN_LLM_CONFIDENCE = 0.4;

export class LLMAgent extends DAOMember {
  /** LLM voting behavior (initialized via initLLM) */
  llmVoting: LLMVotingBehavior | null = null;

  /** Agent memory for context-aware reasoning */
  memory: AgentMemory = new AgentMemory();

  /** Whether LLM is initialized and ready */
  private llmReady: boolean = false;

  /** Last reasoning for debugging/metrics */
  lastReasoning: string = '';

  /** Pending proposal from async LLM generation (created in step()) */
  private pendingProposal: ProposalIdea | null = null;

  /** Ollama client ref for proposal generation */
  private client: OllamaClient | null = null;
  /** Cache ref for proposal generation */
  private cache: LLMResponseCache | null = null;
  /** Model name for LLM calls */
  private llmModel: string = '';
  /** Temperature for LLM calls */
  private llmTemperature: number = 0.3;
  /** Max tokens for LLM calls */
  private llmMaxTokens: number = 256;
  /** Seed for reproducibility */
  private llmSeed?: number;
  /** Whether to enable thinking/chain-of-thought mode */
  private llmThink: boolean = false;
  /** Ollama context window size */
  private llmContextSize: number = 0;

  /** How many proposals this agent has created */
  proposalsCreated: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
  }

  /**
   * Initialize LLM capabilities. Called by simulation after construction.
   */
  initLLM(
    client: OllamaClient,
    cache: LLMResponseCache | null,
    model: string,
    temperature: number = 0.3,
    maxTokens: number = 256,
    seed?: number,
    think: boolean = false,
    contextSize: number = 0
  ): void {
    this.llmVoting = new LLMVotingBehavior(
      client,
      cache,
      model,
      temperature,
      maxTokens,
      seed,
      think,
      contextSize
    );
    this.client = client;
    this.cache = cache;
    this.llmModel = model;
    this.llmTemperature = temperature;
    this.llmMaxTokens = maxTokens;
    this.llmSeed = seed;
    this.llmThink = think;
    this.llmContextSize = contextSize;
    this.llmReady = true;
  }

  /**
   * Async preparation step: pre-compute LLM vote decisions for all
   * open proposals this agent hasn't voted on yet.
   * Called by simulation.prepareLLMAgentDecisions() before schedule.step().
   */
  async prepareStep(): Promise<void> {
    if (!this.llmReady || !this.llmVoting || !this.model.dao) return;

    // 1. Pre-compute vote decisions for open proposals
    const openProposals = this.model.dao.getOpenProposals();
    const unvotedProposals = openProposals.filter(
      (p) => !this.votes.has(p.uniqueId) && p.status === 'open'
    );

    if (unvotedProposals.length > 0) {
      const contexts = unvotedProposals.map((p) => ({
        proposalId: p.uniqueId,
        context: this.buildPromptContext(p),
      }));

      await this.llmVoting.prepareVoteDecisions(
        contexts,
        this.model.currentStep,
        this.memory
      );
    }

    // 2. Consider proposing (low probability per step, respect open cap)
    await this.prepareProposal();
  }

  /**
   * Override decideVote to use LLM decisions when available.
   * Falls back to rule-based voting if no LLM decision or low confidence.
   */
  override decideVote(topic: Proposal | string): 'yes' | 'no' {
    if (
      typeof topic === 'object' &&
      topic !== null &&
      'uniqueId' in topic &&
      this.llmVoting
    ) {
      const proposal = topic as Proposal;
      const decision = this.llmVoting.getDecision(proposal.uniqueId);

      if (decision && decision.confidence >= MIN_LLM_CONFIDENCE && decision.vote !== 'abstain') {
        this.lastReasoning = decision.reasoning;

        // Record vote memory
        this.memory.add({
          type: 'vote',
          step: this.model.currentStep,
          summary: `Voted ${decision.vote} on "${proposal.topic || 'proposal'}": ${decision.reasoning}`,
          importance: 0.6,
          tags: [proposal.topic?.toLowerCase() || 'governance'],
          relatedIds: [proposal.uniqueId],
        });

        return decision.vote;
      }
    }

    // Rule-based fallback
    this.lastReasoning = '';
    return super.decideVote(topic);
  }

  /**
   * Standard step: create proposals, vote, and comment
   */
  step(): void {
    super.step();

    // Create LLM-generated proposal if one was pre-computed
    if (this.pendingProposal && this.pendingProposal.shouldPropose && this.model.dao) {
      this.createLLMProposal(this.pendingProposal);
    }
    this.pendingProposal = null; // Always clear to prevent stale proposals

    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.3)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  /**
   * Reset transient state between episodes.
   * Memory is preserved for cross-episode learning.
   */
  endEpisode(): void {
    this.pendingProposal = null;
    this.lastReasoning = '';
    this.proposalsCreated = 0;
    if (this.llmVoting) {
      this.llmVoting.clearDecisions();
    }
  }

  /**
   * Record proposal outcome in memory
   */
  recordProposalOutcome(proposal: Proposal, passed: boolean): void {
    const myVote = this.votes.get(proposal.uniqueId);
    if (!myVote) return;

    const votedFor = myVote.vote;
    const withMajority = (votedFor && passed) || (!votedFor && !passed);

    this.memory.add({
      type: 'proposal_outcome',
      step: this.model.currentStep,
      summary: `Proposal "${proposal.topic || 'unknown'}" ${passed ? 'passed' : 'failed'}. I voted ${withMajority ? 'with' : 'against'} the majority.`,
      importance: 0.8,
      tags: [proposal.topic?.toLowerCase() || 'governance'],
      relatedIds: [proposal.uniqueId],
    });
  }

  /**
   * Ask the LLM whether to create a proposal this step.
   * Uses a probability gate (same as ProposalCreator) and open proposal cap.
   */
  private async prepareProposal(): Promise<void> {
    if (!this.client || !this.model.dao) return;

    this.pendingProposal = null;

    // Probability gate: ~0.5% per step per agent (matches ProposalCreator rate)
    const baseProbability = settings.proposal_creation_probability;
    if (random() > baseProbability) return;

    // Cap open proposals at 5
    const openCount = this.model.dao.getOpenProposals().length;
    if (openCount >= 5) return;

    const ctx = this.buildProposalContext();
    // Include memory context for more coherent proposal generation
    ctx.memoryContext = this.memory.buildPromptContext(['proposal_created', 'treasury_event']);
    const { system, prompt } = buildProposalPrompt(ctx);

    // Check cache
    let responseText: string | undefined;
    let cacheKey: string | undefined;

    if (this.cache) {
      cacheKey = LLMResponseCache.makeKey(
        this.llmModel,
        system,
        prompt,
        this.llmSeed,
        this.llmTemperature
      );
      responseText = this.cache.get(cacheKey);
    }

    if (responseText === undefined) {
      try {
        const response = await this.client.generate({
          model: this.llmModel,
          system,
          prompt,
          temperature: this.llmTemperature,
          seed: this.llmSeed,
          format: 'json',
          think: this.llmThink,
          options: {
            num_predict: this.llmMaxTokens,
            ...(this.llmContextSize > 0 ? { num_ctx: this.llmContextSize } : {}),
          },
        });
        responseText = response.response;

        if (this.cache && cacheKey) {
          this.cache.set(cacheKey, responseText, this.llmModel);
        }
      } catch (err) {
        logger.debug(`LLM proposal generation failed for ${this.uniqueId}: ${err}`);
        return;
      }
    }

    const idea = parseProposalResponse(responseText);
    if (idea.shouldPropose) {
      this.pendingProposal = idea;
    }
  }

  /**
   * Create an actual proposal from an LLM-generated idea
   */
  private createLLMProposal(idea: ProposalIdea): void {
    const dao = this.model.dao;
    if (!dao) return;

    const treasuryFunds = Math.max(dao.treasury?.funds || 0, 1000);
    const fundingGoal = Math.round(treasuryFunds * idea.fundingPct * 100) / 100;

    // Use createRandomProposal for proper multi-stage/bond handling,
    // but override the title and topic with LLM-generated content
    const fundingRange: [number, number] = [idea.fundingPct, idea.fundingPct];
    const proposal = createRandomProposal(
      dao,
      this,
      idea.title,
      idea.topic,
      null,
      undefined,
      fundingRange
    );
    proposal.description = idea.description;

    dao.addProposal(proposal);
    this.markActive();
    this.proposalsCreated++;

    // Record in memory
    this.memory.add({
      type: 'observation',
      step: this.model.currentStep,
      summary: `Created proposal "${idea.title}" (${idea.topic}, requesting ${fundingGoal} tokens): ${idea.description}`,
      importance: 0.8,
      tags: [idea.topic.toLowerCase(), 'proposal_created'],
    });

    logger.debug(
      `LLM agent ${this.uniqueId} created proposal: "${idea.title}" (${idea.topic}, ${fundingGoal} tokens)`
    );
  }

  /**
   * Build context for proposal generation prompt
   */
  private buildProposalContext(): ProposalGenerationContext {
    const dao = this.model.dao;
    const totalSupply = dao
      ? dao.members.reduce((sum, m) => sum + m.tokens, 0)
      : 0;

    // Gather recent proposal topics
    const recentProposals = dao
      ? dao.proposals.slice(-10)
      : [];
    const recentTopics = [...new Set(
      recentProposals.map((p) => p.topic).filter(Boolean)
    )];

    // Compute recent pass rate
    const resolved = dao
      ? dao.proposals.filter((p) => p.status === 'approved' || p.status === 'rejected')
      : [];
    const recentResolved = resolved.slice(-10);
    const passRate =
      recentResolved.length > 0
        ? recentResolved.filter((p) => p.status === 'approved').length / recentResolved.length
        : 0.5;

    return {
      agentType: this.constructor.name,
      agentId: this.uniqueId,
      tokens: this.tokens,
      totalSupply,
      reputation: this.reputation,
      optimism: this.optimism,
      totalMembers: dao?.members.length ?? 0,
      governanceRuleName: dao?.governanceRuleName || 'majority',
      treasuryFunds: dao?.treasury?.funds ?? 0,
      tokenPrice: dao?.treasury?.getTokenPrice('DAO_TOKEN') ?? 1,
      openProposalCount: dao ? dao.getOpenProposals().length : 0,
      recentTopics,
      recentPassRate: passRate,
    };
  }

  /**
   * Build a full DAO briefing PromptContext from the agent's current state
   * and a proposal. Populates all available context for LLM reasoning.
   */
  private buildPromptContext(proposal: Proposal): PromptContext {
    const dao = this.model.dao;
    const totalSupply = dao
      ? dao.members.reduce((sum, m) => sum + m.tokens, 0)
      : 0;

    const stepsRemaining = Math.max(
      0,
      proposal.creationTime + proposal.votingPeriod - this.model.currentStep
    );

    const treasuryFunds = dao?.treasury?.funds ?? 0;

    // === Treasury analysis ===
    const treasuryPctRequested = treasuryFunds > 0
      ? proposal.fundingGoal / treasuryFunds
      : 0;

    // === Recent pass rate (last 20 resolved proposals) ===
    const resolved = dao
      ? dao.proposals.filter(p => p.status === 'approved' || p.status === 'rejected')
      : [];
    const recentResolved = resolved.slice(-20);
    const recentPassRate = recentResolved.length > 0
      ? recentResolved.filter(p => p.status === 'approved').length / recentResolved.length
      : undefined;

    // === Other open proposals (for portfolio reasoning) ===
    const openProposals = dao ? dao.getOpenProposals() : [];
    const otherOpen = openProposals
      .filter(p => p.uniqueId !== proposal.uniqueId)
      .slice(0, 5);
    const otherOpenProposals = otherOpen.length > 0
      ? otherOpen.map(p => {
          const tv = p.votesFor + p.votesAgainst;
          const support = tv > 0 ? `${((p.votesFor / tv) * 100).toFixed(0)}%` : 'no votes';
          return {
            title: p.topic || p.title || `Proposal ${p.uniqueId}`,
            topic: p.topic || 'General',
            support,
            fundingPct: treasuryFunds > 0 ? p.fundingGoal / treasuryFunds : 0,
          };
        })
      : undefined;

    // === Proposal comments (last 5) ===
    const proposalComments = proposal.comments.length > 0
      ? proposal.comments.slice(-5)
      : undefined;

    // === Forum sentiment ===
    const forumSentiment = this.model.forumSimulation
      ? this.model.forumSimulation.getVotingBias(proposal.uniqueId)
      : undefined;

    // === Black swan context ===
    const beliefShift = this.model.currentBeliefShift ?? 0;
    const blackSwanActive = beliefShift !== 0;
    const blackSwanDescription = blackSwanActive
      ? `Market shock is shifting voter sentiment by ${beliefShift > 0 ? '+' : ''}${(beliefShift * 100).toFixed(0)}%`
      : undefined;

    // === Agent's vote track record (last 10) ===
    const recentVoteHistory: Array<{ proposal: string; vote: string; outcome: string }> = [];
    if (dao) {
      const resolvedProposals = dao.proposals.filter(
        p => p.status === 'approved' || p.status === 'rejected' || p.status === 'expired'
      ).slice(-10);
      for (const p of resolvedProposals) {
        const myVote = this.votes.get(p.uniqueId);
        if (myVote) {
          recentVoteHistory.push({
            proposal: p.topic || p.title || p.uniqueId,
            vote: myVote.vote ? 'yes' : 'no',
            outcome: p.status,
          });
        }
      }
    }

    // === Governance rule explanation ===
    const ruleName = dao?.governanceRuleName || 'majority';
    const governanceRuleExplanation = describeGovernanceRule(ruleName);

    return {
      agentType: this.constructor.name,
      agentId: this.uniqueId,
      tokens: this.tokens,
      totalSupply,
      reputation: this.reputation,
      optimism: this.optimism,
      totalMembers: dao?.members.length ?? 0,
      governanceRuleName: ruleName,
      proposal: {
        id: proposal.uniqueId,
        title: proposal.topic || `Proposal ${proposal.uniqueId}`,
        topic: proposal.topic || '',
        fundingGoal: proposal.fundingGoal,
        currentFunding: proposal.currentFunding,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst,
        status: proposal.status,
        stepsRemaining,
      },
      treasuryFunds,
      tokenPrice: dao?.treasury?.getTokenPrice('DAO_TOKEN') ?? 1,
      // DAO briefing fields
      proposalDescription: proposal.description || undefined,
      proposalComments,
      treasuryPctRequested,
      recentPassRate,
      governanceRuleExplanation,
      activeProposalCount: openProposals.length,
      otherOpenProposals,
      forumSentiment: forumSentiment !== undefined && forumSentiment !== 0 ? forumSentiment : undefined,
      blackSwanActive: blackSwanActive || undefined,
      blackSwanDescription,
      recentVoteHistory: recentVoteHistory.length > 0 ? recentVoteHistory : undefined,
    };
  }
}
