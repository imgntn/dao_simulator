/**
 * Sybil Attacker Agent - Creates Puppet Accounts for Vote Manipulation
 *
 * Simulates a sybil attack where a single entity creates multiple
 * accounts to manipulate governance votes. Used for testing attack
 * detection systems and analyzing governance resilience.
 */

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice, randomBool } from '../utils/random';

// =============================================================================
// TYPES
// =============================================================================

export interface PuppetAccount {
  puppetId: string;
  masterId: string;       // The sybil attacker controlling this puppet
  tokens: number;
  createdStep: number;
  active: boolean;
  votesPlaced: number;
}

export interface SybilAttackConfig {
  maxPuppets: number;            // Maximum puppet accounts to create
  tokenDistribution: 'equal' | 'random' | 'weighted';  // How to distribute tokens
  detectionEvasion: 'none' | 'basic' | 'advanced';     // Evasion tactics
  votingDelay: number;           // Steps to delay voting for evasion
  coordinationNoise: number;     // 0-1, adds noise to coordinated voting
  targetedProposals: boolean;    // Only attack specific proposals
}

export interface SybilAttackStats {
  puppetCount: number;
  activePuppets: number;
  totalVotesPlaced: number;
  tokensControlled: number;
  attacksInitiated: number;
  successfulManipulations: number;
}

// =============================================================================
// SYBIL ATTACKER AGENT
// =============================================================================

export class SybilAttacker extends DAOMember {
  puppets: Map<string, PuppetAccount> = new Map();
  attackConfig: SybilAttackConfig;
  attacksInitiated: number = 0;
  successfulManipulations: number = 0;
  targetProposalIds: Set<string> = new Set();
  private puppetCounter: number = 0;

