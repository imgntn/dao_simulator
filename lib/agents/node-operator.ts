/**
 * Node Operator Agent
 *
 * Represents validator operators in Lido's node operator set.
 * Subject to DAO oversight, manages validators, and earns fees.
 * Upgraded with Q-learning for optimal validator management strategies.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { DAOModel } from '../engine/model';
import { random, randomInt } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type OperatorAction = 'expand_validators' | 'maintain_performance' | 'optimize_fees' | 'request_limit_increase' | 'conservative' | 'hold';

export interface ValidatorStats {
  active: number;
  pending: number;
  exited: number;
  slashed: number;
}

export interface OperatorPerformance {
  uptime: number;          // 0-1
  attestationRate: number; // 0-1
  proposalRate: number;    // 0-1
  slashings: number;
  lastUpdatedStep: number;
}

export class NodeOperator extends DAOMember {
  static readonly ACTIONS: readonly OperatorAction[] = [
    'expand_validators', 'maintain_performance', 'optimize_fees', 'request_limit_increase', 'conservative', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Operator properties
  operatorName: string;
  maxValidators: number;
  currentValidators: ValidatorStats;

  // Performance metrics
  performance: OperatorPerformance;

  // Economic
  operatorFeePercent: number;  // Fee charged (typically 5-10%)
  totalFeesEarned: number = 0;
  stakeBond: number = 0;  // Bond posted for slashing protection

  // Behavioral traits
  reliability: number;     // How reliable the operator is
  expansionWillingness: number;  // Willingness to take on more validators

  // Status
  isApproved: boolean = true;
  isCapped: boolean = false;  // Reached max validators

  // Learning tracking
  lastAction: OperatorAction | null = null;
  lastState: string | null = null;
  expansionRequests: number = 0;
  performanceOptimizations: number = 0;
  limitIncreaseRequests: number = 0;

  // Transient state for decideVote override
  private pendingOperatorAssessment: boolean | null = null;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    operatorName?: string,
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'majority', daoId);

    this.operatorName = operatorName || `Operator_${uniqueId}`;

    // Initialize validator counts
    const initialValidators = randomInt(10, 100);
    this.maxValidators = initialValidators + randomInt(50, 200);
    this.currentValidators = {
      active: initialValidators,
      pending: randomInt(0, 5),
      exited: 0,
      slashed: 0,
    };

    // Performance
    this.performance = {
      uptime: 0.95 + random() * 0.05,  // 95-100%
      attestationRate: 0.95 + random() * 0.05,
      proposalRate: 0.9 + random() * 0.1,
      slashings: 0,
      lastUpdatedStep: model.currentStep,
    };

    // Economics
    this.operatorFeePercent = 5 + random() * 5;  // 5-10%

    // Behavioral traits
    this.reliability = 0.8 + random() * 0.2;  // 0.8-1.0
    this.expansionWillingness = 0.3 + random() * 0.5;  // 0.3-0.8

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
   * Override vote decision to use operator-specific assessment when available.
   */
  override decideVote(topic: Proposal | string): 'yes' | 'no' {
    if (this.pendingOperatorAssessment !== null) {
      return this.pendingOperatorAssessment ? 'yes' : 'no';
    }
    return super.decideVote(topic);
  }

  /**
   * Get state representation for operator decisions
   */
  private getOperatorState(): string {
    // Capacity state
    const capacityRatio = this.currentValidators.active / Math.max(1, this.maxValidators);
    const capacityState = capacityRatio < 0.5 ? 'underutilized' :
                          capacityRatio < 0.8 ? 'moderate' :
                          capacityRatio < 0.95 ? 'near_cap' : 'capped';

    // Performance state
    const perfScore = this.getPerformanceScore();
    const performanceState = perfScore < 0.9 ? 'poor' :
                             perfScore < 0.95 ? 'adequate' :
                             perfScore < 0.98 ? 'good' : 'excellent';

    // Slashing risk state
    const slashRisk = this.performance.slashings > 0 ? 'risky' :
                      this.reliability < 0.9 ? 'moderate' : 'low';

    return StateDiscretizer.combineState(capacityState, performanceState, slashRisk);
  }

  /**
   * Choose operator action using Q-learning
   */
  private chooseOperatorAction(): OperatorAction {
    const state = this.getOperatorState();

    if (!settings.learning_enabled) {
      return this.heuristicOperatorAction();
    }

    return this.learning.selectAction(
      state,
      [...NodeOperator.ACTIONS]
    ) as OperatorAction;
  }

  /**
   * Heuristic-based operator action (fallback)
   */
  private heuristicOperatorAction(): OperatorAction {
    const capacityRatio = this.currentValidators.active / Math.max(1, this.maxValidators);

    // Capped -> request limit increase
    if (this.isCapped && this.expansionWillingness > 0.6) {
      return 'request_limit_increase';
    }

    // Poor performance -> maintain
    if (this.getPerformanceScore() < 0.95) {
      return 'maintain_performance';
    }

    // Room to grow -> expand
    if (capacityRatio < 0.8 && this.expansionWillingness > 0.5) {
      return 'expand_validators';
    }

    // Default to conservative
    return 'conservative';
  }

  /**
   * Execute operator action and return reward
   */
  private executeOperatorAction(action: OperatorAction): number {
    let reward = 0;

    switch (action) {
      case 'expand_validators': {
        if (!this.isCapped && this.currentValidators.active < this.maxValidators) {
          const toAdd = Math.min(
            randomInt(1, 5),
            this.maxValidators - this.currentValidators.active - this.currentValidators.pending
          );
          if (toAdd > 0) {
            this.currentValidators.pending += toAdd;
            this.expansionRequests++;
            reward = 0.4;
          }
        }
        break;
      }
      case 'maintain_performance': {
        // Boost performance slightly
        this.performance.uptime = Math.min(1, this.performance.uptime + 0.01);
        this.performance.attestationRate = Math.min(1, this.performance.attestationRate + 0.01);
        this.performanceOptimizations++;
        reward = 0.3;
        break;
      }
      case 'optimize_fees': {
        // Small fee adjustment based on market
        const adjustment = (random() - 0.5) * 0.5;
        this.operatorFeePercent = Math.max(5, Math.min(10, this.operatorFeePercent + adjustment));
        reward = 0.2;
        break;
      }
      case 'request_limit_increase': {
        if (this.isCapped) {
          this.requestLimitIncrease(randomInt(10, 50));
          this.limitIncreaseRequests++;
          reward = 0.35;
        }
        break;
      }
      case 'conservative':
        reward = 0.1;  // Small reward for prudent management
        break;
      case 'hold':
        return 0;
    }

    this.markActive();
    return reward;
  }

  /**
   * Update Q-values based on operator outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from fees and performance
    const feeReward = this.totalFeesEarned * 0.01;
    const performanceReward = this.getPerformanceScore() * 2;
    const slashingPenalty = this.performance.slashings * -5;

    let reward = feeReward + performanceReward + slashingPenalty;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getOperatorState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...NodeOperator.ACTIONS]
    );
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getOperatorState();

    // Update performance metrics
    this.updatePerformance();

    // Choose and execute action using Q-learning
    if (random() < 0.15) {
      const action = this.chooseOperatorAction();
      this.executeOperatorAction(action);
      this.lastAction = action;
    }

    // Process validator operations (as secondary behavior)
    if (random() < 0.05) {
      this.manageValidators();
    }

    // Vote on proposals affecting operators
    if (random() < 0.15) {
      this.voteOnOperatorProposals();
    }

    // Earn fees
    this.earnFees();
  }

  /**
   * Update performance metrics
   */
  private updatePerformance(): void {
    // Small random fluctuations in performance
    this.performance.uptime = Math.min(1, Math.max(0.9,
      this.performance.uptime + (random() - 0.5) * 0.01));
    this.performance.attestationRate = Math.min(1, Math.max(0.9,
      this.performance.attestationRate + (random() - 0.5) * 0.01));
    this.performance.lastUpdatedStep = this.model.currentStep;

    // Rare slashing events
    if (random() < 0.0001 * (1 - this.reliability)) {
      this.handleSlashing();
    }
  }

  /**
   * Manage validator set
   */
  private manageValidators(): void {
    // Activate pending validators
    if (this.currentValidators.pending > 0 && random() < 0.3) {
      const toActivate = Math.min(this.currentValidators.pending, randomInt(1, 3));
      this.currentValidators.pending -= toActivate;
      this.currentValidators.active += toActivate;
    }

    // Request more validators if willing and not capped
    if (!this.isCapped &&
        this.currentValidators.active < this.maxValidators &&
        random() < this.expansionWillingness * 0.1) {
      const toAdd = Math.min(
        randomInt(1, 5),
        this.maxValidators - this.currentValidators.active - this.currentValidators.pending
      );
      if (toAdd > 0) {
        this.currentValidators.pending += toAdd;

        if (this.model.eventBus) {
          this.model.eventBus.publish('node_operator_expansion', {
            step: this.model.currentStep,
            operatorId: this.uniqueId,
            operatorName: this.operatorName,
            validatorsRequested: toAdd,
            currentActive: this.currentValidators.active,
            maxValidators: this.maxValidators,
          });
        }
      }
    }

    // Check if capped
    this.isCapped = (this.currentValidators.active + this.currentValidators.pending) >= this.maxValidators;
  }

  /**
   * Handle a slashing event
   */
  private handleSlashing(): void {
    this.currentValidators.slashed++;
    this.currentValidators.active = Math.max(0, this.currentValidators.active - 1);
    this.performance.slashings++;

    // Reputation hit
    this.reputation = Math.max(0, this.reputation - 10);

    if (this.model.eventBus) {
      this.model.eventBus.publish('node_operator_slashed', {
        step: this.model.currentStep,
        operatorId: this.uniqueId,
        operatorName: this.operatorName,
        totalSlashings: this.performance.slashings,
      });
    }
  }

  /**
   * Vote on proposals affecting node operators
   */
  private voteOnOperatorProposals(): void {
    if (!this.model.dao) return;

    const proposals = this.model.dao.proposals.filter(
      p => p.status === 'open' &&
           !this.votes.has(p.uniqueId) &&
           this.isOperatorRelated(p)
    );

    for (const proposal of proposals) {
      // Store assessment for decideVote override, then vote through base pipeline
      this.pendingOperatorAssessment = this.assessOperatorProposal(proposal);
      this.voteOnProposal(proposal);
      this.pendingOperatorAssessment = null;
      break;  // One vote per step
    }
  }

  /**
   * Check if proposal affects operators
   */
  private isOperatorRelated(proposal: Proposal): boolean {
    const titleLower = proposal.title.toLowerCase();
    const keywords = [
      'node', 'operator', 'validator', 'stake', 'limit',
      'fee', 'slashing', 'exit', 'onboard'
    ];
    return keywords.some(kw => titleLower.includes(kw));
  }

  /**
   * Assess proposal impact on operators
   */
  private assessOperatorProposal(proposal: Proposal): boolean {
    const titleLower = proposal.title.toLowerCase();

    // Support proposals that benefit operators
    if (titleLower.includes('increase') && titleLower.includes('limit')) {
      return true;
    }

    if (titleLower.includes('onboard') || titleLower.includes('add')) {
      // Existing operators may be neutral or against new competition
      return random() < 0.5;
    }

    if (titleLower.includes('slash') || titleLower.includes('penalty')) {
      // Generally against increased penalties
      return random() < 0.3;
    }

    // Default to supporting governance
    return random() < 0.6;
  }

  /**
   * Earn fees based on active validators
   */
  private earnFees(): void {
    // Simplified fee calculation
    const baseReward = this.currentValidators.active * 0.01;  // Per step
    const fee = baseReward * (this.operatorFeePercent / 100);
    this.totalFeesEarned += fee;
    this.tokens += fee;
  }

  /**
   * Request to increase max validators (requires DAO approval)
   */
  requestLimitIncrease(amount: number): boolean {
    if (!this.model.dao) return false;

    // This would typically create a proposal
    if (this.model.eventBus) {
      this.model.eventBus.publish('node_operator_limit_request', {
        step: this.model.currentStep,
        operatorId: this.uniqueId,
        operatorName: this.operatorName,
        currentMax: this.maxValidators,
        requestedIncrease: amount,
      });
    }

    return true;
  }

  /**
   * Exit validators voluntarily
   */
  exitValidators(count: number): boolean {
    if (count > this.currentValidators.active) {
      return false;
    }

    this.currentValidators.active -= count;
    this.currentValidators.exited += count;
    this.isCapped = false;

    if (this.model.eventBus) {
      this.model.eventBus.publish('node_operator_exit', {
        step: this.model.currentStep,
        operatorId: this.uniqueId,
        operatorName: this.operatorName,
        validatorsExited: count,
        remainingActive: this.currentValidators.active,
      });
    }

    return true;
  }

  /**
   * Get overall performance score
   */
  getPerformanceScore(): number {
    const uptimeWeight = 0.4;
    const attestationWeight = 0.4;
    const proposalWeight = 0.2;

    return (
      this.performance.uptime * uptimeWeight +
      this.performance.attestationRate * attestationWeight +
      this.performance.proposalRate * proposalWeight
    );
  }

  /**
   * Get operator statistics
   */
  getOperatorStats(): {
    operatorName: string;
    validators: ValidatorStats;
    maxValidators: number;
    performance: OperatorPerformance;
    performanceScore: number;
    totalFeesEarned: number;
    isApproved: boolean;
    isCapped: boolean;
  } {
    return {
      operatorName: this.operatorName,
      validators: { ...this.currentValidators },
      maxValidators: this.maxValidators,
      performance: { ...this.performance },
      performanceScore: this.getPerformanceScore(),
      totalFeesEarned: this.totalFeesEarned,
      isApproved: this.isApproved,
      isCapped: this.isCapped,
    };
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
    activeValidators: number;
    performanceScore: number;
    expansionRequests: number;
    limitIncreaseRequests: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      activeValidators: this.currentValidators.active,
      performanceScore: this.getPerformanceScore(),
      expansionRequests: this.expansionRequests,
      limitIncreaseRequests: this.limitIncreaseRequests,
    };
  }
}
