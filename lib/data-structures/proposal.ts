// Proposal data structures

import type { EventBus } from '../utils/event-bus';
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

  addVote(memberId: string, vote: boolean, weight: number = 1): void {
    if (!this.votes.has(memberId)) {
      this.votes.set(memberId, { vote, weight });

      if (vote) {
        this.votesFor += weight;
      } else {
        this.votesAgainst += weight;
      }

      if (this.dao.eventBus) {
        this.dao.eventBus.publish('vote_cast', {
          step: this.dao.currentStep,
          proposal: this.title,
          member: memberId,
          vote,
          weight,
        });
      }
    }
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
