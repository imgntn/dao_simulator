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
// - a]6z (Compound)
// - Polychain Capital governance wallets
// - Protocol treasuries with voting rights

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { submitRandomProposal } from '../utils/proposal-utils';
import { random, randomChoice } from '../utils/random';

export class GovernanceWhale extends DAOMember {
  // Whales are more likely to vote than average members
  // In real DAOs, large holders like a16z have ~80-90% vote participation
  // We use a 5x multiplier to counteract base apathy and fatigue
  private readonly voteActivityMultiplier: number = 5.0;

  // Track if we've delegated (whales often delegate to professional delegates)
  private hasDelegated: boolean = false;
  private delegationProbability: number = 0.3; // 30% chance to delegate

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
   * Override voting probability for whales
   * Real governance whales (a16z, Polychain, etc) have much higher participation
   * than retail holders - often 80-90% on important proposals
   */
  getEffectiveVotingProbability(): number {
    const baseProb = super.getEffectiveVotingProbability();
    // Whales are more engaged - multiply base probability
    // but cap at 90% to leave room for fatigue/apathy on less important proposals
    return Math.min(0.9, baseProb * this.voteActivityMultiplier);
  }

  step(): void {
    // Consider delegating to a professional delegate (one-time decision)
    if (!this.hasDelegated && random() < 0.01) {
      this.considerDelegation();
    }

    // Vote on proposals - whales vote more frequently than average
    // They have strong opinions and significant stake
    this.voteOnProposalsAsWhale();

    // Occasionally create proposals (whales have resources to propose)
    if (this.model.dao && random() < 0.002) {
      submitRandomProposal(this.model.dao, this);
    }

    // Comment on proposals to influence discussion
    if (random() < (this.model.dao?.commentProbability || 0.3) * 1.5) {
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

    if (random() > this.delegationProbability) return;

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
    const delegateAmount = Math.floor(this.tokens * 0.3); // Delegate 30%

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
    if (random() > 0.01) return;
    if (this.tokens <= 0) return;

    // Stake a portion of holdings (keep some liquid)
    const stakeAmount = Math.floor(this.tokens * 0.1);
    if (stakeAmount > 0) {
      this.stakeTokens(stakeAmount);
    }
  }

}
