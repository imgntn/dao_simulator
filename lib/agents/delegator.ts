// Delegator Agent - delegates support to proposals
// Upgraded with Q-learning to learn optimal delegation strategies
//
// This implements PROPOSAL FUNDING DELEGATION: members can allocate part of
// their budget to fund proposals they support. This is DIFFERENT from voting:
//
// - Proposal Support (this class): "I fund this proposal" (delegationBudget)
//   * Tokens go toward proposal funding
//   * proposalDelegations tracks how much went to each proposal
//   * This is about CAPITAL, not voting power
//
// - Token Delegation (base class): "Alice controls my voting power"
//   * Tokens affect vote weight
//   * This is about GOVERNANCE, not funding

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Delegation configuration
const MIN_DELEGATION_FRACTION = 0.05;
const MAX_DELEGATION_FRACTION = 0.3;

type DelegationAction = 'delegate_high' | 'delegate_medium' | 'delegate_low' | 'hold' | 'withdraw';

export class Delegator extends DAOMember {
  static readonly ACTIONS: readonly DelegationAction[] = [
    'delegate_high', 'delegate_medium', 'delegate_low', 'hold', 'withdraw'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Delegation state
  delegationBudget: number;
  maxDelegationBudget: number;
  proposalDelegations: Map<string, number> = new Map();

  // Learning tracking
  delegationOutcomes: Map<string, {
    action: DelegationAction;
    amount: number;
    proposalId: string;
    delegatedAt: number;
  }> = new Map();
  lastDelegationReturns: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    delegationBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);

    const sanitizedBudget = Number.isFinite(delegationBudget) && delegationBudget >= 0
      ? delegationBudget
      : 100;
    this.delegationBudget = sanitizedBudget;
    this.maxDelegationBudget = sanitizedBudget;

    // Initialize learning
    const config: Partial<LearningConfig> = {
      learningRate: settings.learning_global_learning_rate,
      discountFactor: settings.learning_discount_factor,
      explorationRate: settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.learning = new LearningMixin(config);
  }

  /**
   * Get state representation for delegation decisions
   */
  private getDelegationState(proposal?: Proposal): string {
    if (!this.model.dao) return 'low|low|adequate';

    // Calculate overall participation rate
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const avgParticipation = openProposals.length > 0
      ? openProposals.reduce((sum, p) => sum + p.votesFor + p.votesAgainst, 0) /
        (openProposals.length * Math.max(1, this.model.dao.members.length))
      : 0;

    // Budget state
    const budgetRatio = this.delegationBudget / Math.max(1, this.maxDelegationBudget);
    const budgetState = budgetRatio < 0.2 ? 'depleted' :
                        budgetRatio < 0.5 ? 'low' :
                        budgetRatio < 0.8 ? 'adequate' : 'flush';

    // Proposal support state
    let supportState = 'neutral';
    if (proposal) {
      supportState = StateDiscretizer.discretizeSupport(
        proposal.votesFor,
        proposal.votesAgainst
      );
    }

    return StateDiscretizer.combineState(
      StateDiscretizer.discretizeParticipation(avgParticipation),
      budgetState,
      supportState
    );
  }

  /**
   * Choose delegation action using Q-learning
   */
  private chooseDelegationAction(proposal: Proposal): DelegationAction {
    const state = this.getDelegationState(proposal);

    if (!settings.learning_enabled) {
      // Fall back to heuristic-based decision
      return this.heuristicDelegationAction(proposal);
    }

    return this.learning.selectAction(
      state,
      [...Delegator.ACTIONS]
    ) as DelegationAction;
  }

  /**
   * Heuristic-based delegation action (fallback)
   */
  private heuristicDelegationAction(proposal: Proposal): DelegationAction {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const supportRatio = totalVotes > 0 ? proposal.votesFor / totalVotes : 0.5;

    // Higher support -> higher delegation
    if (supportRatio > 0.7 && this.delegationBudget > this.maxDelegationBudget * 0.3) {
      return 'delegate_high';
    } else if (supportRatio > 0.5 && this.delegationBudget > this.maxDelegationBudget * 0.2) {
      return 'delegate_medium';
    } else if (supportRatio > 0.3) {
      return 'delegate_low';
    } else if (this.delegationBudget < this.maxDelegationBudget * 0.1) {
      return 'withdraw';
    }

    return 'hold';
  }

  /**
   * Execute delegation action
   */
  private executeDelegationAction(action: DelegationAction, proposal: Proposal): number {
    let amount = 0;

    switch (action) {
      case 'delegate_high':
        amount = this.delegationBudget * MAX_DELEGATION_FRACTION;
        break;
      case 'delegate_medium':
        amount = this.delegationBudget * (MIN_DELEGATION_FRACTION + MAX_DELEGATION_FRACTION) / 2;
        break;
      case 'delegate_low':
        amount = this.delegationBudget * MIN_DELEGATION_FRACTION;
        break;
      case 'hold':
        // Do nothing
        return 0;
      case 'withdraw':
        // Try to recover from completed proposals
        this.recoverCompletedDelegations();
        return 0;
    }

    // Limit by available tokens
    amount = Math.min(amount, this.tokens, this.delegationBudget);

    if (amount > 0) {
      this.delegateSupportToProposal(proposal, amount);

      // Track for learning
      this.delegationOutcomes.set(proposal.uniqueId, {
        action,
        amount,
        proposalId: proposal.uniqueId,
        delegatedAt: this.model.currentStep,
      });
    }

    return amount;
  }

