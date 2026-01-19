// Proposal data structures

import type { DAO } from './dao';
import type { Project } from './project';

export class Proposal {
  dao: DAO;
  creator: string;  // Creator's unique ID
  title: string;
  description: string;
  fundingGoal: number;
  duration: number;
  project: Project | null;
  status: 'open' | 'approved' | 'rejected' | 'completed' = 'open';
  votes: Map<string, { vote: boolean; weight: number }> = new Map();
  votesFor: number = 0;
  votesAgainst: number = 0;
  comments: Array<{ member: string; sentiment: string }> = [];
  delegatedSupport: Map<string, number> = new Map();
  topic: string;
  creationTime: number = 0;
  votingPeriod: number;
  currentFunding: number = 0;
  uniqueId: string;
  type: string = 'default';

  // Voting power snapshot - captures member balances at proposal creation
  // This prevents flash loan attacks and ensures votes are counted against
  // the balance at proposal creation, not current balance
  votingPowerSnapshot: Map<string, number> = new Map();
  snapshotTaken: boolean = false;

  // Track members who have had their delegation revoked for this proposal
  // When someone votes directly, their delegated power should not count twice
  private delegationRevokedFor: Set<string> = new Set();

  constructor(
    dao: DAO,
    creator: string,
    title: string,
    description: string,
    fundingGoal: number,
    duration: number,
    topic: string = 'Default Topic',
    project: Project | null = null
  ) {
    this.dao = dao;
    this.creator = creator;
    this.title = title;
    this.description = description;
    this.fundingGoal = fundingGoal;
    this.duration = duration;
    this.project = project;
    this.topic = topic;
    this.votingPeriod = duration;
    this.uniqueId = '';  // Will be set by DAO when added
  }

  /**
   * Take a snapshot of voting power for all DAO members
   * This should be called when the proposal is created to lock in voting power
   * and prevent flash loan attacks
   */
  takeVotingPowerSnapshot(): void {
    if (this.snapshotTaken) {
      return; // Snapshot already taken
    }

    for (const member of this.dao.members) {
      // Voting power = tokens + staked tokens (locked stakes count too)
      const votingPower = member.tokens + member.stakedTokens;
      this.votingPowerSnapshot.set(member.uniqueId, votingPower);
    }
    this.snapshotTaken = true;
  }

  /**
   * Get the snapshotted voting power for a member
   * Returns 0 if member wasn't in the DAO at snapshot time
   */
  getSnapshotVotingPower(memberId: string): number {
    return this.votingPowerSnapshot.get(memberId) || 0;
  }

