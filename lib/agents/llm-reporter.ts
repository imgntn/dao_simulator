/**
 * LLM Reporter Agent
 *
 * An LLM-powered agent that observes the simulation and generates
 * periodic "news reports" summarizing what's happening in the DAO.
 * Reports cover governance activity, treasury changes, notable votes,
 * and emerging trends.
 */

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import type { OllamaClient } from '../llm/ollama-client';
import { LLMResponseCache } from '../llm/response-cache';
import { logger } from '../utils/logger';
import { random } from '../utils/random';

export interface NewsReport {
  step: number;
  headline: string;
  body: string;
  topics: string[];
  sentiment: number; // -1 to 1
}

/** How often (in steps) the reporter generates a report */
const DEFAULT_REPORT_INTERVAL = 50;

export class LLMReporter extends DAOMember {
  /** Ollama client for LLM calls */
  private client: OllamaClient | null = null;
  /** Response cache */
  private cache: LLMResponseCache | null = null;
  /** Model to use for report generation */
  private llmModel: string = '';
  /** Temperature for generation */
  private temperature: number = 0.5;
  /** Max tokens for generation */
  private maxTokens: number = 512;
  /** Seed for reproducibility */
  private llmSeed?: number;
  /** Whether LLM is initialized */
  private llmReady: boolean = false;

  /** Generated news reports */
  reports: NewsReport[] = [];
  /** How often to generate reports (in steps) */
  reportInterval: number = DEFAULT_REPORT_INTERVAL;
  /** Pending report from async preparation */
  private pendingReport: NewsReport | null = null;

  /** Track previous state for delta reporting */
  private prevTreasuryFunds: number = 0;
  private prevMemberCount: number = 0;
  private prevProposalCount: number = 0;

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
   * Initialize LLM capabilities
   */
  initLLM(
    client: OllamaClient,
    cache: LLMResponseCache | null,
    llmModel: string,
    temperature: number = 0.5,
    maxTokens: number = 512,
    seed?: number
  ): void {
    this.client = client;
    this.cache = cache;
    this.llmModel = llmModel;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.llmSeed = seed;
    this.llmReady = true;

    // Initialize delta tracking from current DAO state to avoid misleading first report
    if (this.model.dao) {
      this.prevTreasuryFunds = this.model.dao.treasury.funds;
      this.prevMemberCount = this.model.dao.members.length;
      this.prevProposalCount = this.model.dao.proposals.length;
    }
  }

  /**
   * Async preparation: generate a news report if it's time.
   * Called by simulation.prepareLLMAgentDecisions().
   */
  async prepareStep(): Promise<void> {
    if (!this.llmReady || !this.client || !this.model.dao) return;

    const currentStep = this.model.currentStep;
    if (currentStep === 0 || currentStep % this.reportInterval !== 0) return;

    try {
      const { system, prompt } = this.buildReportPrompt();

      // Check cache
      let responseText: string | undefined;
      let cacheKey: string | undefined;

      if (this.cache) {
        cacheKey = LLMResponseCache.makeKey(
          this.llmModel,
          system,
          prompt,
          this.llmSeed,
          this.temperature
        );
        responseText = this.cache.get(cacheKey);
      }

      if (responseText === undefined) {
        const response = await this.client.generate({
          model: this.llmModel,
          system,
          prompt,
          temperature: this.temperature,
          seed: this.llmSeed,
          format: 'json',
          options: { num_predict: this.maxTokens },
        });
        responseText = response.response;

        if (this.cache && cacheKey) {
          this.cache.set(cacheKey, responseText, this.llmModel);
        }
      }

      this.pendingReport = this.parseReport(responseText, currentStep);
    } catch (err) {
      logger.debug(`LLM reporter failed at step ${currentStep}: ${err}`);
    }
  }

  /**
   * Standard step: store any pending report, then do basic agent actions
   */
  step(): void {
    super.step();

    // Store pending report if available
    if (this.pendingReport) {
      this.reports.push(this.pendingReport);
      this.pendingReport = null;
    }

    // Reporters also vote (they are DAO members after all)
    this.voteOnRandomProposal();

    // Update tracking state
    if (this.model.dao) {
      this.prevTreasuryFunds = this.model.dao.treasury.funds;
      this.prevMemberCount = this.model.dao.members.length;
      this.prevProposalCount = this.model.dao.proposals.length;
    }
  }

