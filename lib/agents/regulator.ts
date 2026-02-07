// Regulator Agent - ensures compliance
// Upgraded with Q-learning to learn optimal compliance checking strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';
import { Violation } from '../data-structures/violation';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Compliance thresholds (configurable)
export interface ComplianceConfig {
  maxFundingGoal: number;
  maxDuration: number;
  requiresEnvironmentalAssessment: boolean;
  requiresSafetyReview: boolean;
}

const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  maxFundingGoal: 10000,
  maxDuration: 365,
  requiresEnvironmentalAssessment: true,
  requiresSafetyReview: true,
};

type RegulatorAction = 'inspect_high_value' | 'inspect_long_duration' | 'inspect_random' | 'deep_audit' | 'issue_warning' | 'hold';

export class Regulator extends DAOMember {
  static readonly ACTIONS: readonly RegulatorAction[] = [
    'inspect_high_value', 'inspect_long_duration', 'inspect_random', 'deep_audit', 'issue_warning', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  complianceEnsured: Array<{ project: Project; requirement: string }> = [];
  complianceConfig: ComplianceConfig;
  inspectionCount: number = 0;

  // Learning tracking
  lastAction: RegulatorAction | null = null;
  lastState: string | null = null;
  violationsFound: number = 0;
  falsePositives: number = 0;
  inspectionHistory: Array<{ foundViolation: boolean }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string,
    complianceConfig: Partial<ComplianceConfig> = {}
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.complianceConfig = { ...DEFAULT_COMPLIANCE_CONFIG, ...complianceConfig };

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
   * Get state representation for compliance decisions
   */
  private getComplianceState(): string {
    if (!this.model.dao) return 'none|low|low';

    // Project availability state
    const projects = this.model.dao.projects;
    const projectState = projects.length === 0 ? 'none' :
                         projects.length < 3 ? 'few' :
                         projects.length < 8 ? 'normal' : 'many';

    // Risk level state (projects near limits)
    const riskyProjects = projects.filter(p =>
      p.fundingGoal > this.complianceConfig.maxFundingGoal * 0.8 ||
      p.duration > this.complianceConfig.maxDuration * 0.8
    );
    const riskRatio = projects.length > 0 ? riskyProjects.length / projects.length : 0;
    const riskState = riskRatio < 0.1 ? 'low' :
                      riskRatio < 0.3 ? 'moderate' :
                      riskRatio < 0.5 ? 'high' : 'critical';

    // Efficiency state
    const recentInspections = this.inspectionHistory.slice(-10);
    const violationRate = recentInspections.length > 0
      ? recentInspections.filter(i => i.foundViolation).length / recentInspections.length
      : 0;
    const efficiencyState = violationRate < 0.1 ? 'low' :
                            violationRate < 0.3 ? 'moderate' :
                            violationRate < 0.5 ? 'high' : 'excellent';

    return StateDiscretizer.combineState(projectState, riskState, efficiencyState);
  }

  /**
   * Choose compliance action using Q-learning
   */
  private chooseComplianceAction(): RegulatorAction {
    const state = this.getComplianceState();

    if (!settings.learning_enabled) {
      return this.heuristicComplianceAction();
    }

    return this.learning.selectAction(
      state,
      [...Regulator.ACTIONS]
    ) as RegulatorAction;
  }

  /**
   * Heuristic-based compliance action (fallback)
   */
  private heuristicComplianceAction(): RegulatorAction {
    if (!this.model.dao || this.model.dao.projects.length === 0) return 'hold';

    const projects = this.model.dao.projects;

    // Find high-value projects
    const highValueProjects = projects.filter(
      p => p.fundingGoal > this.complianceConfig.maxFundingGoal * 0.7
    );
    if (highValueProjects.length > 0 && random() < 0.4) {
      return 'inspect_high_value';
    }

    // Find long-duration projects
    const longProjects = projects.filter(
      p => p.duration > this.complianceConfig.maxDuration * 0.7
    );
    if (longProjects.length > 0 && random() < 0.3) {
      return 'inspect_long_duration';
    }

    // Deep audit occasionally
    if (random() < 0.1) {
      return 'deep_audit';
    }

    return 'inspect_random';
  }

  /**
   * Execute compliance action and return reward
   */
  private executeComplianceAction(action: RegulatorAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    const projects = this.model.dao.projects;

    switch (action) {
      case 'inspect_high_value': {
        const highValueProjects = projects.filter(
          p => p.fundingGoal > this.complianceConfig.maxFundingGoal * 0.7
        );
        if (highValueProjects.length > 0) {
          const project = randomChoice(highValueProjects);
          const foundViolation = !this.checkProjectCompliance(project);
          this.inspectionHistory.push({ foundViolation });
          reward = foundViolation ? 1.5 : 0.2;
        }
        break;
      }
      case 'inspect_long_duration': {
        const longProjects = projects.filter(
          p => p.duration > this.complianceConfig.maxDuration * 0.7
        );
        if (longProjects.length > 0) {
          const project = randomChoice(longProjects);
          const foundViolation = !this.checkProjectCompliance(project);
          this.inspectionHistory.push({ foundViolation });
          reward = foundViolation ? 1.2 : 0.2;
        }
        break;
      }
      case 'inspect_random': {
        if (projects.length > 0) {
          const project = randomChoice(projects);
          const foundViolation = !this.checkProjectCompliance(project);
          this.inspectionHistory.push({ foundViolation });
          reward = foundViolation ? 1.0 : 0.1;
        }
        break;
      }
      case 'deep_audit': {
        // Inspect multiple projects
        const toAudit = projects.slice(0, Math.min(3, projects.length));
        let violationsFound = 0;
        for (const project of toAudit) {
          if (!this.checkProjectCompliance(project)) {
            violationsFound++;
          }
        }
        this.inspectionHistory.push({ foundViolation: violationsFound > 0 });
        reward = violationsFound * 0.8;
        break;
      }
      case 'issue_warning': {
        // Issue warnings to projects near limits
        const nearLimitProjects = projects.filter(p =>
          (p.fundingGoal > this.complianceConfig.maxFundingGoal * 0.9 &&
           p.fundingGoal <= this.complianceConfig.maxFundingGoal) ||
          (p.duration > this.complianceConfig.maxDuration * 0.9 &&
           p.duration <= this.complianceConfig.maxDuration)
        );
        if (nearLimitProjects.length > 0) {
          reward = 0.3 * nearLimitProjects.length;
          if (this.model.eventBus) {
            for (const project of nearLimitProjects) {
              this.model.eventBus.publish('compliance_warning', {
                step: this.model.currentStep,
                project: project.title,
                regulator: this.uniqueId,
              });
            }
          }
        }
        break;
      }
      case 'hold':
        return 0;
    }

    this.inspectionCount++;
    this.markActive();
    return reward;
  }

  /**
   * Update Q-values based on inspection outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from inspection efficiency
    const recentInspections = this.inspectionHistory.slice(-5);
    const violationRate = recentInspections.length > 0
      ? recentInspections.filter(i => i.foundViolation).length / recentInspections.length
      : 0;

    let reward = violationRate * 5;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getComplianceState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Regulator.ACTIONS]
    );

    // Limit history size
    if (this.inspectionHistory.length > 50) {
      this.inspectionHistory.splice(0, this.inspectionHistory.length - 50);
    }
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getComplianceState();

    // Choose and execute action
    const action = this.chooseComplianceAction();
    this.executeComplianceAction(action);
    this.lastAction = action;

    // Standard governance participation
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  ensureComplianceOnRandomProject(): void {
    if (!this.model.dao || this.model.dao.projects.length === 0) return;

    const project = randomChoice(this.model.dao.projects);

    const requirements: string[] = [];
    if (this.complianceConfig.requiresEnvironmentalAssessment) {
      requirements.push('Environmental impact assessment');
    }
    if (this.complianceConfig.requiresSafetyReview) {
      requirements.push('Safety regulations');
    }

    if (requirements.length === 0) return;

    const requirement = randomChoice(requirements);
    const complianceIssue = { project, requirement };
    this.ensureCompliance(complianceIssue);
    this.inspectionCount++;
  }

  ensureCompliance(complianceIssue: { project: Project; requirement: string }): void {
    if (this.checkProjectCompliance(complianceIssue.project)) {
      this.complianceEnsured.push(complianceIssue);
    }
  }

  checkProjectCompliance(project: Project): boolean {
    const { maxFundingGoal, maxDuration } = this.complianceConfig;

    // Configurable compliance rules
    const fundingCompliant = project.fundingGoal <= maxFundingGoal;
    const durationCompliant = project.duration <= maxDuration;
    const compliant = fundingCompliant && durationCompliant;

    if (!compliant) {
      this.violationsFound++;
      this.flagProposalForViolation(project, {
        fundingExceeded: !fundingCompliant,
        durationExceeded: !durationCompliant,
      });
    }

    if (this.model.eventBus) {
      this.model.eventBus.publish('compliance_checked', {
        step: this.model.currentStep,
        project: project.title,
        compliant,
        fundingGoal: project.fundingGoal,
        duration: project.duration,
        limits: { maxFundingGoal, maxDuration },
      });
    }

    return compliant;
  }

  flagProposalForViolation(
    project: Project,
    violations: { fundingExceeded: boolean; durationExceeded: boolean }
  ): void {
    if (!this.model.dao) return;

    const violator = project.creator;
    const reasons: string[] = [];

    if (violations.fundingExceeded) {
      reasons.push(`funding goal ${project.fundingGoal} exceeds limit ${this.complianceConfig.maxFundingGoal}`);
    }
    if (violations.durationExceeded) {
      reasons.push(`duration ${project.duration} exceeds limit ${this.complianceConfig.maxDuration}`);
    }

    const description = `Project '${project.title}' failed compliance: ${reasons.join(', ')}`;
    const violation = new Violation(violator, project, description);

    this.model.dao.addViolation(violation);

    if (this.model.eventBus) {
      this.model.eventBus.publish('violation_created', {
        step: this.model.currentStep,
        project: project.title,
        violator,
        description,
        violations,
      });
    }
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
    inspectionCount: number;
    violationsFound: number;
    detectionRate: number;
  } {
    const detectionRate = this.inspectionCount > 0
      ? this.violationsFound / this.inspectionCount
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      inspectionCount: this.inspectionCount,
      violationsFound: this.violationsFound,
      detectionRate,
    };
  }
}
