// Regulator Agent - ensures compliance

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Project } from '../data-structures/project';
import { Violation } from '../data-structures/violation';
import { random, randomChoice } from '../utils/random';

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

export class Regulator extends DAOMember {
  complianceEnsured: Array<{ project: Project; requirement: string }> = [];
  complianceConfig: ComplianceConfig;
  inspectionCount: number = 0;

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
  }

  step(): void {
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.5)) {
      this.leaveCommentOnRandomProposal();
    }

    this.ensureComplianceOnRandomProject();
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
}
