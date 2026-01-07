// Arbitrator Agent - resolves disputes

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Dispute } from '../data-structures/dispute';
import { Violation } from '../data-structures/violation';
import { random } from '../utils/random';

export class Arbitrator extends DAOMember {
  arbitrationCapacity: number;
  private maxArbitrationCapacity: number;
  resolvedDisputes: Dispute[] = [];
  private capacityRegenRate: number;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    arbitrationCapacity: number = 10,
    capacityRegenRate: number = 0.1 // 10% of max capacity regenerates per step
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.arbitrationCapacity = arbitrationCapacity;
    this.maxArbitrationCapacity = arbitrationCapacity;
    this.capacityRegenRate = capacityRegenRate;
  }

  step(): void {
    // Regenerate some capacity each step (prevents permanent depletion)
    this.regenerateCapacity();

    if (this.model.dao && this.model.dao.disputes.length > 0) {
      this.handleDispute();
    }

    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  /**
   * Regenerate arbitration capacity over time
   */
  private regenerateCapacity(): void {
    if (this.arbitrationCapacity < this.maxArbitrationCapacity) {
      const regen = this.maxArbitrationCapacity * this.capacityRegenRate;
      this.arbitrationCapacity = Math.min(
        this.maxArbitrationCapacity,
        this.arbitrationCapacity + regen
      );
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
    this.markActive();

    // Publish dispute resolved event (reputation tracking handled via events if needed)
    if (this.model.eventBus) {
      this.model.eventBus.publish('dispute_resolved', {
        step: this.model.currentStep,
        arbitrator: this.uniqueId,
        dispute: dispute.description,
      });
    }

    // Check if violation should be created
    if (random() < this.model.dao.violationProbability && dispute.member) {
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