  /**
   * Recover delegations from completed proposals
   */
  private recoverCompletedDelegations(): void {
    if (!this.model.dao) return;

    const completedProposals = this.model.dao.proposals.filter(
      p => (p.status === 'approved' || p.status === 'completed') &&
           this.proposalDelegations.has(p.uniqueId)
    );

    for (const proposal of completedProposals) {
      const delegated = this.proposalDelegations.get(proposal.uniqueId) || 0;
      if (delegated > 0) {
        // Return a portion based on proposal success
        const returnRate = proposal.status === 'completed' ? 1.1 : 0.9;
        const returned = delegated * returnRate;
        this.tokens += returned;
        this.delegationBudget = Math.min(
          this.delegationBudget + returned * 0.5,
          this.maxDelegationBudget
        );
        this.proposalDelegations.delete(proposal.uniqueId);
      }
    }
  }

  /**
   * Update Q-values based on delegation outcomes
   */
  private updateLearning(): void {
    if (!this.model.dao || !settings.learning_enabled) return;

    const closedProposals = this.model.dao.proposals.filter(
      p => p.status !== 'open' && this.delegationOutcomes.has(p.uniqueId)
    );

    for (const proposal of closedProposals) {
      const outcome = this.delegationOutcomes.get(proposal.uniqueId);
      if (!outcome) continue;

      const state = this.getDelegationState(proposal);
      let reward = 0;

      // Calculate reward based on proposal outcome
      const proposalPassed = proposal.status === 'approved' || proposal.status === 'completed';
      const delegatedAmount = outcome.amount;

      if (proposalPassed) {
        // Good delegation - proposal succeeded
        reward = 10 * (delegatedAmount / Math.max(1, this.maxDelegationBudget));

        // Bonus for delegate_high on successful proposals
        if (outcome.action === 'delegate_high') {
          reward += 5;
        }
      } else {
        // Bad delegation - proposal failed
        reward = -5 * (delegatedAmount / Math.max(1, this.maxDelegationBudget));

        // Extra penalty for high delegation on failed proposals
        if (outcome.action === 'delegate_high') {
          reward -= 3;
        }
      }

      // Update Q-value
      this.learning.update(
        state,
        outcome.action,
        reward,
        state,
        [...Delegator.ACTIONS]
      );

      // Clean up
      this.delegationOutcomes.delete(proposal.uniqueId);
    }
  }

  step(): void {
    // Update learning from closed proposals
    this.updateLearning();

    // Replenish budget from tokens earned since last check
    if (this.tokens > this.delegationBudget && this.delegationBudget < this.maxDelegationBudget) {
      const replenish = Math.min(
        this.tokens * 0.1,
        this.maxDelegationBudget - this.delegationBudget
      );
      this.delegationBudget += replenish;
    }

    const proposal = this.chooseProposalToDelegateTo();
    if (proposal && this.delegationBudget > 0 && this.tokens > 0) {
      const action = this.chooseDelegationAction(proposal);
      this.executeDelegationAction(action, proposal);
    }

    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  delegateSupportToProposal(proposal: Proposal, tokenAmount: number): void {
    const amount = Math.min(tokenAmount, this.tokens, this.delegationBudget);
    if (amount <= 0) return;

    this.delegationBudget -= amount;
    this.tokens -= amount;
    proposal.receiveDelegatedSupport(this.uniqueId, amount);

    const current = this.proposalDelegations.get(proposal.uniqueId) || 0;
    this.proposalDelegations.set(proposal.uniqueId, current + amount);

    if (this.model.eventBus) {
      this.model.eventBus.publish('proposal_delegated', {
        step: this.model.currentStep,
        delegator: this.uniqueId,
        proposal: proposal.title,
        amount,
      });
    }

    this.markActive();
  }

  chooseProposalToDelegateTo(): Proposal | null {
    if (!this.model.dao) return null;

    const openProposals = this.model.dao.proposals.filter(p => !p.closed && p.status === 'open');
    if (openProposals.length === 0) return null;

    // Prefer proposals with higher current support (bandwagon effect)
    const totalSupport = openProposals.reduce((sum, p) => sum + p.votesFor, 0);
    if (totalSupport <= 0) {
      return randomChoice(openProposals);
    }

    // Weighted random selection by current support
    let r = random() * totalSupport;
    for (const proposal of openProposals) {
      r -= proposal.votesFor;
      if (r <= 0) {
        return proposal;
      }
    }

    return openProposals[openProposals.length - 1];
  }

  /**
   * Signal end of episode
   */
  endEpisode(): void {
    this.learning.endEpisode();
  }

  /**
   * Export learning state for checkpoints
   */
  exportLearningState(): LearningState {
    return this.learning.exportLearningState();
  }

  /**
   * Import learning state from checkpoint
   */
  importLearningState(state: LearningState): void {
    this.learning.importLearningState(state);
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    qTableSize: number;
    stateCount: number;
    episodeCount: number;
    totalReward: number;
    explorationRate: number;
    activeDelegations: number;
    budgetRatio: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      activeDelegations: this.proposalDelegations.size,
      budgetRatio: this.delegationBudget / Math.max(1, this.maxDelegationBudget),
    };
  }
}
