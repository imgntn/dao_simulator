/**
 * LLM Voting Behavior
 *
 * Composition-based mixin that pre-computes LLM vote decisions for all
 * open proposals in an async batch, then provides synchronous lookup
 * for use in decideVote().
 *
 * Pattern follows GovernanceExpert: pre-compute in step(), read in decideVote().
 */

import type { OllamaClient } from './ollama-client';
import { LLMResponseCache } from './response-cache';
import type { AgentMemory } from './agent-memory';
import type { PromptContext, VoteDecision } from './prompt-templates';
import { buildVotingPrompt, parseVoteResponse } from './prompt-templates';
import { logger } from '../utils/logger';

export interface LLMVoteRecord {
  proposalId: string;
  decision: VoteDecision;
  model: string;
  cached: boolean;
  latencyMs: number;
  step: number;
}

/** Maximum vote history entries to retain */
const MAX_VOTE_HISTORY = 1000;

export class LLMVotingBehavior {
  private client: OllamaClient;
  private cache: LLMResponseCache | null;
  private model: string;
  private temperature: number;
  private seed?: number;
  private maxTokens: number;
  private think: boolean;
  private contextSize: number;

  /** Pre-computed decisions for the current step */
  private decisions: Map<string, VoteDecision> = new Map();

  /** Historical vote records for metrics (capped at MAX_VOTE_HISTORY) */
  voteHistory: LLMVoteRecord[] = [];

  /** Running counters for efficient metric computation */
  private _totalDecisions: number = 0;
  private _cacheHits: number = 0;
  private _totalLatencyMs: number = 0;
  private _nonCachedCount: number = 0;

  constructor(
    client: OllamaClient,
    cache: LLMResponseCache | null,
    model: string,
    temperature: number = 0.3,
    maxTokens: number = 256,
    seed?: number,
    think: boolean = false,
    contextSize: number = 0
  ) {
    this.client = client;
    this.cache = cache;
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.seed = seed;
    this.think = think;
    this.contextSize = contextSize;
  }

  /**
   * Pre-compute vote decisions for multiple proposals in batch.
   * Called before the agent's step() so that decideVote() can read synchronously.
   */
  async prepareVoteDecisions(
    contexts: Array<{ proposalId: string; context: PromptContext }>,
    currentStep: number,
    memory?: AgentMemory
  ): Promise<void> {
    this.decisions.clear();

    for (const { proposalId, context } of contexts) {
      // Add memory context if available
      if (memory) {
        const tags = context.proposal.topic
          ? [context.proposal.topic.toLowerCase()]
          : [];
        context.memoryContext = memory.buildPromptContext(tags);
      }

      const { system, prompt } = buildVotingPrompt(context);

      // Compute cache key once for both lookup and storage
      const cacheKey = this.cache
        ? LLMResponseCache.makeKey(this.model, system, prompt, this.seed, this.temperature)
        : undefined;

      // Check cache first
      if (this.cache && cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) {
          const decision = parseVoteResponse(cached);
          this.decisions.set(proposalId, decision);
          this.recordVoteHistory({
            proposalId,
            decision,
            model: this.model,
            cached: true,
            latencyMs: 0,
            step: currentStep,
          });
          continue;
        }
      }

      // Call LLM
      const startTime = Date.now();
      try {
        const response = await this.client.generate({
          model: this.model,
          system,
          prompt,
          temperature: this.temperature,
          seed: this.seed,
          format: 'json',
          think: this.think,
          options: {
            num_predict: this.maxTokens,
            ...(this.contextSize > 0 ? { num_ctx: this.contextSize } : {}),
          },
        });

        const decision = parseVoteResponse(response.response);
        this.decisions.set(proposalId, decision);

        // Cache the response (reuse cacheKey from lookup above)
        if (this.cache && cacheKey) {
          this.cache.set(cacheKey, response.response, this.model);
        }

        this.recordVoteHistory({
          proposalId,
          decision,
          model: this.model,
          cached: false,
          latencyMs: Date.now() - startTime,
          step: currentStep,
        });
      } catch (err) {
        logger.debug(
          `LLM vote decision failed for proposal ${proposalId}: ${err}`
        );
        // On failure, store abstain with zero confidence → triggers rule-based fallback
        const failDecision: VoteDecision = {
          vote: 'abstain',
          reasoning: 'LLM unavailable',
          confidence: 0,
        };
        this.decisions.set(proposalId, failDecision);

        this.recordVoteHistory({
          proposalId,
          decision: failDecision,
          model: this.model,
          cached: false,
          latencyMs: Date.now() - startTime,
          step: currentStep,
        });
      }
    }
  }

  /**
   * Get a pre-computed decision for a proposal.
   * Returns undefined if no decision was pre-computed.
   */
  getDecision(proposalId: string): VoteDecision | undefined {
    return this.decisions.get(proposalId);
  }

  /**
   * Check if any decisions are available
   */
  hasDecisions(): boolean {
    return this.decisions.size > 0;
  }

  /**
   * Clear pre-computed decisions (call at end of step)
   */
  clearDecisions(): void {
    this.decisions.clear();
  }

  /**
   * Get LLM metrics summary (uses running counters for efficiency)
   */
  getMetrics(): {
    totalDecisions: number;
    cacheHits: number;
    cacheMisses: number;
    avgLatencyMs: number;
  } {
    return {
      totalDecisions: this._totalDecisions,
      cacheHits: this._cacheHits,
      cacheMisses: this._totalDecisions - this._cacheHits,
      avgLatencyMs: this._nonCachedCount > 0
        ? this._totalLatencyMs / this._nonCachedCount
        : 0,
    };
  }

  /**
   * Record a vote history entry, maintaining the cap and running counters
   */
  private recordVoteHistory(record: LLMVoteRecord): void {
    this._totalDecisions++;
    if (record.cached) {
      this._cacheHits++;
    } else {
      this._nonCachedCount++;
      this._totalLatencyMs += record.latencyMs;
    }

    this.voteHistory.push(record);
    if (this.voteHistory.length > MAX_VOTE_HISTORY) {
      this.voteHistory = this.voteHistory.slice(-MAX_VOTE_HISTORY);
    }
  }
}
