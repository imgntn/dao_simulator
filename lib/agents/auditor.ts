// Auditor Agent - flags suspicious proposals and creates disputes
// Port from agents/auditor.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { VotingStrategy } from '../utils/voting-strategies';
import { Dispute } from '../data-structures/dispute';
import { random } from '../utils/random';

export class Auditor extends DAOMember {
  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string | VotingStrategy | null
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy ?? undefined);
  }

  /**
   * Review proposals for suspicious activity
   */
  reviewProposals(): void {
    if (!this.model.dao) return;

    // Create a copy to iterate safely
    const proposals = [...this.model.dao.proposals];
    for (const proposal of proposals) {
      if (proposal.status !== 'open') {
        continue;
      }

      // Flag high-value or suspicious proposals
      const isSuspicious =
        (proposal.fundingGoal || 0) > 1000 ||
        proposal.description.toLowerCase().includes('suspicious');

      if (isSuspicious && proposal.creator) {
        const dispute = new Dispute(
          this.model.dao,
          [proposal.creator],
          `Audit flag for ${proposal.title}`,
          1,
          proposal.project || null,
          proposal.creator
        );

        this.model.dao.addDispute(dispute);

        // Emit event
        if (this.model.eventBus) {
          this.model.eventBus.publish('dispute_created', {
            step: this.model.currentStep,
            disputeId: dispute.uniqueId,
            agentId: this.uniqueId,
            proposalId: proposal.uniqueId,
            reason: 'audit_flag',
          });
        }
      }
    }
  }

  step(): void {
    if (!this.model.dao) return;

    this.reviewProposals();
    this.voteOnRandomProposal();

    // Occasionally leave comments
    if (random() < (this.model.dao.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
