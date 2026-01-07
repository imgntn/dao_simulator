// External Partner Agent - collaborates with DAO on projects
// Port from agents/external_partner.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';
import { random, randomChoice } from '../utils/random';

export class ExternalPartner extends DAOMember {
  collaboratedProjects: Project[] = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy: any = null
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
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
    if (this.model.dao.projects.length === 0) {
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
    const probability = (this.model.dao as any).externalPartnerInteractProbability || 0.0;

    if (random() < probability) {
      this.interactWithDao();
    }
  }

  toDict(): any {
    return {
      uniqueId: this.uniqueId,
      tokens: this.tokens,
      reputation: this.reputation,
      location: this.location,
      collaboratedProjects: this.collaboratedProjects.map((p) => p.title),
    };
  }
}
