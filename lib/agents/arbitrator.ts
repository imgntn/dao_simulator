// Arbitrator Agent - resolves disputes
// Upgraded with Q-learning to learn optimal dispute resolution strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Dispute } from '../data-structures/dispute';
import { Violation } from '../data-structures/violation';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type ArbitratorAction = 'resolve_high_priority' | 'resolve_oldest' | 'resolve_project_related' | 'conserve_capacity' | 'hold';

export class Arbitrator extends DAOMember {
  static readonly ACTIONS: readonly ArbitratorAction[] = [
    'resolve_high_priority', 'resolve_oldest', 'resolve_project_related', 'conserve_capacity', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  arbitrationCapacity: number;
  private maxArbitrationCapacity: number;
  resolvedDisputes: Dispute[] = [];
  private capacityRegenRate: number;

  // Learning tracking
  lastAction: ArbitratorAction | null = null;
  lastState: string | null = null;
  disputesResolved: number = 0;
  violationsCreated: number = 0;
  resolutionHistory: Array<{ importance: number; hadViolation: boolean }> = [];

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
    // Validate and sanitize capacity parameters
    const sanitizedCapacity = Number.isFinite(arbitrationCapacity) && arbitrationCapacity > 0
      ? arbitrationCapacity
      : 10;
    const sanitizedRegenRate = Number.isFinite(capacityRegenRate) && capacityRegenRate >= 0
      ? Math.min(1, capacityRegenRate)  // Cap at 100% regen per step
      : 0.1;
    this.arbitrationCapacity = sanitizedCapacity;
    this.maxArbitrationCapacity = sanitizedCapacity;
    this.capacityRegenRate = sanitizedRegenRate;

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
   * Get state representation for arbitration decisions
   */
  private getArbitrationState(): string {
    if (!this.model.dao) return 'none|adequate|low';

    // Dispute queue state
    const pendingDisputes = this.model.dao.disputes.filter(d => !d.resolved);
    const queueState = pendingDisputes.length === 0 ? 'none' :
                       pendingDisputes.length < 3 ? 'few' :
                       pendingDisputes.length < 6 ? 'normal' : 'backlog';

    // Capacity state
    const capacityRatio = this.arbitrationCapacity / Math.max(1, this.maxArbitrationCapacity);
    const capacityState = capacityRatio < 0.2 ? 'depleted' :
                          capacityRatio < 0.5 ? 'low' :
                          capacityRatio < 0.8 ? 'adequate' : 'full';

    // Priority state (based on importance of pending disputes)
    const avgImportance = pendingDisputes.length > 0
      ? pendingDisputes.reduce((sum, d) => sum + d.importance, 0) / pendingDisputes.length
      : 0;
    const priorityState = avgImportance < 0.3 ? 'low' :
                          avgImportance < 0.6 ? 'moderate' :
                          avgImportance < 0.8 ? 'high' : 'critical';

    return StateDiscretizer.combineState(queueState, capacityState, priorityState);
  }

  /**
   * Choose arbitration action using Q-learning
   */
  private chooseArbitrationAction(): ArbitratorAction {
    const state = this.getArbitrationState();

    if (!settings.learning_enabled) {
      return this.heuristicArbitrationAction();
    }

    return this.learning.selectAction(
      state,
      [...Arbitrator.ACTIONS]
    ) as ArbitratorAction;
  }

  /**
   * Heuristic-based arbitration action (fallback)
   */
  private heuristicArbitrationAction(): ArbitratorAction {
    if (!this.model.dao) return 'hold';

    const pendingDisputes = this.model.dao.disputes.filter(d => !d.resolved);
    if (pendingDisputes.length === 0) return 'hold';

    // Low capacity -> conserve
    if (this.arbitrationCapacity < this.maxArbitrationCapacity * 0.2) {
      return 'conserve_capacity';
    }

    // High priority disputes exist
    const highPriority = pendingDisputes.filter(d => d.importance > 0.7);
    if (highPriority.length > 0) {
      return 'resolve_high_priority';
    }

    // Project-related disputes
    const projectDisputes = pendingDisputes.filter(d => d.project !== null);
    if (projectDisputes.length > 0) {
      return 'resolve_project_related';
    }

    return 'resolve_oldest';
  }

  /**
   * Execute arbitration action and return reward
   */
  private executeArbitrationAction(action: ArbitratorAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    const pendingDisputes = this.model.dao.disputes.filter(d => !d.resolved);

    switch (action) {
      case 'resolve_high_priority': {
        const sorted = pendingDisputes.sort((a, b) => b.importance - a.importance);
        if (sorted.length > 0 && this.arbitrationCapacity > 0) {
          this.arbitrate(sorted[0]);
          reward = 0.5 + sorted[0].importance;
        }
        break;
      }
      case 'resolve_oldest': {
        if (pendingDisputes.length > 0 && this.arbitrationCapacity > 0) {
          this.arbitrate(pendingDisputes[0]);
          reward = 0.3;
        }
        break;
      }
      case 'resolve_project_related': {
        const projectDisputes = pendingDisputes.filter(d => d.project !== null);
        if (projectDisputes.length > 0 && this.arbitrationCapacity > 0) {
          this.arbitrate(projectDisputes[0]);
          reward = 0.4;
        }
        break;
      }
      case 'conserve_capacity':
        reward = this.arbitrationCapacity < this.maxArbitrationCapacity * 0.3 ? 0.2 : -0.1;
        break;
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Update Q-values based on arbitration outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from resolution efficiency
    const recentResolutions = this.resolutionHistory.slice(-10);
    const avgImportance = recentResolutions.length > 0
      ? recentResolutions.reduce((sum, r) => sum + r.importance, 0) / recentResolutions.length
      : 0;

    let reward = avgImportance * 3 + (this.disputesResolved * 0.1);
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getArbitrationState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Arbitrator.ACTIONS]
    );

    // Limit history size
    if (this.resolutionHistory.length > 50) {
      this.resolutionHistory.splice(0, this.resolutionHistory.length - 50);
    }
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Regenerate some capacity each step (prevents permanent depletion)
    this.regenerateCapacity();

    // Track state before action
    this.lastState = this.getArbitrationState();

    // Choose and execute action
    if (this.model.dao && this.model.dao.disputes.length > 0) {
      const action = this.chooseArbitrationAction();
      this.executeArbitrationAction(action);
      this.lastAction = action;
    }

    // Standard governance participation
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
    this.disputesResolved++;
    this.markActive();

    let hadViolation = false;

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
      this.violationsCreated++;
      hadViolation = true;

      // Penalize the violator
      const violator = this.model.dao.members.find(m => m.uniqueId === dispute.member);
      if (violator) {
        violator.reputation = Math.max(0, violator.reputation - this.model.dao.reputationPenalty);

        // Slash staked tokens (clamped to available staked tokens)
        const rawSlash = violator.stakedTokens * (this.model.dao.slashFraction * dispute.importance);
        const slashAmount = Math.min(rawSlash, violator.stakedTokens);
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

    // Track for learning
    this.resolutionHistory.push({ importance: dispute.importance, hadViolation });
    this.resolvedDisputes.push(dispute);
  }

  resolveDispute(dispute: Dispute): void {
    this.resolvedDisputes.push(dispute);
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
    disputesResolved: number;
    violationsCreated: number;
    capacityRatio: number;
  } {
    const capacityRatio = this.arbitrationCapacity / Math.max(1, this.maxArbitrationCapacity);

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      disputesResolved: this.disputesResolved,
      violationsCreated: this.violationsCreated,
      capacityRatio,
    };
  }
}
