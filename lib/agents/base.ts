// Base DAOMember agent class

import type { Agent } from '@/types/simulation';
import type { Proposal } from '../data-structures/proposal';
import type { Guild } from '../data-structures/guild';
import type { VotingStrategy } from '../utils/voting-strategies';
import { getStrategy, DefaultVotingStrategy } from '../utils/voting-strategies';
import type { DAOModel } from '../engine/model';

export class DAOMember implements Agent {
  uniqueId: string;
  model: DAOModel;
  tokens: number;
  reputation: number;
  location: string;
  stakedTokens: number = 0;
  stakeLocks: Array<{ amount: number; unlockStep: number }> = [];
  stakingRate: number;
  compoundStake: boolean = false;
  guild: Guild | null = null;
  votingStrategy: VotingStrategy;
  comments: Map<string, string> = new Map(); // proposalId -> sentiment
  votes: Map<string, { vote: boolean; weight: number }> = new Map(); // proposalId -> vote data
  delegations: Map<string, number> = new Map(); // memberId -> amount
  delegates: DAOMember[] = [];
  private _active: boolean = false;
  pos: [number, number] | null = null; // For visualization
  optimism: number;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string | VotingStrategy
  ) {
    this.uniqueId = uniqueId;
    this.model = model;
    this.tokens = tokens;
    this.reputation = reputation;
    this.location = location;
    this.stakingRate = model.dao?.stakingInterestRate || 0;
    this.optimism = Math.random();

    // Set voting strategy
    if (typeof votingStrategy === 'string') {
      const strategy = getStrategy(votingStrategy);
      this.votingStrategy = strategy || new DefaultVotingStrategy();
    } else {
      this.votingStrategy = votingStrategy || new DefaultVotingStrategy();
    }
  }

  markActive(): void {
    this._active = true;
  }

  voteOnProposal(proposal: Proposal): void {
    this.votingStrategy.vote(this, proposal);
    this.markActive();

    // Notify delegates
    for (const delegate of this.delegates) {
      if (delegate.receiveRepresentativeVote) {
        const voteData = this.votes.get(proposal.uniqueId);
        if (voteData) {
          delegate.receiveRepresentativeVote(proposal, voteData.vote, voteData.weight);
        }
      }
    }
  }

  leaveComment(proposal: Proposal, sentiment: string): void {
    this.comments.set(proposal.uniqueId, sentiment);
    proposal.addComment(this.uniqueId, sentiment);
    this.markActive();
  }

  stakeTokens(amount: number, token: string = 'DAO_TOKEN', lockupPeriod: number = 0): void {
    if (this.model.dao) {
      this.model.dao.stakeTokens(amount, token, this, lockupPeriod);
    }
  }

  unstakeTokens(amount: number, token: string = 'DAO_TOKEN'): number {
    if (this.model.dao) {
      return this.model.dao.unstakeTokens(amount, token, this);
    }
    return 0;
  }

  voteOnRandomProposal(): void {
    if (!this.model.dao) return;

    const openProps = this.model.dao.proposals.filter(p => {
      const isOpen = p.status === 'open';
      const inVotingPeriod =
        this.model.currentStep <= p.creationTime + p.votingPeriod;
      return isOpen && inVotingPeriod;
    });

    if (openProps.length > 0) {
      const proposal = openProps[Math.floor(Math.random() * openProps.length)];
      this.voteOnProposal(proposal);
    }
  }

  leaveCommentOnRandomProposal(): void {
    if (!this.model.dao) return;

    const openProps = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProps.length > 0) {
      const proposal = openProps[Math.floor(Math.random() * openProps.length)];
      const sentiment = ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)];
      this.leaveComment(proposal, sentiment);
    }
  }

  receiveRevenueShare(amount: number): void {
    this.tokens += amount;
  }

  // Guild interactions
  joinGuild(guild: Guild): void {
    if (this.guild === guild) return;

    if (this.guild) {
      this.guild.removeMember(this);
    }

    guild.addMember(this);
  }

  leaveGuild(): void {
    if (this.guild) {
      this.guild.removeMember(this);
    }
  }

  createGuild(name: string): Guild | null {
    if (!this.model.dao) return null;

    const guild = this.model.dao.createGuild(name, this);
    this.joinGuild(guild);
    return guild;
  }

  /**
   * Decide whether to vote yes or no on a proposal
   */
  decideVote(topic: Proposal | string): 'yes' | 'no' {
    const clamp = (x: number) => Math.max(0, Math.min(1, x));

    // Check if this is a Proposal object
    const isProposal =
      typeof topic === 'object' &&
      topic !== null &&
      ('fundingGoal' in topic || 'creator' in topic || 'currentFunding' in topic);

    if (isProposal) {
      const proposal = topic as Proposal;
      const pTopic = proposal.topic || '';

      // String-based heuristics for certain topics
      if (pTopic && typeof pTopic === 'string') {
        if (pTopic.toLowerCase().includes('topic b')) {
          return Math.random() < 0.7 ? 'yes' : 'no';
        }
        if (pTopic.toLowerCase().includes('topic a')) {
          return Math.random() < 0.3 ? 'yes' : 'no';
        }
      }

      // Subjective belief based on proposal characteristics
      let belief = 0.5;

      // Factor in funding progress
      if (proposal.fundingGoal > 0) {
        const fundingRatio = proposal.currentFunding / proposal.fundingGoal;
        belief += fundingRatio * 0.2;
      }

      // Factor in vote ratio
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      if (totalVotes > 0) {
        const supportRatio = proposal.votesFor / totalVotes;
        belief += supportRatio * 0.2;
      }

      // Add personal optimism noise
      belief += (this.optimism - 0.5) * 0.1;

      belief = clamp(belief);

      return Math.random() < belief ? 'yes' : 'no';
    }

    // String-based topic
    const topicStr = typeof topic === 'string' ? topic : '';
    if (topicStr.toLowerCase().includes('topic b')) {
      return Math.random() < 0.7 ? 'yes' : 'no';
    }
    if (topicStr.toLowerCase().includes('topic a')) {
      return Math.random() < 0.3 ? 'yes' : 'no';
    }

    // Default: random decision
    return Math.random() < 0.5 ? 'yes' : 'no';
  }

  /**
   * Delegate tokens to another member
   */
  delegate(amount: number, delegate: DAOMember): void {
    if (amount <= 0 || amount > this.tokens) return;

    this.tokens -= amount;
    const current = this.delegations.get(delegate.uniqueId) || 0;
    this.delegations.set(delegate.uniqueId, current + amount);

    if (!delegate.delegates.includes(this)) {
      delegate.delegates.push(this);
    }
  }

  /**
   * Receive vote from a representative (for liquid delegation)
   */
  receiveRepresentativeVote(_proposal: Proposal, _vote: boolean, _weight: number): void {
    // Override in subclasses if needed
    // Unused parameters prefixed with underscore to indicate intentional non-use
  }

  /**
   * Default step method - override in subclasses
   */
  step(): void {
    // Base implementation does nothing
    // Subclasses should override this
  }
}