  // Attack state
  private currentAttack: {
    proposalId: string;
    targetVote: boolean;
    startStep: number;
    votingSchedule: Map<string, number>;  // puppetId -> step to vote
  } | null = null;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 1000,
    reputation: number = 50,
    location: string = 'node_0',
    config?: Partial<SybilAttackConfig>
  ) {
    super(uniqueId, model, tokens, reputation, location);

    this.attackConfig = {
      maxPuppets: 10,
      tokenDistribution: 'random',
      detectionEvasion: 'basic',
      votingDelay: 0,
      coordinationNoise: 0.1,
      targetedProposals: false,
      ...config,
    };
  }

  /**
   * Main step function
   */
  step(): void {
    if (!this.model.dao) return;

    // Create puppets if under limit
    this.managePuppets();

    // Check for active attack
    if (this.currentAttack) {
      this.executeAttackStep();
    } else {
      // Look for opportunities to attack
      this.scanForOpportunities();
    }

    // Basic member behavior for cover
    if (randomBool(0.1)) {
      this.voteOnRandomProposal();
    }
  }

  /**
   * Create and manage puppet accounts
   */
  private managePuppets(): void {
    const activePuppets = Array.from(this.puppets.values()).filter(p => p.active).length;

    if (activePuppets < this.attackConfig.maxPuppets && this.tokens > 10) {
      this.createPuppet();
    }
  }

  /**
   * Create a new puppet account
   */
  private createPuppet(): PuppetAccount | null {
    if (!this.model.dao) return null;

    this.puppetCounter++;
    const puppetId = `${this.uniqueId}_puppet_${this.puppetCounter}`;

    // Distribute tokens to puppet
    let tokensForPuppet: number;
    switch (this.attackConfig.tokenDistribution) {
      case 'equal':
        tokensForPuppet = this.tokens / (this.attackConfig.maxPuppets + 1);
        break;
      case 'random':
        tokensForPuppet = this.tokens * (0.05 + random() * 0.15);
        break;
      case 'weighted':
        // More tokens to earlier puppets
        const weight = 1 / (this.puppetCounter + 1);
        tokensForPuppet = this.tokens * weight * 0.3;
        break;
      default:
        tokensForPuppet = this.tokens * 0.1;
    }

    tokensForPuppet = Math.min(tokensForPuppet, this.tokens);
    if (tokensForPuppet < 1) return null;

    this.tokens -= tokensForPuppet;

    const puppet: PuppetAccount = {
      puppetId,
      masterId: this.uniqueId,
      tokens: tokensForPuppet,
      createdStep: this.model.currentStep,
      active: true,
      votesPlaced: 0,
    };

    this.puppets.set(puppetId, puppet);

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('sybil_puppet_created', {
        step: this.model.currentStep,
        masterId: this.uniqueId,
        puppetId,
        tokens: tokensForPuppet,
        totalPuppets: this.puppets.size,
      });
    }

    return puppet;
  }

  /**
   * Scan for opportunities to attack
   */
  private scanForOpportunities(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');

    for (const proposal of openProposals) {
      // Skip if targeted mode and not in targets
      if (this.attackConfig.targetedProposals && !this.targetProposalIds.has(proposal.uniqueId)) {
        continue;
      }

      // Check if proposal is worth attacking
      if (this.shouldAttack(proposal)) {
        this.initiateAttack(proposal);
        break;
      }
    }
  }

  /**
   * Determine if a proposal is worth attacking
   */
  private shouldAttack(proposal: Proposal): boolean {
    // Don't attack if we've already voted
    if (this.votes.has(proposal.uniqueId)) {
      return false;
    }

    // Calculate if our puppets could swing the vote
    const totalPuppetTokens = this.getTotalPuppetTokens();
    const currentFor = proposal.votesFor;
    const currentAgainst = proposal.votesAgainst;
    const total = currentFor + currentAgainst + totalPuppetTokens;

    // Attack if we can make a difference
    const currentLeading = currentFor > currentAgainst ? 'for' : 'against';
    const margin = Math.abs(currentFor - currentAgainst);

    // Can we flip the result?
    if (totalPuppetTokens > margin * 1.5) {
      return true;
    }

    // Random chance to attack anyway
    return randomBool(0.05);
  }

  /**
   * Start an attack on a proposal
   */
  private initiateAttack(proposal: Proposal): void {
    // Decide which way to vote (usually against the current leader)
    const targetVote = proposal.votesFor > proposal.votesAgainst ? false : true;

    // Create voting schedule for detection evasion
    const votingSchedule = this.createVotingSchedule();

    this.currentAttack = {
      proposalId: proposal.uniqueId,
      targetVote,
      startStep: this.model.currentStep,
      votingSchedule,
    };

    this.attacksInitiated++;

    if (this.model.eventBus) {
      this.model.eventBus.publish('sybil_attack_started', {
        step: this.model.currentStep,
        masterId: this.uniqueId,
        proposalId: proposal.uniqueId,
        targetVote,
        puppetCount: this.puppets.size,
        totalTokens: this.getTotalPuppetTokens(),
      });
    }
  }

  /**
   * Create a voting schedule based on evasion settings
   */
  private createVotingSchedule(): Map<string, number> {
    const schedule = new Map<string, number>();
    const puppetIds = Array.from(this.puppets.keys());
    const currentStep = this.model.currentStep;

    switch (this.attackConfig.detectionEvasion) {
      case 'none':
        // All vote at same time
        for (const id of puppetIds) {
          schedule.set(id, currentStep);
        }
        break;

      case 'basic':
        // Spread over a few steps
        for (let i = 0; i < puppetIds.length; i++) {
          const delay = Math.floor(i / 3);  // 3 per step
          schedule.set(puppetIds[i], currentStep + delay);
        }
        break;

      case 'advanced':
        // Random distribution with significant spread
        for (const id of puppetIds) {
          const delay = Math.floor(random() * this.attackConfig.votingDelay + random() * 5);
          schedule.set(id, currentStep + delay);
        }
        break;
    }

    return schedule;
  }

  /**
   * Execute current attack step
   */
  private executeAttackStep(): void {
    if (!this.currentAttack || !this.model.dao) return;

    const proposal = this.model.dao.proposals.find(
      p => p.uniqueId === this.currentAttack!.proposalId
    );

    if (!proposal || proposal.status !== 'open') {
      this.finalizeAttack(false);
      return;
    }

    // Vote with puppets scheduled for this step
    for (const [puppetId, voteStep] of this.currentAttack.votingSchedule) {
      if (voteStep === this.model.currentStep) {
        this.puppetVote(puppetId, proposal);
      }
    }

    // Check if all puppets have voted
    const allVoted = Array.from(this.currentAttack.votingSchedule.values())
      .every(step => step <= this.model.currentStep);

    if (allVoted) {
      // Master also votes
      this.coordinatedVote(proposal);
      this.finalizeAttack(this.checkAttackSuccess(proposal));
    }
  }

  /**
   * Have a puppet vote on a proposal
   */
  private puppetVote(puppetId: string, proposal: Proposal): void {
    const puppet = this.puppets.get(puppetId);
    if (!puppet || !puppet.active || !this.currentAttack) return;

    // Add noise to vote if configured
    let vote = this.currentAttack.targetVote;
    if (random() < this.attackConfig.coordinationNoise) {
      vote = !vote;  // Occasional "mistake" for cover
    }

    // Cast the vote
    proposal.addVote(puppetId, vote, puppet.tokens);
    puppet.votesPlaced++;

    if (this.model.eventBus) {
      this.model.eventBus.publish('sybil_vote_coordinated', {
        step: this.model.currentStep,
        masterId: this.uniqueId,
        puppetId,
        proposalId: proposal.uniqueId,
        vote,
        weight: puppet.tokens,
      });
    }
  }

  /**
   * Master's coordinated vote
   */
  private coordinatedVote(proposal: Proposal): void {
    if (!this.currentAttack) return;

    const vote = this.currentAttack.targetVote;
    proposal.addVote(this.uniqueId, vote, this.tokens);
    this.votes.set(proposal.uniqueId, { vote, weight: this.tokens });
    this.markActive();
  }

  /**
   * Check if attack was successful
   */
  private checkAttackSuccess(proposal: Proposal): boolean {
    if (!this.currentAttack) return false;

    if (this.currentAttack.targetVote) {
      return proposal.votesFor > proposal.votesAgainst;
    } else {
      return proposal.votesAgainst > proposal.votesFor;
    }
  }

  /**
   * Finalize attack
   */
  private finalizeAttack(success: boolean): void {
    if (!this.currentAttack) return;

    if (success) {
      this.successfulManipulations++;

      if (this.model.eventBus) {
        this.model.eventBus.publish('sybil_attack_succeeded', {
          step: this.model.currentStep,
          masterId: this.uniqueId,
          proposalId: this.currentAttack.proposalId,
          targetVote: this.currentAttack.targetVote,
        });
      }
    }

    this.currentAttack = null;
  }

  /**
   * Add a proposal to target list
   */
  addTargetProposal(proposalId: string): void {
    this.targetProposalIds.add(proposalId);
  }

  /**
   * Remove a proposal from target list
   */
  removeTargetProposal(proposalId: string): void {
    this.targetProposalIds.delete(proposalId);
  }

  /**
   * Get total tokens controlled by puppets
   */
  getTotalPuppetTokens(): number {
    let total = 0;
    for (const puppet of this.puppets.values()) {
      if (puppet.active) {
        total += puppet.tokens;
      }
    }
    return total;
  }

  /**
   * Get total tokens controlled (including master)
   */
  getTotalControlledTokens(): number {
    return this.tokens + this.getTotalPuppetTokens();
  }

  /**
   * Deactivate a puppet (e.g., if detected)
   */
  deactivatePuppet(puppetId: string): boolean {
    const puppet = this.puppets.get(puppetId);
    if (!puppet) return false;

    puppet.active = false;
    return true;
  }

  /**
   * Get attack statistics
   */
  getAttackStats(): SybilAttackStats {
    const activePuppets = Array.from(this.puppets.values()).filter(p => p.active);
    const totalVotes = Array.from(this.puppets.values())
      .reduce((sum, p) => sum + p.votesPlaced, 0);

    return {
      puppetCount: this.puppets.size,
      activePuppets: activePuppets.length,
      totalVotesPlaced: totalVotes,
      tokensControlled: this.getTotalControlledTokens(),
      attacksInitiated: this.attacksInitiated,
      successfulManipulations: this.successfulManipulations,
    };
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    return {
      uniqueId: this.uniqueId,
      tokens: this.tokens,
      reputation: this.reputation,
      attackConfig: this.attackConfig,
      puppets: Array.from(this.puppets.entries()),
      puppetCounter: this.puppetCounter,
      attacksInitiated: this.attacksInitiated,
      successfulManipulations: this.successfulManipulations,
      targetProposalIds: Array.from(this.targetProposalIds),
    };
  }
}
