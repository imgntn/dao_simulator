// Governance Expert Agent - Specializes in proposal analysis and informed voting
// New agent type for sophisticated governance participation

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice, randomBool } from '../utils/random';

// Analysis configuration
const ANALYSIS_DEPTH = 0.7;  // How thorough analysis is (affects vote quality)
const INFLUENCE_FACTOR = 1.5;  // Vote weight multiplier for expertise
const MIN_REPUTATION_FOR_ADVICE = 30;  // Min reputation to give advice

interface ProposalAnalysis {
  proposalId: string;
  riskScore: number;      // 0-1, higher = riskier
  fundingViability: number;  // 0-1, likelihood of meeting funding
  supportMomentum: number;  // 0-1, voting trend
  recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
  analyzedAt: number;
}

export class GovernanceExpert extends DAOMember {
  analyses: Map<string, ProposalAnalysis> = new Map();
  specialization: string[];  // Topics this expert focuses on
  accuracyRating: number;  // Track prediction accuracy
  advisorInfluence: number;  // How much weight advice carries

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 75,  // Higher default reputation
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Assign random specializations
    const topics = ['infrastructure', 'treasury', 'governance', 'community', 'technical'];
    this.specialization = [randomChoice(topics), randomChoice(topics)];
    this.accuracyRating = 0.5 + random() * 0.3;  // 50-80% accuracy
    this.advisorInfluence = 0.5 + random() * 0.5;  // 50-100% influence
  }

  step(): void {
    if (!this.model.dao) return;

    // Analyze proposals
    this.analyzeProposals();

    // Vote with informed strategy
    this.voteWithExpertise();

    // Optionally advise other members
    if (this.reputation >= MIN_REPUTATION_FOR_ADVICE && randomBool(0.3)) {
      this.adviseOtherMembers();
    }

    // Leave analytical comments
    if (random() < (this.model.dao?.commentProbability || 0.3)) {
      this.leaveAnalyticalComment();
    }
  }

  /**
   * Analyze open proposals to form informed opinions
   */
  private analyzeProposals(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    for (const proposal of openProposals) {
      // Skip if recently analyzed
      const existing = this.analyses.get(proposal.uniqueId);
      if (existing && this.model.currentStep - existing.analyzedAt < 5) {
        continue;
      }

      const analysis = this.analyzeProposal(proposal);
      this.analyses.set(proposal.uniqueId, analysis);

      // Emit analysis event
      if (this.model.eventBus) {
        this.model.eventBus.publish('proposal_analyzed', {
          step: this.model.currentStep,
          expert: this.uniqueId,
          proposalId: proposal.uniqueId,
          recommendation: analysis.recommendation,
          riskScore: analysis.riskScore,
        });
      }
    }
  }

  /**
   * Perform detailed analysis of a proposal
   *
   * CRITICAL FIX: Use specialization in analysis to boost/penalize
   * proposals that match the expert's areas of expertise.
   */
  private analyzeProposal(proposal: Proposal): ProposalAnalysis {
    // Calculate risk score based on funding goal and duration
    const fundingRisk = Math.min(1, proposal.fundingGoal / 10000);
    const durationRisk = Math.min(1, (proposal.votingPeriod || 10) / 30);
    const riskScore = (fundingRisk * 0.6 + durationRisk * 0.4) * (1 - ANALYSIS_DEPTH * random());

    // Calculate funding viability
    const fundingProgress = proposal.fundingGoal > 0
      ? proposal.currentFunding / proposal.fundingGoal
      : 1;
    const fundingViability = Math.min(1, fundingProgress + random() * 0.2);

    // Calculate support momentum
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const supportMomentum = totalVotes > 0
      ? proposal.votesFor / totalVotes
      : 0.5;

    // CRITICAL FIX: Apply specialization bonus
    // Experts are more favorable to proposals in their area of expertise
    let specializationBonus = 0;
    const titleLower = proposal.title.toLowerCase();
    const topicLower = proposal.topic.toLowerCase();

    for (const specialty of this.specialization) {
      const specLower = specialty.toLowerCase();
      if (titleLower.includes(specLower) || topicLower.includes(specLower)) {
        // Expert has deep knowledge in this area - higher confidence in judgment
        specializationBonus += 0.15;
        // Also reduces perceived risk for areas of expertise
        break;
      }
    }

    // Determine recommendation
    let score = (1 - riskScore) * 0.3 + fundingViability * 0.3 + supportMomentum * 0.4;

    // Apply specialization bonus (capped)
    score = Math.min(1, score + specializationBonus);

    let recommendation: ProposalAnalysis['recommendation'];
    if (score >= 0.8) recommendation = 'strong_yes';
    else if (score >= 0.6) recommendation = 'yes';
    else if (score >= 0.4) recommendation = 'neutral';
    else if (score >= 0.2) recommendation = 'no';
    else recommendation = 'strong_no';

    return {
      proposalId: proposal.uniqueId,
      riskScore,
      fundingViability,
      supportMomentum,
      recommendation,
      analyzedAt: this.model.currentStep,
    };
  }

  /**
   * Vote based on expert analysis
   */
  private voteWithExpertise(): void {
    if (!this.model.dao) return;

    // Respect votingActivity parameter - experts still need to decide to participate
    const votingActivity = this.model.dao.votingActivity ?? 0.3;
    if (random() >= votingActivity) {
      return;  // Expert decides not to vote this step
    }

    const openProposals = this.model.dao.proposals.filter(p =>
      p.status === 'open' &&
      !this.votes.has(p.uniqueId)
    );

    if (openProposals.length === 0) return;

    // Prioritize proposals we've analyzed
    const analyzedProposals = openProposals.filter(p => this.analyses.has(p.uniqueId));
    const toVote = analyzedProposals.length > 0
      ? randomChoice(analyzedProposals)
      : randomChoice(openProposals);

    const analysis = this.analyses.get(toVote.uniqueId);
    let vote: boolean;

    if (analysis) {
      // Vote based on analysis
      switch (analysis.recommendation) {
        case 'strong_yes':
        case 'yes':
          vote = true;
          break;
        case 'strong_no':
        case 'no':
          vote = false;
          break;
        default:
          vote = randomBool(0.5);
      }
    } else {
      vote = randomBool(0.5);
    }

    // Apply vote with expertise weight
    const weight = this.tokens * INFLUENCE_FACTOR * (this.accuracyRating);
    toVote.addVote(this.uniqueId, vote, weight);
    this.votes.set(toVote.uniqueId, { vote, weight });
    this.markActive();
  }

  /**
   * Advise other members on how to vote (influence their decisions)
   */
  private adviseOtherMembers(): void {
    if (!this.model.dao) return;

    // Find a random analysis to share
    const analysisEntries = Array.from(this.analyses.entries());
    if (analysisEntries.length === 0) return;

    const [proposalId, analysis] = randomChoice(analysisEntries);
    const proposal = this.model.dao.proposals.find(p => p.uniqueId === proposalId);
    if (!proposal || proposal.status !== 'open') return;

    // Emit advice event (other agents could listen to this)
    if (this.model.eventBus) {
      this.model.eventBus.publish('governance_advice', {
        step: this.model.currentStep,
        expert: this.uniqueId,
        proposalId,
        recommendation: analysis.recommendation,
        influence: this.advisorInfluence,
        expertise: this.specialization,
      });
    }
  }

  /**
   * Leave an analytical comment on a proposal
   */
  private leaveAnalyticalComment(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return;

    const proposal = randomChoice(openProposals);
    const analysis = this.analyses.get(proposal.uniqueId);

    // Determine sentiment based on analysis
    let sentiment: string;
    if (analysis) {
      switch (analysis.recommendation) {
        case 'strong_yes':
        case 'yes':
          sentiment = 'positive';
          break;
        case 'strong_no':
        case 'no':
          sentiment = 'negative';
          break;
        default:
          sentiment = 'neutral';
      }
    } else {
      sentiment = randomChoice(['positive', 'negative', 'neutral']);
    }

    this.leaveComment(proposal, sentiment);
  }
}
