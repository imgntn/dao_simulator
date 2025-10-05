// Developer Agent

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';

export class Developer extends DAOMember {
  skillset: string[];

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
  }

  step(): void {
    this.workOnProject();
    this.voteOnRandomProposal();

    if (Math.random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  workOnProject(): void {
    const project = this.chooseProjectToWorkOn();
    if (!project) return;

    const workAmount = Math.random() * this.reputation;
    project.receiveWork(this.uniqueId, workAmount);
    this.reputation += workAmount / 10;
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

    return bestProjects[Math.floor(Math.random() * bestProjects.length)].project;
  }
}
