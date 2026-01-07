// Validator Agent - monitors projects

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';
import { Dispute } from '../data-structures/dispute';
import { randomChoice } from '../utils/random';

export class Validator extends DAOMember {
  monitoringBudget: number;
  monitoredProjects: Set<Project> = new Set();

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
    this.monitoringBudget = monitoringBudget;
  }

  step(): void {
    this.voteOnRandomProposal();
    this.leaveCommentOnRandomProposal();
    this.monitorProjects();
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

  monitorProject(project: Project): void {
    if (!this.model.dao) return;

    this.monitoredProjects.add(project);

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
  }
}
