/**
 * Sybil Attacker Agent - Creates Puppet Accounts for Vote Manipulation
 * Upgraded with Q-learning to learn optimal attack timing and strategies
 *
 * Simulates a sybil attack where a single entity creates multiple
 * accounts to manipulate governance votes. Used for testing attack
 * detection systems and analyzing governance resilience.
 */

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomChoice, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

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

type SybilAction = 'attack_now' | 'attack_conservative' | 'build_puppets' | 'probe_defenses' | 'wait' | 'hold';

// =============================================================================
// SYBIL ATTACKER AGENT
// =============================================================================

export class SybilAttacker extends DAOMember {
  static readonly ACTIONS: readonly SybilAction[] = [
    'attack_now', 'attack_conservative', 'build_puppets', 'probe_defenses', 'wait', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

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

  // Learning tracking
  lastAction: SybilAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  attackHistory: Array<{ success: boolean; profit: number }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 1000,
    reputation: number = 50,
    location: string = 'node_0',
    config?: Partial<SybilAttackConfig>
  ) {
    super(uniqueId, model, tokens, reputation, location);
    this.lastTokens = tokens;

    this.attackConfig = {
      maxPuppets: 10,
      tokenDistribution: 'random',
      detectionEvasion: 'basic',
      votingDelay: 0,
      coordinationNoise: 0.1,
      targetedProposals: false,
      ...config,
    };

    // Initialize learning
    const learningConfig: Partial<LearningConfig> = {
      learningRate: settings.learning_global_learning_rate,
      discountFactor: settings.learning_discount_factor,
      explorationRate: settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.learning = new LearningMixin(learningConfig);
  }

  /**
   * Get state representation for attack decisions
   */
  private getAttackState(): string {
    if (!this.model.dao) return 'none|weak|ready';

    // Opportunity state
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    const swingableProposals = openProposals.filter(p => {
      const totalPuppetTokens = this.getTotalPuppetTokens();
      const margin = Math.abs(p.votesFor - p.votesAgainst);
      return totalPuppetTokens > margin * 1.5;
    });
    const opportunityState = swingableProposals.length === 0 ? 'none' :
                             swingableProposals.length < 2 ? 'few' :
                             swingableProposals.length < 4 ? 'good' : 'excellent';

    // Puppet strength state
    const activePuppets = Array.from(this.puppets.values()).filter(p => p.active).length;
    const strengthRatio = activePuppets / Math.max(1, this.attackConfig.maxPuppets);
    const strengthState = strengthRatio < 0.3 ? 'weak' :
                          strengthRatio < 0.6 ? 'moderate' :
                          strengthRatio < 0.9 ? 'strong' : 'max';

    // Attack cooldown state
    const cooldownState = this.currentAttack ? 'attacking' :
                          this.attacksInitiated === 0 ? 'ready' :
                          this.successfulManipulations / Math.max(1, this.attacksInitiated) > 0.5 ? 'hot' : 'cool';

    return StateDiscretizer.combineState(opportunityState, strengthState, cooldownState);
  }

  /**
   * Choose attack action using Q-learning
   */
  private chooseAttackAction(): SybilAction {
    const state = this.getAttackState();

    if (!settings.learning_enabled) {
      return this.heuristicAttackAction();
    }

    return this.learning.selectAction(
      state,
      [...SybilAttacker.ACTIONS]
    ) as SybilAction;
  }

  /**
   * Heuristic-based attack action (fallback)
   */
  private heuristicAttackAction(): SybilAction {
    if (!this.model.dao) return 'hold';

    // If attacking, continue
    if (this.currentAttack) return 'hold';

    const activePuppets = Array.from(this.puppets.values()).filter(p => p.active).length;

    // Build puppets if under limit
    if (activePuppets < this.attackConfig.maxPuppets * 0.5 && this.tokens > 50) {
      return 'build_puppets';
    }

    // Look for attack opportunities
    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length > 0 && activePuppets >= 3) {
      if (random() < 0.3) {
        return 'attack_now';
      }
      return 'attack_conservative';
    }

    return 'wait';
  }

