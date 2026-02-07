// External Partner Agent - collaborates with DAO on projects
// Upgraded with Q-learning to optimize collaboration strategies
// Port from agents/external_partner.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';
import type { VotingStrategy } from '../utils/voting-strategies';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

type PartnerAction = 'propose_partnership' | 'propose_collaboration' | 'propose_integration' | 'collaborate_project' | 'hold';

export class ExternalPartner extends DAOMember {
  static readonly ACTIONS: readonly PartnerAction[] = [
    'propose_partnership', 'propose_collaboration', 'propose_integration', 'collaborate_project', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  collaboratedProjects: Project[] = [];

  // Learning tracking
  lastAction: PartnerAction | null = null;
  lastState: string | null = null;
  partnershipsProposed: number = 0;
  collaborationsProposed: number = 0;
  integrationsProposed: number = 0;
  totalWorkDone: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string | VotingStrategy | null
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy ?? undefined);

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
   * Get state representation for partner decisions
   */
  private getPartnerState(): string {
    if (!this.model.dao) return 'none|low|new';

    // DAO activity state
    const projects = this.model.dao.projects;
    const activityState = projects.length === 0 ? 'none' :
                          projects.length < 3 ? 'low' :
                          projects.length < 8 ? 'normal' : 'active';

    // Relationship state
    const relationshipRatio = this.collaboratedProjects.length / Math.max(1, projects.length);
    const relationshipState = relationshipRatio < 0.1 ? 'new' :
                              relationshipRatio < 0.3 ? 'developing' :
                              relationshipRatio < 0.6 ? 'established' : 'deep';

    // Reputation state
    const repState = this.reputation < 30 ? 'low' :
                     this.reputation < 60 ? 'moderate' :
                     this.reputation < 90 ? 'high' : 'elite';

    return StateDiscretizer.combineState(activityState, relationshipState, repState);
  }

  /**
   * Choose partner action using Q-learning
   */
  private choosePartnerAction(): PartnerAction {
    const state = this.getPartnerState();

    if (!settings.learning_enabled) {
      return this.heuristicPartnerAction();
    }

    return this.learning.selectAction(
      state,
      [...ExternalPartner.ACTIONS]
    ) as PartnerAction;
  }

  /**
   * Heuristic-based partner action (fallback)
   */
  private heuristicPartnerAction(): PartnerAction {
    if (!this.model.dao) return 'hold';

    const projects = this.model.dao.projects;

    // New partner - build relationship first
    if (this.collaboratedProjects.length < 2 && projects.length > 0) {
      return 'collaborate_project';
    }

    // Established relationship - propose partnerships
    if (this.collaboratedProjects.length >= 3) {
      const choices: PartnerAction[] = ['propose_partnership', 'propose_collaboration', 'propose_integration'];
      return randomChoice(choices);
    }

    if (projects.length > 0) {
      return 'collaborate_project';
    }

    return 'hold';
  }

  /**
   * Execute partner action and return reward
   */
  private executePartnerAction(action: PartnerAction): number {
    let reward = 0;

    switch (action) {
      case 'propose_partnership':
        this.proposePartnership();
        this.partnershipsProposed++;
        reward = 0.3;
        break;
      case 'propose_collaboration':
        this.proposeCollaboration();
        this.collaborationsProposed++;
        reward = 0.3;
        break;
      case 'propose_integration':
        this.proposeIntegration();
        this.integrationsProposed++;
        reward = 0.4;
        break;
      case 'collaborate_project':
        if (this.model.dao && this.model.dao.projects.length > 0) {
          this.collaborateOnRandomProject();
          reward = 0.5;
        }
        break;
      case 'hold':
        return 0;
    }

    this.markActive();
    return reward;
  }

  /**
   * Update Q-values based on partnership outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from reputation and collaboration growth
    const reputationReward = this.reputation / 100;
    const collaborationReward = this.collaboratedProjects.length * 0.1;

    let reward = reputationReward + collaborationReward;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getPartnerState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...ExternalPartner.ACTIONS]
    );
  }

  /**
   * Interact with the DAO in various ways
   */
  interactWithDao(): void {
    const interactionTypes = [
      'partnership',
      'collaboration',
      'integration',
      'collaborate_on_project',
    ];

    const interactionType = randomChoice(interactionTypes);

    switch (interactionType) {
      case 'partnership':
        this.proposePartnership();
        break;
      case 'collaboration':
        this.proposeCollaboration();
        break;
      case 'integration':
        this.proposeIntegration();
        break;
      case 'collaborate_on_project':
        this.collaborateOnRandomProject();
        break;
    }
  }

  /**
   * Propose a partnership with the DAO
   */
  proposePartnership(): void {
    if (this.model.eventBus) {
      this.model.eventBus.publish('partnership_proposed', {
        step: this.model.currentStep,
        partner: this.uniqueId,
      });
    }
  }

  /**
   * Propose a collaboration with the DAO
   */
  proposeCollaboration(): void {
    if (this.model.eventBus) {
      this.model.eventBus.publish('collaboration_proposed', {
        step: this.model.currentStep,
        partner: this.uniqueId,
      });
    }
  }

  /**
   * Propose an integration with the DAO
   */
  proposeIntegration(): void {
    if (this.model.eventBus) {
      this.model.eventBus.publish('integration_proposed', {
        step: this.model.currentStep,
        partner: this.uniqueId,
      });
    }
  }

  /**
   * Collaborate on a random project
   */
  collaborateOnRandomProject(): void {
    if (!this.model.dao || this.model.dao.projects.length === 0) {
      return;
    }

    const project = randomChoice(this.model.dao.projects);
    this.collaborateOnProject(project);
  }

  /**
   * Collaborate on a specific project
   */
  collaborateOnProject(project: Project): void {
    const workAmount = random() * 10;
    project.updateWorkDone(this.uniqueId, workAmount);
    this.totalWorkDone += workAmount;

    if (this.model.eventBus) {
      this.model.eventBus.publish('project_collaborated', {
        step: this.model.currentStep,
        partner: this.uniqueId,
        project: project.title,
        work: workAmount,
      });
    }

    if (!this.collaboratedProjects.includes(project)) {
      this.collaboratedProjects.push(project);
    }
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getPartnerState();

    const probability = this.model.dao.externalPartnerInteractProbability || 0.0;

    if (random() < probability) {
      // Choose and execute action using Q-learning
      const action = this.choosePartnerAction();
      this.executePartnerAction(action);
      this.lastAction = action;
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
    collaboratedProjects: number;
    totalWorkDone: number;
    partnershipsProposed: number;
  } {
    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      collaboratedProjects: this.collaboratedProjects.length,
      totalWorkDone: this.totalWorkDone,
      partnershipsProposed: this.partnershipsProposed,
    };
  }

  toDict(): {
    uniqueId: string;
    tokens: number;
    reputation: number;
    location: string;
    collaboratedProjects: string[];
  } {
    return {
      uniqueId: this.uniqueId,
      tokens: this.tokens,
      reputation: this.reputation,
      location: this.location,
      collaboratedProjects: this.collaboratedProjects.map((p) => p.title),
    };
  }
}
