// Service Provider Agent - offers services to proposals
// Upgraded with Q-learning for optimal service provision strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type ProviderAction = 'provide_premium' | 'provide_standard' | 'specialize' | 'diversify' | 'wait_opportunities' | 'hold';

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
  static readonly ACTIONS: readonly ProviderAction[] = [
    'provide_premium', 'provide_standard', 'specialize', 'diversify', 'wait_opportunities', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  serviceBudget: number;
  maxServiceBudget: number;
  servicesProvided: Map<string, ServiceValue[]> = new Map(); // proposalId -> services
  specialization: ServiceType; // Primary service type
  qualityRating: number; // Service quality (0.5 - 1.5)

  // Learning tracking
  lastAction: ProviderAction | null = null;
  lastState: string | null = null;
  premiumServicesProvided: number = 0;
  standardServicesProvided: number = 0;
  totalServiceValue: number = 0;

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
   * Get state representation for service provision decisions
   */
  private getProviderState(): string {
    if (!this.model.dao) return 'none|low|poor';

    // Market state (proposals needing services)
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const marketState = openProposals.length === 0 ? 'none' :
                        openProposals.length < 5 ? 'light' :
                        openProposals.length < 10 ? 'moderate' : 'busy';

    // Budget state
    const budgetRatio = this.serviceBudget / Math.max(1, this.maxServiceBudget);
    const budgetState = budgetRatio < 0.2 ? 'depleted' :
                        budgetRatio < 0.5 ? 'low' :
                        budgetRatio < 0.8 ? 'adequate' : 'full';

    // Quality/reputation state
    const qualityState = this.qualityRating < 0.8 ? 'poor' :
                         this.qualityRating < 1.0 ? 'average' :
                         this.qualityRating < 1.3 ? 'good' : 'premium';

    return StateDiscretizer.combineState(marketState, budgetState, qualityState);
  }

  /**
   * Choose provider action using Q-learning
   */
  private chooseProviderAction(): ProviderAction {
    const state = this.getProviderState();

    if (!settings.learning_enabled) {
      return this.heuristicProviderAction();
    }

    return this.learning.selectAction(
      state,
      [...ServiceProvider.ACTIONS]
    ) as ProviderAction;
  }

  /**
   * Heuristic-based provider action (fallback)
   */
  private heuristicProviderAction(): ProviderAction {
    if (!this.model.dao) return 'hold';

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    // No opportunities
    if (openProposals.length === 0) {
      return 'wait_opportunities';
    }

    // Low budget -> standard services only
    if (this.serviceBudget < this.maxServiceBudget * 0.3) {
      return 'provide_standard';
    }

    // High quality -> premium services
    if (this.qualityRating > 1.2) {
      return 'provide_premium';
    }

    return random() < 0.5 ? 'provide_standard' : 'specialize';
  }

  /**
   * Execute provider action and return reward
   */
  private executeProviderAction(action: ProviderAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    switch (action) {
      case 'provide_premium': {
        if (openProposals.length > 0 && this.serviceBudget > 20) {
          const proposal = randomChoice(openProposals);
          const oldQuality = this.qualityRating;
          this.qualityRating = Math.min(1.5, this.qualityRating + 0.1);
          this.offerService(proposal);
          this.qualityRating = oldQuality;  // Temporary boost
          this.premiumServicesProvided++;
          reward = 0.6;
        }
        break;
      }
      case 'provide_standard': {
        if (openProposals.length > 0 && this.serviceBudget > 0) {
          const proposal = randomChoice(openProposals);
          this.offerService(proposal);
          this.standardServicesProvided++;
          reward = 0.3;
        }
        break;
      }
      case 'specialize': {
        // Focus on specialization improves quality in that area
        this.qualityRating = Math.min(1.5, this.qualityRating + 0.02);
        reward = 0.2;
        break;
      }
      case 'diversify': {
        // Switch specialization to match market demand
        this.specialization = randomChoice([...SERVICES]);
        reward = 0.15;
        break;
      }
      case 'wait_opportunities':
        reward = 0.05;
        break;
      case 'hold':
        return 0;
    }

    this.markActive();
    return reward;
  }

  /**
   * Update Q-values based on provider outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from service effectiveness
    const serviceCount = this.premiumServicesProvided + this.standardServicesProvided;
    const efficiencyReward = serviceCount * 0.1;
    const qualityReward = this.qualityRating * 0.5;
    const budgetReward = (this.serviceBudget / this.maxServiceBudget) * 0.3;

    let reward = efficiencyReward + qualityReward + budgetReward;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getProviderState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...ServiceProvider.ACTIONS]
    );
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getProviderState();

    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }

    // Choose and execute action using Q-learning
    if (random() < 0.4) {
      const action = this.chooseProviderAction();
      this.executeProviderAction(action);
      this.lastAction = action;
    }

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

    // Add scaled value to proposal funding (in-kind service contribution)
    // Note: This models professional services (legal, financial, technical) where
    // providers contribute expertise rather than tokens. The value is added to
    // currentFunding to reflect the total resources supporting the proposal.
    // Provider's serviceBudget is already decremented above.
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
    premiumServices: number;
    standardServices: number;
    qualityRating: number;
    specialization: ServiceType;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      premiumServices: this.premiumServicesProvided,
      standardServices: this.standardServicesProvided,
      qualityRating: this.qualityRating,
      specialization: this.specialization,
    };
  }
}
