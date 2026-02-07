// Validator Agent - monitors projects
// Upgraded with Q-learning to learn optimal project monitoring strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';
import { Dispute } from '../data-structures/dispute';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type ValidatorAction = 'monitor_risky' | 'monitor_behind' | 'monitor_large' | 'monitor_random' | 'dispute' | 'hold';

export class Validator extends DAOMember {
  static readonly ACTIONS: readonly ValidatorAction[] = [
    'monitor_risky', 'monitor_behind', 'monitor_large', 'monitor_random', 'dispute', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  monitoringBudget: number;
  maxMonitoringBudget: number;
  monitoredProjects: Set<Project> = new Set();

  // Learning tracking
  lastAction: ValidatorAction | null = null;
  lastState: string | null = null;
  disputeOutcomes: Array<{ valid: boolean }> = [];
  projectsMonitored: number = 0;
  validDisputesRaised: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    monitoringBudget: number = 100
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Validate and sanitize monitoring budget
    this.monitoringBudget = Number.isFinite(monitoringBudget) && monitoringBudget >= 0
      ? monitoringBudget
      : 100;
    this.maxMonitoringBudget = this.monitoringBudget;

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
   * Get state representation for monitoring decisions
   */
  private getMonitoringState(): string {
    if (!this.model.dao) return 'none|adequate|low';

    // Project availability state
    const projects = this.model.dao.projects;
    const projectState = projects.length === 0 ? 'none' :
                         projects.length < 3 ? 'few' :
                         projects.length < 8 ? 'normal' : 'many';

    // Budget state
    const budgetRatio = this.monitoringBudget / Math.max(1, this.maxMonitoringBudget);
    const budgetState = budgetRatio < 0.2 ? 'depleted' :
                        budgetRatio < 0.5 ? 'low' :
                        budgetRatio < 0.8 ? 'adequate' : 'flush';

    // Risk level state
    const riskyProjects = projects.filter(p => {
      const elapsed = Math.max(this.model.currentStep - p.startTime, 0);
      const dur = Math.max(p.duration, 1);
      const progressRatio = p.totalWork() / dur;
      const elapsedRatio = Math.min(elapsed / dur, 1.0);
      return progressRatio + 0.1 < elapsedRatio;
    });
    const riskRatio = projects.length > 0 ? riskyProjects.length / projects.length : 0;
    const riskState = riskRatio < 0.1 ? 'low' :
                      riskRatio < 0.3 ? 'moderate' :
                      riskRatio < 0.5 ? 'high' : 'critical';

    return StateDiscretizer.combineState(projectState, budgetState, riskState);
  }

  /**
   * Choose monitoring action using Q-learning
   */
  private chooseMonitoringAction(): ValidatorAction {
    const state = this.getMonitoringState();

    if (!settings.learning_enabled) {
      return this.heuristicMonitoringAction();
    }

    return this.learning.selectAction(
      state,
      [...Validator.ACTIONS]
    ) as ValidatorAction;
  }

  /**
   * Heuristic-based monitoring action (fallback)
   */
  private heuristicMonitoringAction(): ValidatorAction {
    if (!this.model.dao || this.model.dao.projects.length === 0) return 'hold';
    if (this.monitoringBudget <= 0) return 'hold';

    const projects = this.model.dao.projects;

    // Find risky projects
    const riskyProjects = projects.filter(p => {
      const elapsed = Math.max(this.model.currentStep - p.startTime, 0);
      const dur = Math.max(p.duration, 1);
      const progressRatio = p.totalWork() / dur;
      const elapsedRatio = Math.min(elapsed / dur, 1.0);
      return progressRatio + 0.1 < elapsedRatio;
    });

    if (riskyProjects.length > 0) {
      return 'monitor_risky';
    }

    // Find large projects
    const largeProjects = projects.filter(p => p.fundingGoal > 1000);
    if (largeProjects.length > 0 && random() < 0.3) {
      return 'monitor_large';
    }

    return 'monitor_random';
  }

  /**
   * Execute monitoring action and return reward
   */
  private executeMonitoringAction(action: ValidatorAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    const projects = this.model.dao.projects;

    switch (action) {
      case 'monitor_risky': {
        const riskyProjects = projects.filter(p => {
          const elapsed = Math.max(this.model.currentStep - p.startTime, 0);
          const dur = Math.max(p.duration, 1);
          const progressRatio = p.totalWork() / dur;
          const elapsedRatio = Math.min(elapsed / dur, 1.0);
          return progressRatio + 0.1 < elapsedRatio;
        });
        if (riskyProjects.length > 0 && this.monitoringBudget > 0) {
          const project = randomChoice(riskyProjects);
          const foundIssue = this.monitorProject(project);
          reward = foundIssue ? 1.0 : 0.2;
        }
        break;
      }
      case 'monitor_behind': {
        const behindProjects = projects.filter(p => {
          const elapsed = Math.max(this.model.currentStep - p.startTime, 0);
          const dur = Math.max(p.duration, 1);
          const progressRatio = p.totalWork() / dur;
          const elapsedRatio = Math.min(elapsed / dur, 1.0);
          return progressRatio + 0.05 < elapsedRatio;
        });
        if (behindProjects.length > 0 && this.monitoringBudget > 0) {
          const project = randomChoice(behindProjects);
          const foundIssue = this.monitorProject(project);
          reward = foundIssue ? 1.5 : 0.3;
        }
        break;
      }
      case 'monitor_large': {
        const largeProjects = projects.filter(p => p.fundingGoal > 1000);
        if (largeProjects.length > 0 && this.monitoringBudget > 0) {
          const project = randomChoice(largeProjects);
          const foundIssue = this.monitorProject(project);
          reward = foundIssue ? 1.2 : 0.2;
        }
        break;
      }
      case 'monitor_random': {
        if (projects.length > 0 && this.monitoringBudget > 0) {
          const project = randomChoice(projects);
          const foundIssue = this.monitorProject(project);
          reward = foundIssue ? 0.8 : 0.1;
        }
        break;
      }
      case 'dispute': {
        // Raise dispute on any behind project
        const behindProjects = projects.filter(p => {
          const elapsed = Math.max(this.model.currentStep - p.startTime, 0);
          const dur = Math.max(p.duration, 1);
          const progressRatio = p.totalWork() / dur;
          const elapsedRatio = Math.min(elapsed / dur, 1.0);
          return progressRatio + 0.05 < elapsedRatio && !this.monitoredProjects.has(p);
        });
        if (behindProjects.length > 0) {
          const project = randomChoice(behindProjects);
          this.raiseDispute(project);
          reward = 0.5;
        } else {
          reward = -0.5; // Penalty for frivolous dispute attempt
        }
        break;
      }
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Raise a dispute for a project
   */
  private raiseDispute(project: Project): void {
    if (!this.model.dao) return;

    const dispute = new Dispute(
      this.model.dao,
      [project.creator],
      'Project behind schedule',
      1,
      project,
      null
    );

    this.model.dao.addDispute(dispute);
    this.validDisputesRaised++;

    if (this.model.eventBus) {
      this.model.eventBus.publish('project_disputed', {
        step: this.model.currentStep,
        project: project.title,
        validator: this.uniqueId,
      });
    }
  }

  /**
   * Update Q-values based on monitoring outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from monitoring efficiency
    const monitoringEfficiency = this.projectsMonitored > 0
      ? this.validDisputesRaised / this.projectsMonitored
      : 0;

    let reward = monitoringEfficiency * 5;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getMonitoringState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Validator.ACTIONS]
    );
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getMonitoringState();

    // Choose and execute action
    const action = this.chooseMonitoringAction();
    this.executeMonitoringAction(action);
    this.lastAction = action;

    // Standard governance participation
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.3)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  monitorProjects(): void {
    if (!this.model.dao || this.model.dao.projects.length === 0) return;

    const project = randomChoice(this.model.dao.projects);

    if (this.monitoringBudget > 0) {
      this.monitorProject(project);
      this.monitoringBudget -= 1;
      this.markActive();
    }
  }

  monitorProject(project: Project): boolean {
    if (!this.model.dao) return false;

    this.monitoredProjects.add(project);
    this.projectsMonitored++;
    this.monitoringBudget = Math.max(0, this.monitoringBudget - 1);

    const total = project.totalWork();
    const dur = Math.max(project.duration, 1);
    const elapsed = Math.max(this.model.currentStep - project.startTime, 0);
    const progressRatio = total / dur;
    const elapsedRatio = Math.min(elapsed / dur, 1.0);
    const epsilon = 0.05;
    const behind = progressRatio + epsilon < elapsedRatio;

    if (behind) {
      const dispute = new Dispute(
        this.model.dao,
        [project.creator],
        'Project behind schedule',
        1,
        project,
        null
      );

      this.model.dao.addDispute(dispute);
      this.validDisputesRaised++;
      this.disputeOutcomes.push({ valid: true });

      if (this.model.eventBus) {
        this.model.eventBus.publish('project_disputed', {
          step: this.model.currentStep,
          project: project.title,
          validator: this.uniqueId,
        });
      }
    }

    if (this.model.eventBus) {
      this.model.eventBus.publish('project_monitored', {
        step: this.model.currentStep,
        project: project.title,
        progress: total,
        behind,
      });
    }

    this.markActive();
    return behind;
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
    projectsMonitored: number;
    validDisputesRaised: number;
    monitoringEfficiency: number;
  } {
    const efficiency = this.projectsMonitored > 0
      ? this.validDisputesRaised / this.projectsMonitored
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      projectsMonitored: this.projectsMonitored,
      validDisputesRaised: this.validDisputesRaised,
      monitoringEfficiency: efficiency,
    };
  }
}
