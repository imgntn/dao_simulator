// Regulator Agent - ensures compliance

import { DAOMember } from './base';
import type { DAOSimulation } from '../simulation';
import type { Project } from '../data-structures/project';
import { Violation } from '../data-structures/violation';

export class Regulator extends DAOMember {
  complianceEnsured: Array<{ project: Project; requirement: string }> = [];

  step(): void {
    this.voteOnRandomProposal();
    this.leaveCommentOnRandomProposal();
    this.ensureComplianceOnRandomProject();
  }

  ensureComplianceOnRandomProject(): void {
    if (!this.model.dao || this.model.dao.projects.length === 0) return;

    const project = this.model.dao.projects[
      Math.floor(Math.random() * this.model.dao.projects.length)
    ];

    const requirements = ['Environmental impact assessment', 'Safety regulations'];
    const requirement = requirements[Math.floor(Math.random() * requirements.length)];

    const complianceIssue = { project, requirement };
    this.ensureCompliance(complianceIssue);
  }

  ensureCompliance(complianceIssue: { project: Project; requirement: string }): void {
    if (this.checkProjectCompliance(complianceIssue.project)) {
      this.complianceEnsured.push(complianceIssue);
    }
  }

  checkProjectCompliance(project: Project): boolean {
    const compliant = project.fundingGoal <= 10000 && project.duration <= 365;

    if (!compliant) {
      this.flagProposalForViolation(project);
    }

    if (this.model.eventBus) {
      this.model.eventBus.publish('compliance_checked', {
        step: this.model.currentStep,
        project: project.title,
        compliant,
      });
    }

    return compliant;
  }

  flagProposalForViolation(project: Project): void {
    if (!this.model.dao) return;

    const violator = project.creator;
    const description = `Project '${project.title}' failed compliance`;
    const violation = new Violation(violator, project, description);

    this.model.dao.addViolation(violation);

    if (this.model.eventBus) {
      this.model.eventBus.publish('violation_created', {
        step: this.model.currentStep,
        project: project.title,
        violator,
        description,
      });
    }
  }
}
