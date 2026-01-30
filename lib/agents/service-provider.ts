// Service Provider Agent - offers services to proposals

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice } from '../utils/random';

// Service configuration
const SERVICES = ['legal', 'financial', 'technical', 'advisory'] as const;
type ServiceType = (typeof SERVICES)[number];

interface ServiceValue {
  type: ServiceType;
  baseValue: number;
  qualityMultiplier: number;
}

const SERVICE_VALUES: Record<ServiceType, number> = {
  legal: 8,
  financial: 6,
  technical: 7,
  advisory: 4,
};

export class ServiceProvider extends DAOMember {
  serviceBudget: number;
  maxServiceBudget: number;
  servicesProvided: Map<string, ServiceValue[]> = new Map(); // proposalId -> services
  specialization: ServiceType; // Primary service type
  qualityRating: number; // Service quality (0.5 - 1.5)

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    serviceBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Validate and sanitize service budget
    const sanitizedBudget = Number.isFinite(serviceBudget) && serviceBudget >= 0
      ? serviceBudget
      : 100;
    this.serviceBudget = sanitizedBudget;
    this.maxServiceBudget = sanitizedBudget;
    // Assign random specialization and quality
    this.specialization = randomChoice([...SERVICES]);
    this.qualityRating = 0.5 + random();
  }

  step(): void {
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }

    this.provideServices();
    this.regenerateBudget();
  }

  /**
   * Regenerate some service budget each step
   */
  private regenerateBudget(): void {
    if (this.serviceBudget < this.maxServiceBudget) {
      // Regenerate 5% of max budget per step
      this.serviceBudget = Math.min(
        this.maxServiceBudget,
        this.serviceBudget + this.maxServiceBudget * 0.05
      );
    }
  }

  provideServices(): void {
    if (!this.model.dao || this.model.dao.proposals.length === 0) return;

    // Only provide services to open proposals
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return;

    const proposal = randomChoice(openProposals);

    if (this.serviceBudget > 0) {
      this.offerService(proposal);
    }
  }

  offerService(proposal: Proposal): void {
    // Choose service type - prefer specialization
    const serviceType = random() < 0.7 ? this.specialization : randomChoice([...SERVICES]);

    // Calculate service value based on type, quality, and reputation
    const baseValue = SERVICE_VALUES[serviceType];
    const qualityMultiplier = this.qualityRating;
    const reputationMultiplier = Math.max(0.5, Math.min(1.5, this.reputation / 50));
    const serviceValue = baseValue * qualityMultiplier * reputationMultiplier;

    // Check if we can afford to provide this service (costs budget)
    const cost = Math.ceil(serviceValue);
    if (cost > this.serviceBudget) return;

    this.serviceBudget -= cost;

    // Track service provided
    const provided = this.servicesProvided.get(proposal.uniqueId) || [];
    provided.push({
      type: serviceType,
      baseValue,
      qualityMultiplier,
    });
    this.servicesProvided.set(proposal.uniqueId, provided);

    // Add scaled value to proposal funding
    proposal.currentFunding += serviceValue;

    if (this.model.eventBus) {
      this.model.eventBus.publish('service_offered', {
        step: this.model.currentStep,
        proposal: proposal.title,
        provider: this.uniqueId,
        service: serviceType,
        value: serviceValue,
        quality: this.qualityRating,
      });
    }

    this.markActive();
  }
}
