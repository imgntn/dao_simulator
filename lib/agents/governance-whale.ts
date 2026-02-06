// GovernanceWhale Agent
//
// Models large token holders who maintain their holdings for governance power.
// Unlike Investors who deploy capital, GovernanceWhales:
// - Hold tokens long-term for voting influence
// - Vote actively on proposals (high participation)
// - May delegate to trusted representatives
// - Don't spend tokens on investments
//
// This matches real DAO whales like:
// - a16z (Compound)
// - Polychain Capital governance wallets
// - Protocol treasuries with voting rights

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { submitRandomProposal } from '../utils/proposal-utils';
import { random, randomChoice } from '../utils/random';

/**
 * Configuration for GovernanceWhale behavior
 */
export interface GovernanceWhaleConfig {
  /** Multiplier for base voting probability (default: 5.0) */
  voteActivityMultiplier?: number;
  /** Maximum voting probability cap (default: 0.9) */
  maxVotingProbability?: number;
  /** Probability to delegate when considering (default: 0.3) */
  delegationProbability?: number;
  /** Fraction of tokens to delegate (default: 0.3) */
  delegateFraction?: number;
  /** Per-step chance to consider delegation (default: 0.01) */
  delegationConsiderationChance?: number;
  /** Per-step chance to create a proposal (default: 0.002) */
  proposalCreationProbability?: number;
  /** Multiplier for comment probability (default: 1.5) */
  commentMultiplier?: number;
  /** Per-step chance to consider staking (default: 0.01) */
  stakingConsiderationChance?: number;
  /** Fraction of tokens to stake when staking (default: 0.1) */
  stakeFraction?: number;
}

const DEFAULT_CONFIG: Required<GovernanceWhaleConfig> = {
  voteActivityMultiplier: 5.0,
  maxVotingProbability: 0.9,
  delegationProbability: 0.3,
  delegateFraction: 0.3,
  delegationConsiderationChance: 0.01,
  proposalCreationProbability: 0.002,
  commentMultiplier: 1.5,
  stakingConsiderationChance: 0.01,
  stakeFraction: 0.1,
};

export class GovernanceWhale extends DAOMember {
  // Configuration
  private readonly config: Required<GovernanceWhaleConfig>;

  // Track if we've delegated (whales often delegate to professional delegates)
  private hasDelegated: boolean = false;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    config?: GovernanceWhaleConfig
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Override voting probability for whales
   * Real governance whales (a16z, Polychain, etc) have much higher participation
   * than retail holders - often 80-90% on important proposals
   */
  getEffectiveVotingProbability(): number {
    const baseProb = super.getEffectiveVotingProbability();
    // Whales are more engaged - multiply base probability
    // but cap to leave room for fatigue/apathy on less important proposals
    return Math.min(this.config.maxVotingProbability, baseProb * this.config.voteActivityMultiplier);
  }

  step(): void {
    // Consider delegating to a professional delegate (one-time decision)
    if (!this.hasDelegated && random() < this.config.delegationConsiderationChance) {
      this.considerDelegation();
    }

    // Vote on proposals - whales vote more frequently than average
    // They have strong opinions and significant stake
    this.voteOnProposalsAsWhale();

    // Occasionally create proposals (whales have resources to propose)
    if (this.model.dao && random() < this.config.proposalCreationProbability) {
      submitRandomProposal(this.model.dao, this);
    }

    // Comment on proposals to influence discussion
    if (random() < (this.model.dao?.commentProbability || 0.3) * this.config.commentMultiplier) {
      this.leaveCommentOnRandomProposal();
    }

    // Whales may stake tokens but keep voting power
    this.considerStaking();
  }

  /**
   * Whales vote more actively than regular members
   * They have more at stake and pay attention to governance
   * Note: We just call the base method once - the higher probability comes
   * from getEffectiveVotingProbability override, not from calling multiple times
   * (calling twice doesn't work because proposalsConsidered is already set)
   */
  private voteOnProposalsAsWhale(): void {
    if (!this.model.dao) return;

    // If we've delegated our voting power, our representative votes for us
    if (this.representative) return;

    // Vote with enhanced probability (from getEffectiveVotingProbability override)
    this.voteOnRandomProposal();
  }

  /**
   * Consider delegating to a professional delegate
   * Many real whales delegate to governance professionals
   */
  private considerDelegation(): void {
    if (!this.model.dao || this.hasDelegated) return;

    if (random() > this.config.delegationProbability) return;

    // Find potential delegates (governance experts or active delegators)
    const potentialDelegates = this.model.dao.members.filter(m =>
      m.uniqueId !== this.uniqueId &&
      (m.constructor.name === 'GovernanceExpert' ||
       m.constructor.name === 'Delegator' ||
       m.constructor.name === 'LiquidDelegator')
    );

    if (potentialDelegates.length === 0) return;

    // Delegate some tokens (not all - whales keep some direct control)
    const delegate = randomChoice(potentialDelegates);
    const delegateAmount = Math.floor(this.tokens * this.config.delegateFraction);

    if (delegateAmount > 0) {
      this.delegate(delegateAmount, delegate);
      this.hasDelegated = true;
    }
  }

  /**
   * Whales may stake tokens for yield while maintaining voting power
   */
  private considerStaking(): void {
    if (!this.model.dao) return;

    // Only stake occasionally and if we have unstaked tokens
    if (random() > this.config.stakingConsiderationChance) return;
    if (this.tokens <= 0) return;

    // Stake a portion of holdings (keep some liquid)
    const stakeAmount = Math.floor(this.tokens * this.config.stakeFraction);
    if (stakeAmount > 0) {
      this.stakeTokens(stakeAmount);
    }
  }

}