  /**
   * Execute attack action and return reward
   */
  private executeAttackAction(action: SybilAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'attack_now': {
        // Aggressive attack on best opportunity
        const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
        if (openProposals.length > 0 && !this.currentAttack) {
          const bestTarget = this.findBestTarget(openProposals);
          if (bestTarget) {
            this.initiateAttack(bestTarget);
            reward = 0.3;
          }
        }
        break;
      }
      case 'attack_conservative': {
        // Only attack if very high chance of success
        const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
        const safeTargets = openProposals.filter(p => {
          const totalPuppetTokens = this.getTotalPuppetTokens();
          const margin = Math.abs(p.votesFor - p.votesAgainst);
          return totalPuppetTokens > margin * 3; // Much stronger margin requirement
        });
        if (safeTargets.length > 0 && !this.currentAttack) {
          this.initiateAttack(randomChoice(safeTargets));
          reward = 0.2;
        }
        break;
      }
      case 'build_puppets': {
        const activePuppets = Array.from(this.puppets.values()).filter(p => p.active).length;
        if (activePuppets < this.attackConfig.maxPuppets && this.tokens > 10) {
          this.createPuppet();
          reward = 0.1;
        }
        break;
      }
      case 'probe_defenses': {
        // Cast a single vote to test detection systems
        if (randomBool(0.5)) {
          this.voteOnRandomProposal();
        }
        reward = 0.05;
        break;
      }
      case 'wait':
        reward = 0;
        break;
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Find the best proposal target for attack
   */
  private findBestTarget(proposals: Proposal[]): Proposal | null {
    const totalPuppetTokens = this.getTotalPuppetTokens();

    let bestTarget: Proposal | null = null;
    let bestScore = 0;

    for (const proposal of proposals) {
      if (this.votes.has(proposal.uniqueId)) continue;

      const margin = Math.abs(proposal.votesFor - proposal.votesAgainst);
      const canSwing = totalPuppetTokens > margin * 1.5;
      if (!canSwing) continue;

      // Score based on how easily we can swing it
      const score = totalPuppetTokens / Math.max(1, margin);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = proposal;
      }
    }

    return bestTarget;
  }

  /**
   * Update Q-values based on attack outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from attack success and token changes
    const tokenChange = this.tokens - this.lastTokens;
    let reward = tokenChange / Math.max(100, this.lastTokens) * 5;

    // Bonus for successful attacks
    const recentAttacks = this.attackHistory.slice(-5);
    const successRate = recentAttacks.length > 0
      ? recentAttacks.filter(a => a.success).length / recentAttacks.length
      : 0;
    reward += successRate * 3;

    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getAttackState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...SybilAttacker.ACTIONS]
    );

    // Limit history size
    if (this.attackHistory.length > 20) {
      this.attackHistory.splice(0, this.attackHistory.length - 20);
    }
  }

  /**
   * Main step function
   */
  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getAttackState();

    // Check for active attack first
    if (this.currentAttack) {
      this.executeAttackStep();
    } else {
      // Choose and execute action using Q-learning
      const action = this.chooseAttackAction();
      this.executeAttackAction(action);
      this.lastAction = action;

      // Legacy behavior: manage puppets if not building via action
      if (action !== 'build_puppets') {
        this.managePuppets();
      }
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
      case 'weighted': {
        // More tokens to earlier puppets
        const weight = 1 / (this.puppetCounter + 1);
        tokensForPuppet = this.tokens * weight * 0.3;
        break;
      }
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

    // Register puppet as a DAO member so attack detectors can see voting patterns
    const puppetMember = new DAOMember(puppetId, this.model, tokensForPuppet, 0, this.location);
    this.model.dao.addMember(puppetMember);

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

    // Mark proposal as maliciously targeted for metrics
    proposal.isMalicious = true;

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

    if (this.model.eventBus) {
      this.model.eventBus.publish('sybil_vote_coordinated', {
        step: this.model.currentStep,
        masterId: this.uniqueId,
        puppetId: this.uniqueId,
        proposalId: proposal.uniqueId,
        vote,
        weight: this.tokens,
      });
    }
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

    // Remove puppet from DAO members
    if (this.model.dao) {
      const puppetMember = this.model.dao.members.find(m => m.uniqueId === puppetId);
      if (puppetMember) {
        this.model.dao.removeMember(puppetMember);
      }
    }

    return true;
  }

  /**
   * Clean up all puppets - removes them from DAO and clears the puppet map.
   * Call this when the attacker is done or being removed from the simulation.
   */
  cleanupAllPuppets(): void {
    for (const puppetId of this.puppets.keys()) {
      this.deactivatePuppet(puppetId);
    }
    this.puppets.clear();

    if (this.model.eventBus) {
      this.model.eventBus.publish('sybil_puppets_cleaned', {
        step: this.model.currentStep,
        masterId: this.uniqueId,
      });
    }
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

  /**
   * Signal end of episode
   */
  endEpisode(): void {
    this.learning.endEpisode();
  }

  /**
   * Export learning state for checkpoints
   */
  exportLearningState(): LearningState {
    return this.learning.exportLearningState();
  }

  /**
   * Import learning state from checkpoint
   */
  importLearningState(state: LearningState): void {
    this.learning.importLearningState(state);
  }

  /**
   * Get learning and attack statistics
   */
  getLearningStats(): {
    qTableSize: number;
    stateCount: number;
    episodeCount: number;
    totalReward: number;
    explorationRate: number;
    attacksInitiated: number;
    successfulManipulations: number;
    successRate: number;
    puppetCount: number;
    tokensControlled: number;
  } {
    const successRate = this.attacksInitiated > 0
      ? this.successfulManipulations / this.attacksInitiated
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      attacksInitiated: this.attacksInitiated,
      successfulManipulations: this.successfulManipulations,
      successRate,
      puppetCount: this.puppets.size,
      tokensControlled: this.getTotalControlledTokens(),
    };
  }
}
