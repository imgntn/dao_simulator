// Bounty Hunter Agent - completes bounty proposals for rewards
// Port from agents/bounty_hunter.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';

// Work configuration
const MIN_WORK_REQUIREMENT = 1;   // Minimum steps to complete a bounty
const MAX_WORK_REQUIREMENT = 5;   // Maximum steps to complete a bounty
const WORK_PER_STEP = 1;          // Work units added per step

interface BountyProgress {
  bountyId: string;
  workRequired: number;
  workDone: number;
}

export class BountyHunter extends DAOMember {
  activeBounty: BountyProgress | null = null;
  completedBounties: string[] = [];
  workEfficiency: number; // Personal work efficiency multiplier

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Each hunter has a personal work efficiency (0.5 - 1.5x)
    this.workEfficiency = 0.5 + random();
  }

  /**
   * Work on available bounties with realistic work requirement
   */
  workOnBounties(): void {
    if (!this.model.dao) return;

    // If we have an active bounty, continue working on it
    if (this.activeBounty) {
      this.continueWork();
      return;
    }

    // Find approved bounty proposals that are not yet completed
    const bounties = this.model.dao.proposals.filter((p) => {
      const bounty = p as {
        proposalType?: string;
        rewardLocked?: boolean;
        completed?: boolean;
        uniqueId: string;
      };
      return (
        bounty.proposalType === 'bounty' &&
        p.status === 'approved' &&
        bounty.rewardLocked &&
        !bounty.completed &&
        !this.completedBounties.includes(p.uniqueId)
      );
    });

    if (bounties.length === 0) {
      return;
    }

    // Pick a random bounty to start working on
    const bounty = randomChoice(bounties) as { uniqueId: string; reward?: number };

    // Calculate work requirement based on reward size
    const reward = bounty.reward || 10;
    const baseWork = MIN_WORK_REQUIREMENT + random() * (MAX_WORK_REQUIREMENT - MIN_WORK_REQUIREMENT);
    const workRequired = Math.ceil(baseWork * Math.log10(reward + 1));

    this.activeBounty = {
      bountyId: bounty.uniqueId,
      workRequired: Math.max(MIN_WORK_REQUIREMENT, workRequired),
      workDone: 0,
    };

    // Publish event that hunter started working on bounty
    if (this.model.eventBus) {
      this.model.eventBus.publish('bounty_started', {
        step: this.model.currentStep,
        hunter: this.uniqueId,
        bountyId: bounty.uniqueId,
        workRequired: this.activeBounty.workRequired,
      });
    }

    this.markActive();
  }

  /**
   * Continue working on active bounty
   */
  private continueWork(): void {
    if (!this.activeBounty || !this.model.dao) return;

    // Add work based on efficiency
    const workDone = WORK_PER_STEP * this.workEfficiency;
    this.activeBounty.workDone += workDone;

    // Check if bounty is complete
    if (this.activeBounty.workDone >= this.activeBounty.workRequired) {
      this.completeBounty();
    } else {
      this.markActive();
    }
  }

  /**
   * Complete the active bounty and claim reward
   */
  private completeBounty(): void {
    if (!this.activeBounty || !this.model.dao) return;

    const bounty = this.model.dao.proposals.find(
      p => p.uniqueId === this.activeBounty!.bountyId
    ) as { uniqueId: string; title: string; completed?: boolean; reward?: number } | undefined;

    if (!bounty) {
      this.activeBounty = null;
      return;
    }

    bounty.completed = true;
    this.completedBounties.push(bounty.uniqueId);

    // Withdraw reward from treasury
    const reward = this.model.dao.treasury.withdrawLocked(
      'DAO_TOKEN',
      bounty.reward || 0,
      this.model.currentStep
    );

    this.tokens += reward;

    // Emit completion event
    if (this.model.eventBus) {
      this.model.eventBus.publish('bounty_completed', {
        step: this.model.currentStep,
        proposal: bounty.title,
        hunter: this.uniqueId,
        reward,
        workDone: this.activeBounty.workDone,
      });
    }

    this.activeBounty = null;
    this.markActive();
  }

  step(): void {
    this.workOnBounties();
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
