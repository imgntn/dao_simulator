// Service Provider Agent - offers services to proposals

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';

export class ServiceProvider extends DAOMember {
  serviceBudget: number;
  servicesProvided: Map<string, string[]> = new Map(); // proposalId -> services

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    serviceBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.serviceBudget = serviceBudget;
  }

  step(): void {
    this.voteOnRandomProposal();
    this.leaveCommentOnRandomProposal();
    this.provideServices();
  }

  provideServices(): void {
    if (!this.model.dao || this.model.dao.proposals.length === 0) return;

    const proposal = this.model.dao.proposals[
      Math.floor(Math.random() * this.model.dao.proposals.length)
    ];

    if (this.serviceBudget > 0) {
      this.offerService(proposal);
      this.serviceBudget -= 1;
      // Note: Reputation is updated by ReputationTracker via 'service_offered' event
      this.markActive();
    }
  }

  offerService(proposal: Proposal): void {
    const services = ['marketing', 'legal', 'financial'];
    const service = services[Math.floor(Math.random() * services.length)];

    const provided = this.servicesProvided.get(proposal.uniqueId) || [];
    provided.push(service);
    this.servicesProvided.set(proposal.uniqueId, provided);

    // Add value to proposal
    proposal.currentFunding += 1;
    // Note: Reputation is updated by ReputationTracker via 'service_offered' event

    if (this.model.eventBus) {
      this.model.eventBus.publish('service_offered', {
        step: this.model.currentStep,
        proposal: proposal.title,
        provider: this.uniqueId,
        service,
      });
    }
  }
}
