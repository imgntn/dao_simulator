// Arbitrator Agent - resolves disputes

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Dispute } from '../data-structures/dispute';
import { Violation } from '../data-structures/violation';

export class Arbitrator extends DAOMember {
  arbitrationCapacity: number;
  resolvedDisputes: Dispute[] = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    arbitrationCapacity: number = 10
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.arbitrationCapacity = arbitrationCapacity;
  }

  step(): void {
    if (this.model.dao && this.model.dao.disputes.length > 0) {
      this.handleDispute();
    }

    this.voteOnRandomProposal();

    if (Math.random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  handleDispute(): void {
    const dispute = this.chooseDispute();
    if (dispute) {
      this.arbitrate(dispute);
    }
  }

  chooseDispute(): Dispute | null {
    if (!this.model.dao) return null;

    const pendingDisputes = this.model.dao.disputes.filter(d => !d.resolved);
    if (pendingDisputes.length === 0) return null;

    // Choose highest importance dispute
    return pendingDisputes.reduce((max, d) => (d.importance > max.importance ? d : max));
  }

  arbitrate(dispute: Dispute): void {
    if (!this.model.dao || this.arbitrationCapacity <= 0) return;

    dispute.resolved = true;
    this.arbitrationCapacity -= 1;
    this.reputation += 1;
    this.markActive();

    // Check if violation should be created
    if (Math.random() < this.model.dao.violationProbability && dispute.member) {
      const violation = new Violation(dispute.member, dispute.project, dispute.description);
      this.model.dao.addViolation(violation);

      // Penalize the violator
      const violator = this.model.dao.members.find(m => m.uniqueId === dispute.member);
      if (violator) {
        violator.reputation -= this.model.dao.reputationPenalty;

        // Slash staked tokens
        const slashAmount = violator.stakedTokens * (this.model.dao.slashFraction * dispute.importance);
        if (slashAmount > 0) {
          violator.stakedTokens -= slashAmount;
        }
      }

      if (this.model.eventBus) {
        this.model.eventBus.publish('violation_created', {
          step: this.model.currentStep,
          project: dispute.project?.title || null,
          violator: dispute.member,
          description: dispute.description,
        });
      }
    }
  }

  resolveDispute(dispute: Dispute): void {
    this.resolvedDisputes.push(dispute);
  }
}