  /**
   * Revoke delegation for a specific member on this proposal
   * Called when someone votes directly - their delegated power should not count twice
   * This prevents double-voting through delegation
   */
  revokeDelegationFor(delegatorId: string, delegateId: string, amount: number): void {
    // Remove delegated support if it was already counted via delegate
    const existingSupport = this.delegatedSupport.get(delegatorId);
    if (existingSupport !== undefined && existingSupport >= amount) {
      this.delegatedSupport.set(delegatorId, existingSupport - amount);
    }

    this.delegationRevokedFor.add(delegatorId);

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('delegation_revoked_on_vote', {
        step: this.dao.currentStep,
        proposal: this.title,
        delegator: delegatorId,
        delegate: delegateId,
        amount,
      });
    }
  }

  /**
   * Check if a member's delegation has been revoked for this proposal
   */
  isDelegationRevokedFor(memberId: string): boolean {
    return this.delegationRevokedFor.has(memberId);
  }

  addVote(memberId: string, vote: boolean, weight: number = 1): boolean {
    // Reject votes on closed proposals
    if (this.status !== 'open') {
      return false;
    }

    if (!this.votes.has(memberId)) {
      // Use snapshot voting power if available (prevents flash loan attacks)
      // If no snapshot, fall back to provided weight for backwards compatibility
      let effectiveWeight = weight;
      if (this.snapshotTaken) {
        const snapshotPower = this.votingPowerSnapshot.get(memberId);
        if (snapshotPower !== undefined) {
          // Use the MINIMUM of snapshot power and provided weight
          // This ensures votes can't exceed what member had at proposal creation
          effectiveWeight = Math.min(snapshotPower, weight);
        } else {
          // Member wasn't in DAO at snapshot time - no voting rights
          if (this.dao.eventBus) {
            this.dao.eventBus.publish('vote_rejected_no_snapshot', {
              step: this.dao.currentStep,
              proposal: this.title,
              member: memberId,
              reason: 'Member joined after proposal creation snapshot',
            });
          }
          return false;
        }
      }

      this.votes.set(memberId, { vote, weight: effectiveWeight });

      if (vote) {
        this.votesFor += effectiveWeight;
      } else {
        this.votesAgainst += effectiveWeight;
      }

      // CRITICAL FIX: Auto-revoke any delegations this member made
      // When voting directly, delegated power should not also count via delegate
      // This prevents double-voting through delegation
      const member = this.dao.members.find(m => m.uniqueId === memberId);
      if (member && !this.isDelegationRevokedFor(memberId)) {
        for (const [delegateId, amount] of member.delegations.entries()) {
          if (amount > 0) {
            this.revokeDelegationFor(memberId, delegateId, amount);
          }
        }
      }

      if (this.dao.eventBus) {
        this.dao.eventBus.publish('vote_cast', {
          step: this.dao.currentStep,
          proposal: this.title,
          member: memberId,
          vote,
          weight: effectiveWeight,
        });
      }
      return true;
    }
    return false;  // Already voted
  }

  addComment(memberId: string, sentiment: string): void {
    this.comments.push({ member: memberId, sentiment });

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('comment_added', {
        step: this.dao.currentStep,
        proposal: this.title,
        member: memberId,
        sentiment,
      });
    }
  }

  receiveDelegatedSupport(delegatorId: string, tokenAmount: number): void {
    const current = this.delegatedSupport.get(delegatorId) || 0;
    this.delegatedSupport.set(delegatorId, current + tokenAmount);
  }

  receiveInvestment(investorId: string, amount: number): void {
    this.currentFunding += amount;
  }

  get closed(): boolean {
    return this.status !== 'open';
  }

  toDict(): any {
    return {
      uniqueId: this.uniqueId,
      title: this.title,
      description: this.description,
      fundingGoal: this.fundingGoal,
      duration: this.duration,
      topic: this.topic,
      status: this.status,
      votesFor: this.votesFor,
      votesAgainst: this.votesAgainst,
      currentFunding: this.currentFunding,
      creator: this.creator,
      creationTime: this.creationTime,
      votingPeriod: this.votingPeriod,
      type: this.type,
      // Serialize voting power snapshot for checkpoint restore
      votingPowerSnapshot: Object.fromEntries(this.votingPowerSnapshot),
      snapshotTaken: this.snapshotTaken,
    };
  }

  static fromDict(data: any, dao: DAO): Proposal {
    const proposal = new Proposal(
      dao,
      data.creator || '',
      data.title || '',
      data.description || '',
      data.fundingGoal || 0,
      data.duration || 0,
      data.topic || 'Default Topic',
      null
    );

    proposal.status = data.status || 'open';
    proposal.votesFor = data.votesFor || 0;
    proposal.votesAgainst = data.votesAgainst || 0;
    proposal.currentFunding = data.currentFunding || 0;
    proposal.creationTime = data.creationTime || 0;
    proposal.votingPeriod = data.votingPeriod || proposal.duration;
    proposal.uniqueId = data.uniqueId || '';
    proposal.type = data.type || 'default';

    // Restore voting power snapshot
    if (data.votingPowerSnapshot) {
      proposal.votingPowerSnapshot = new Map(Object.entries(data.votingPowerSnapshot));
    }
    proposal.snapshotTaken = data.snapshotTaken || false;

    return proposal;
  }
}

export class FundingProposal extends Proposal {
  constructor(
    dao: DAO,
    creator: string,
    title: string,
    description: string,
    fundingGoal: number,
    duration: number,
    project: Project
  ) {
    super(dao, creator, title, description, fundingGoal, duration, 'Funding', project);
    this.type = 'funding';
  }
}

export class GovernanceProposal extends Proposal {
  setting: string;
  value: any;

  constructor(
    dao: DAO,
    creator: string,
    title: string,
    description: string,
    setting: string,
    value: any,
    duration: number
  ) {
    super(dao, creator, title, description, 0, duration, 'Governance', null);
    this.setting = setting;
    this.value = value;
    this.type = 'governance';
  }
}

export class MembershipProposal extends Proposal {
  newMember: string;

  constructor(
    dao: DAO,
    creator: string,
    title: string,
    description: string,
    newMember: string,
    duration: number
  ) {
    super(dao, creator, title, description, 0, duration, 'Membership', null);
    this.newMember = newMember;
    this.type = 'membership';
  }
}

export class BountyProposal extends Proposal {
  bountyAmount: number;
  requiredSkills: string[];
  completed: boolean = false;

  constructor(
    dao: DAO,
    creator: string,
    title: string,
    description: string,
    bountyAmount: number,
    requiredSkills: string[],
    duration: number
  ) {
    super(dao, creator, title, description, bountyAmount, duration, 'Bounty', null);
    this.bountyAmount = bountyAmount;
    this.requiredSkills = requiredSkills;
    this.type = 'bounty';
  }
}
