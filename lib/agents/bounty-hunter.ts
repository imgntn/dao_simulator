// Bounty Hunter Agent - completes bounty proposals for rewards
// Port from agents/bounty_hunter.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';

export class BountyHunter extends DAOMember {
  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy: any = null
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
  }

  /**
   * Work on available bounties
   */
  workOnBounties(): void {
    // Find approved bounty proposals that are not yet completed
    const bounties = this.model.dao.proposals.filter((p) => {
      const bounty = p as any;
      return (
        bounty.proposalType === 'bounty' &&
        p.status === 'approved' &&
        bounty.rewardLocked &&
        !bounty.completed
      );
    });

    if (bounties.length === 0) {
      return;
    }

    // Pick a random bounty to complete
    const bounty = bounties[
      Math.floor(Math.random() * bounties.length)
    ] as any;
    bounty.completed = true;

    // Withdraw reward from treasury
    const reward = this.model.dao.treasury.withdrawLocked(
      'DAO_TOKEN',
      bounty.reward || 0,
      this.model.currentStep
    );

    this.tokens += reward;

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('bounty_completed', {
        step: this.model.currentStep,
        proposal: bounty.title,
        hunter: this.uniqueId,
        reward,
      });
    }

    this.markActive();
  }

  step(): void {
    this.workOnBounties();
    this.voteOnRandomProposal();
  }
}
