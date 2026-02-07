// Developer Agent
// Upgraded with Q-learning to learn optimal project selection strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type DeveloperAction = 'work_high_skill' | 'work_funded' | 'work_urgent' | 'work_popular' | 'hold';

export class Developer extends DAOMember {
  static readonly ACTIONS: readonly DeveloperAction[] = [
    'work_high_skill', 'work_funded', 'work_urgent', 'work_popular', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  skillset: string[];

  // Learning tracking
  lastAction: DeveloperAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  lastReputation: number;
  workOutputHistory: number[] = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string,
    skillset: string[] = ['Generic Code']
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.skillset = skillset;
    this.lastTokens = tokens;
    this.lastReputation = reputation;

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
   * Get state representation for work decisions
   */
  private getWorkState(): string {
    if (!this.model.dao) return 'none|low|low';

    const projects = this.model.dao.projects.filter(p => p.status === 'open');

    // Skill match state
    let skillMatchCount = 0;
    for (const project of projects) {
      const overlap = this.skillset.filter(s => project.requiredSkills.includes(s)).length;
      if (overlap > 0) skillMatchCount++;
    }
    const skillMatchRatio = projects.length > 0 ? skillMatchCount / projects.length : 0;
    const skillState = skillMatchRatio < 0.2 ? 'low' :
                       skillMatchRatio < 0.5 ? 'medium' : 'high';

    // Funding state - average funding ratio across projects
    let avgFundingRatio = 0;
    if (projects.length > 0) {
      for (const project of projects) {
        if (project.fundingGoal > 0) {
          avgFundingRatio += project.currentFunding / project.fundingGoal;
        }
      }
      avgFundingRatio /= projects.length;
    }
    const fundingState = avgFundingRatio < 0.3 ? 'low' :
                         avgFundingRatio < 0.7 ? 'medium' : 'high';

    // Work opportunity state
    const opportunityState = projects.length === 0 ? 'none' :
                             projects.length < 3 ? 'few' :
                             projects.length < 7 ? 'normal' : 'many';

    return StateDiscretizer.combineState(opportunityState, skillState, fundingState);
  }

  /**
   * Choose work action using Q-learning
   */
  private chooseWorkAction(): DeveloperAction {
    const state = this.getWorkState();

    if (!settings.learning_enabled) {
      return this.heuristicWorkAction();
    }

    return this.learning.selectAction(
      state,
      [...Developer.ACTIONS]
    ) as DeveloperAction;
  }

  /**
   * Heuristic-based work action (fallback)
   */
  private heuristicWorkAction(): DeveloperAction {
    if (!this.model.dao) return 'hold';

    const projects = this.model.dao.projects.filter(p => p.status === 'open');
    if (projects.length === 0) return 'hold';

    // Prefer high-skill match projects
    const skillMatches = projects.filter(p =>
      this.skillset.some(s => p.requiredSkills.includes(s))
    );
    if (skillMatches.length > 0) {
      return 'work_high_skill';
    }

    // Then prefer funded projects
    const funded = projects.filter(p => p.fundingGoal > 0 && p.currentFunding >= p.fundingGoal * 0.5);
    if (funded.length > 0) {
      return 'work_funded';
    }

    return 'work_popular';
  }

  /**
   * Execute work action and return reward
   */
  private executeWorkAction(action: DeveloperAction): number {
    if (!this.model.dao) return 0;

    const projects = this.model.dao.projects.filter(p => p.status === 'open');
    if (projects.length === 0 && action !== 'hold') return -0.1;

    let project: Project | null = null;
    let reward = 0;

    switch (action) {
      case 'work_high_skill': {
        // Find project with best skill match
        const skillMatches = projects.map(p => ({
          project: p,
          overlap: this.skillset.filter(s => p.requiredSkills.includes(s)).length
        })).filter(m => m.overlap > 0);

        if (skillMatches.length > 0) {
          skillMatches.sort((a, b) => b.overlap - a.overlap);
          project = skillMatches[0].project;
          reward = 0.2; // Bonus for skill match
        }
        break;
      }
      case 'work_funded': {
        // Find project with best funding ratio
        const funded = projects
          .filter(p => p.fundingGoal > 0)
          .map(p => ({ project: p, ratio: p.currentFunding / p.fundingGoal }))
          .filter(f => f.ratio > 0.3);

        if (funded.length > 0) {
          funded.sort((a, b) => b.ratio - a.ratio);
          project = funded[0].project;
          reward = 0.1;
        }
        break;
      }
      case 'work_urgent': {
        // Find project closest to completion
        const urgent = projects
          .filter(p => p.duration > 0)
          .map(p => ({ project: p, progress: p.totalWork() / p.duration }))
          .filter(u => u.progress > 0.5);

        if (urgent.length > 0) {
          urgent.sort((a, b) => b.progress - a.progress);
          project = urgent[0].project;
          reward = 0.15;
        }
        break;
      }
      case 'work_popular': {
        // Work on project with most workers
        if (projects.length > 0) {
          project = projects.reduce((best, p) =>
            p.contributors.size > best.contributors.size ? p : best
          , projects[0]);
          reward = 0.05;
        }
        break;
      }
      case 'hold':
        return 0;
    }

    // If no suitable project found, pick randomly
    if (!project && projects.length > 0) {
      project = randomChoice(projects);
    }

    if (project) {
      const workAmount = random() * this.reputation;
      project.receiveWork(this.uniqueId, workAmount);
      this.workOutputHistory.push(workAmount);
      if (this.workOutputHistory.length > 20) {
        this.workOutputHistory.shift();
      }
      this.markActive();

      if (this.model.eventBus) {
        this.model.eventBus.publish('project_worked', {
          step: this.model.currentStep,
          project: project.title,
          member: this.uniqueId,
          work: workAmount,
        });
      }

      reward += workAmount / 100; // Scale work contribution to reward
    }

    return reward;
  }

  /**
   * Update Q-values based on performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from reputation change (work quality indicator)
    const reputationChange = this.reputation - this.lastReputation;
    const tokenChange = this.tokens - this.lastTokens;

    // Normalize reward
    let reward = reputationChange * 0.2 + tokenChange * 0.01;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getWorkState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Developer.ACTIONS]
    );
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastReputation = this.reputation;
    this.lastState = this.getWorkState();

    // Choose and execute action
    const action = this.chooseWorkAction();
    this.executeWorkAction(action);
    this.lastAction = action;

    // Participate in governance
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  workOnProject(): void {
    const project = this.chooseProjectToWorkOn();
    if (!project) return;

    const workAmount = random() * this.reputation;
    project.receiveWork(this.uniqueId, workAmount);
    this.markActive();

    if (this.model.eventBus) {
      this.model.eventBus.publish('project_worked', {
        step: this.model.currentStep,
        project: project.title,
        member: this.uniqueId,
        work: workAmount,
      });
    }
  }

  chooseProjectToWorkOn(): Project | null {
    if (!this.model.dao) return null;

    const projects = this.model.dao.projects.filter(p => p.status === 'open');
    if (projects.length === 0) return null;

    const scoreProject = (project: Project): number => {
      // Skill alignment ratio
      let skillScore = 0;
      if (project.requiredSkills.length > 0) {
        const overlap = this.skillset.filter(s => project.requiredSkills.includes(s)).length;
        skillScore = overlap / project.requiredSkills.length;
      }

      // Funding progress
      let fundingScore = 0;
      if (project.fundingGoal > 0) {
        fundingScore = project.currentFunding / project.fundingGoal;
      }

      // Progress
      const totalWork = project.totalWork();
      const progress = project.duration > 0 ? totalWork / project.duration : 0;

      return skillScore * 0.6 + fundingScore * 0.3 + (1 - progress) * 0.1;
    };

    const scored = projects.map(p => ({ project: p, score: scoreProject(p) }));
    const maxScore = Math.max(...scored.map(s => s.score));
    const bestProjects = scored.filter(s => s.score === maxScore);

    return randomChoice(bestProjects).project;
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
    avgWorkOutput: number;
  } {
    const avgWork = this.workOutputHistory.length > 0
      ? this.workOutputHistory.reduce((a, b) => a + b, 0) / this.workOutputHistory.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      avgWorkOutput: avgWork,
    };
  }
}