  /**
   * Reset transient state between episodes.
   */
  endEpisode(): void {
    this.reports = [];
    this.pendingReport = null;
    if (this.model.dao) {
      this.prevTreasuryFunds = this.model.dao.treasury.funds;
      this.prevMemberCount = this.model.dao.members.length;
      this.prevProposalCount = this.model.dao.proposals.length;
    }
  }

  /**
   * Get the most recent report
   */
  getLatestReport(): NewsReport | undefined {
    return this.reports[this.reports.length - 1];
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private buildReportPrompt(): { system: string; prompt: string } {
    const dao = this.model.dao!;
    const currentStep = this.model.currentStep;

    const system = `You are a DAO governance reporter. Write concise, factual news summaries about DAO activity.
Respond with JSON: {"headline": "short headline", "body": "2-4 sentence report", "topics": ["topic1", "topic2"], "sentiment": -1.0 to 1.0}`;

    // Gather simulation state for the report
    const openProposals = dao.getOpenProposals();
    const recentlyResolved = dao.proposals.filter(
      (p) =>
        p.status !== 'open' &&
        p.creationTime + p.votingPeriod >= currentStep - this.reportInterval
    );

    const treasuryChange = dao.treasury.funds - this.prevTreasuryFunds;
    const memberChange = dao.members.length - this.prevMemberCount;

    const passedCount = recentlyResolved.filter((p) => p.status === 'approved').length;
    const failedCount = recentlyResolved.filter(
      (p) => p.status === 'rejected' || p.status === 'expired'
    ).length;

    const topVoters = this.getTopVoters(3);

    let prompt = `DAO STATUS REPORT (Step ${currentStep}):
Members: ${dao.members.length} (${memberChange >= 0 ? '+' : ''}${memberChange} since last report)
Treasury: ${Math.round(dao.treasury.funds)} tokens (${treasuryChange >= 0 ? '+' : ''}${Math.round(treasuryChange)} change)
Open proposals: ${openProposals.length}
Recently resolved: ${passedCount} passed, ${failedCount} failed/expired`;

    if (openProposals.length > 0) {
      const topProposals = openProposals.slice(0, 3);
      prompt += '\n\nACTIVE PROPOSALS:';
      for (const p of topProposals) {
        const totalVotes = p.votesFor + p.votesAgainst;
        const support =
          totalVotes > 0 ? ((p.votesFor / totalVotes) * 100).toFixed(0) : '?';
        prompt += `\n- "${p.topic || 'Untitled'}" (${support}% support, ${totalVotes} votes)`;
      }
    }

    if (topVoters.length > 0) {
      prompt += '\n\nMOST ACTIVE VOTERS:';
      for (const v of topVoters) {
        prompt += `\n- ${v.type} (${v.votes} votes)`;
      }
    }

    return { system, prompt };
  }

  private getTopVoters(limit: number): Array<{ type: string; votes: number }> {
    if (!this.model.dao) return [];

    const voterStats = new Map<string, number>();
    for (const member of this.model.dao.members) {
      const type = member.constructor.name;
      voterStats.set(type, (voterStats.get(type) || 0) + member.totalVotesCast);
    }

    return [...voterStats.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type, votes]) => ({ type, votes }));
  }

  private parseReport(raw: string, step: number): NewsReport {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          step,
          headline:
            typeof parsed.headline === 'string'
              ? parsed.headline.slice(0, 200)
              : `DAO Report: Step ${step}`,
          body:
            typeof parsed.body === 'string'
              ? parsed.body.slice(0, 1000)
              : 'No report generated.',
          topics: Array.isArray(parsed.topics)
            ? parsed.topics.slice(0, 5).map(String)
            : [],
          sentiment: Math.max(
            -1,
            Math.min(1, Number(parsed.sentiment) || 0)
          ),
        };
      }
    } catch {
      // Fall through
    }

    return {
      step,
      headline: `DAO Report: Step ${step}`,
      body: raw.slice(0, 500),
      topics: [],
      sentiment: 0,
    };
  }
}
