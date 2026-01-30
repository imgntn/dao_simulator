/**
 * Proposal State Machine
 *
 * Manages stage transitions for multi-stage proposals.
 * Handles voting thresholds, quorum requirements, veto windows, and timelocks.
 */

import type { MultiStageProposal, ProposalStage, HouseType, HouseVoteResult } from '../data-structures/multi-stage-proposal';
import type { DAO } from '../data-structures/dao';

// =============================================================================
// TYPES
// =============================================================================

export interface StageCheckResult {
  passed: boolean;
  reason: string;
  details?: Record<string, unknown>;
}

export interface GovernanceConfig {
  // Basic governance
  quorumPercent: number;
  approvalThresholdPercent: number;

  // Bicameral (Optimism-style)
  isBicameral?: boolean;
  tokenHouseQuorumPercent?: number;
  tokenHouseApprovalPercent?: number;
  citizensHouseVetoEnabled?: boolean;
  citizensHouseVetoPeriodSteps?: number;

  // Dual governance (Lido-style)
  hasDualGovernance?: boolean;
  vetoThresholdPercent?: number;
  rageQuitThresholdPercent?: number;
  minTimelockSteps?: number;
  maxTimelockSteps?: number;

  // Category-based quorum (Arbitrum-style)
  constitutionalQuorumPercent?: number;
  nonConstitutionalQuorumPercent?: number;

  // Fast-track thresholds (percentages, not fractions)
  fastTrackMinSteps?: number;
  fastTrackApprovalPercent?: number;
  fastTrackQuorumPercent?: number;
}

// =============================================================================
// PROPOSAL STATE MACHINE
// =============================================================================

export class ProposalStateMachine {
  private proposal: MultiStageProposal;
  private dao: DAO;
  private config: GovernanceConfig;

  constructor(
    proposal: MultiStageProposal,
    dao: DAO,
    config: GovernanceConfig
  ) {
    this.proposal = proposal;
    this.dao = dao;
    this.config = config;

    // Apply config to proposal
    if (config.hasDualGovernance && config.vetoThresholdPercent) {
      this.proposal.vetoThresholdPercent = config.vetoThresholdPercent;
    }
    if (config.isBicameral) {
      this.proposal.requiresBicameral = true;
    }
  }

  /**
   * Process the current stage and advance if conditions are met
   */
  process(): boolean {
    const currentStage = this.proposal.currentStage;

    // Check if stage has expired
    if (!this.proposal.isCurrentStageExpired) {
      if (this.shouldFastTrack(currentStage)) {
        const result = this.evaluateStageCompletion(currentStage);
        return this.proposal.advanceToNextStage(result.passed, result.reason, result.details);
      }
      return false; // Stage still in progress
    }

    // Evaluate stage-specific conditions
    const result = this.evaluateStageCompletion(currentStage);

    // Advance to next stage (or reject)
    return this.proposal.advanceToNextStage(result.passed, result.reason, result.details);
  }

  /**
   * Check if current stage qualifies for fast-track approval
   */
  private shouldFastTrack(stage: ProposalStage): boolean {
    const minSteps = this.config.fastTrackMinSteps ?? 0;
    if (minSteps <= 0) return false;

    if (stage !== 'temp_check' && stage !== 'on_chain') return false;
    if (!this.proposal.currentStageState) return false;

    const elapsed = this.dao.currentStep - this.proposal.currentStageState.startStep;
    if (elapsed < minSteps) return false;

    const votesFor = this.proposal.votesFor;
    const votesAgainst = this.proposal.votesAgainst;
    const totalVotes = votesFor + votesAgainst;
    if (totalVotes <= 0) return false;

    const approvalPercent = (votesFor / totalVotes) * 100;
    const totalVotingPower = this.calculateTotalVotingPower();
    const participationPercent = (totalVotes / Math.max(totalVotingPower, 1)) * 100;

    const approvalThreshold = this.config.fastTrackApprovalPercent ?? 60;
    const quorumThreshold = this.config.fastTrackQuorumPercent ?? this.getQuorumForCategory();

    return approvalPercent >= approvalThreshold && participationPercent >= quorumThreshold;
  }

  /**
   * Evaluate if the current stage should pass or fail
   */
  private evaluateStageCompletion(stage: ProposalStage): StageCheckResult {
    switch (stage) {
      case 'rfc':
        return this.evaluateRFCStage();

      case 'temp_check':
        return this.evaluateTempCheckStage();

      case 'on_chain':
        return this.evaluateOnChainStage();

      case 'timelock':
        return this.evaluateTimelockStage();

      case 'veto_window':
        return this.evaluateVetoWindow();

      case 'execution':
        return { passed: true, reason: 'Ready for execution' };

      default:
        return { passed: true, reason: 'Stage completed' };
    }
  }

  /**
   * RFC stage - always passes (discussion only)
   */
  private evaluateRFCStage(): StageCheckResult {
    // RFC is just discussion, always passes
    // Could add minimum comment requirement here if desired
    const commentCount = this.proposal.comments.length;
    return {
      passed: true,
      reason: `Discussion completed with ${commentCount} comments`,
      details: { commentCount },
    };
  }

  /**
   * Temperature check - off-chain signaling
   */
  private evaluateTempCheckStage(): StageCheckResult {
    const votesFor = this.proposal.votesFor;
    const votesAgainst = this.proposal.votesAgainst;
    const totalVotes = votesFor + votesAgainst;
    const memberCount = this.dao.members?.length || 0;
    const minQuorum = Math.max(1, Math.ceil(memberCount * 0.01));
    this.proposal.quorumMet = totalVotes >= minQuorum;

    // Simple majority for temp check
    if (totalVotes === 0) {
      return {
        passed: false,
        reason: 'No votes cast during temperature check',
        details: { votesFor, votesAgainst },
      };
    }

    const approvalPercent = (votesFor / totalVotes) * 100;
    const passed = approvalPercent > 50;

    return {
      passed,
      reason: passed
        ? `Temperature check passed with ${approvalPercent.toFixed(1)}% approval`
        : `Temperature check failed with only ${approvalPercent.toFixed(1)}% approval`,
      details: { votesFor, votesAgainst, approvalPercent },
    };
  }

  /**
   * On-chain voting - main governance vote
   */
  private evaluateOnChainStage(): StageCheckResult {
    // For bicameral, check all required houses
    if (this.config.isBicameral) {
      return this.evaluateBicameralVoting();
    }

    // Standard single-house voting
    return this.evaluateStandardVoting();
  }

  /**
   * Standard voting evaluation
   */
  private evaluateStandardVoting(): StageCheckResult {
    const votesFor = this.proposal.votesFor;
    const votesAgainst = this.proposal.votesAgainst;
    const totalVotes = votesFor + votesAgainst;

    // Get quorum based on proposal category
    const quorumPercent = this.getQuorumForCategory();

    // Calculate total voting power in DAO
    const totalVotingPower = this.calculateTotalVotingPower();

    // Check quorum - CRITICAL FIX: quorum must be based on TOTAL participation
    // not just votes for. Real DAOs require minimum participation regardless
    // of vote split. This prevents proposals passing with 1% participation.
    const quorumVotes = (totalVotingPower * quorumPercent) / 100;
    const totalParticipation = votesFor + votesAgainst;
    const quorumMet = totalParticipation >= quorumVotes;
    this.proposal.quorumMet = quorumMet;

    if (!quorumMet) {
      return {
        passed: false,
        reason: `Quorum not met: ${totalParticipation.toFixed(0)} total votes (${votesFor.toFixed(0)} for, ${votesAgainst.toFixed(0)} against), needed ${quorumVotes.toFixed(0)} (${quorumPercent}%)`,
        details: { votesFor, votesAgainst, totalParticipation, quorumVotes, quorumPercent, quorumMet },
      };
    }

    // Check approval threshold
    const approvalThreshold = this.config.approvalThresholdPercent || 51;
    const approvalPercent = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
    const approved = approvalPercent >= approvalThreshold;

    return {
      passed: approved,
      reason: approved
        ? `Proposal passed with ${approvalPercent.toFixed(1)}% approval (quorum: ${quorumPercent}%)`
        : `Proposal rejected with ${approvalPercent.toFixed(1)}% approval (needed ${approvalThreshold}%)`,
      details: { votesFor, votesAgainst, approvalPercent, quorumMet, approved },
    };
  }

  /**
   * Bicameral voting evaluation (Optimism-style)
   */
  private evaluateBicameralVoting(): StageCheckResult {
    // Check Token House first
    const tokenHouseResult = this.evaluateHouseVote('token_house');
    this.proposal.quorumMet = tokenHouseResult.quorumMet;

    if (!tokenHouseResult.approved) {
      return {
        passed: false,
        reason: `Token House rejected: ${tokenHouseResult.votesFor} for, ${tokenHouseResult.votesAgainst} against`,
        details: { tokenHouse: tokenHouseResult },
      };
    }

    // Token House passed - Citizens House will have veto window in next stage
    // For now, consider it passed if token house approved
    return {
      passed: true,
      reason: `Token House approved with ${tokenHouseResult.votesFor} votes for`,
      details: { tokenHouse: tokenHouseResult },
    };
  }

  /**
   * Evaluate a specific house's vote
   */
  private evaluateHouseVote(house: HouseType): HouseVoteResult {
    const houseVote = this.proposal.houseVotes.get(house);

    if (!houseVote) {
      return {
        house,
        votesFor: 0,
        votesAgainst: 0,
        quorumMet: false,
        approved: false,
        vetoTriggered: false,
      };
    }

    const total = houseVote.votesFor + houseVote.votesAgainst;
    const approvalPercent = total > 0 ? (houseVote.votesFor / total) * 100 : 0;

    // Get house-specific thresholds
    let quorumPercent = this.config.quorumPercent;
    let approvalThreshold = this.config.approvalThresholdPercent || 51;

    if (house === 'token_house' && this.config.tokenHouseQuorumPercent) {
      quorumPercent = this.config.tokenHouseQuorumPercent;
      approvalThreshold = this.config.tokenHouseApprovalPercent || 51;
    }

    // FIX: Calculate quorum threshold in absolute terms, not percentage
    // quorumPercent is a percentage (e.g., 30 = 30%), so we need to calculate
    // the actual vote threshold based on total voting power
    const totalHouseVotingPower = this.calculateTotalVotingPower();
    const quorumThreshold = (totalHouseVotingPower * quorumPercent) / 100;
    const quorumMet = total >= quorumThreshold;
    const approved = quorumMet && approvalPercent >= approvalThreshold;

    // FIX: Calculate veto trigger for Citizens House
    // In Optimism-style bicameral governance, Citizens House can veto
    // if majority of participating citizens vote against (reject = veto)
    let vetoTriggered = false;
    if (house === 'citizens_house' && this.config.citizensHouseVetoEnabled) {
      // Veto triggers if more votes against than for AND minimum participation
      const vetoParticipationThreshold = 5; // Minimum votes needed to veto
      const hasEnoughParticipation = total >= vetoParticipationThreshold;
      const majorityAgainst = houseVote.votesAgainst > houseVote.votesFor;
      vetoTriggered = hasEnoughParticipation && majorityAgainst;
    }

    return {
      house,
      votesFor: houseVote.votesFor,
      votesAgainst: houseVote.votesAgainst,
      quorumMet,
      approved,
      vetoTriggered,
    };
  }

  /**
   * Timelock stage evaluation
   */
  private evaluateTimelockStage(): StageCheckResult {
    // Schedule timelock if not already scheduled
    if (this.proposal.timelockExecutionStep === null) {
      let timelockSteps = this.config.minTimelockSteps || 48; // Default 2 days

      // For dual governance, calculate dynamic timelock
      if (this.config.hasDualGovernance) {
        const totalStake = this.calculateTotalStakeSupply();
        timelockSteps = this.proposal.calculateDynamicTimelock(
          totalStake,
          this.config.minTimelockSteps || 48,
          this.config.maxTimelockSteps || 1080 // 45 days
        );
      }

      this.proposal.scheduleTimelock(timelockSteps);
    }

    // Check if timelock is ready
    if (this.proposal.isTimelockReady()) {
      return {
        passed: true,
        reason: 'Timelock period completed',
        details: {
          scheduledStep: this.proposal.timelockScheduledStep,
          executionStep: this.proposal.timelockExecutionStep,
        },
      };
    }

    // Still waiting
    return {
      passed: false,
      reason: 'Timelock still in progress',
      details: {
        currentStep: this.dao.currentStep,
        executionStep: this.proposal.timelockExecutionStep,
      },
    };
  }

  /**
   * Veto window evaluation (Citizens House / Dual Governance)
   */
  private evaluateVetoWindow(): StageCheckResult {
    // Check for Citizens House veto (Optimism)
    if (this.config.isBicameral && this.config.citizensHouseVetoEnabled) {
      const citizensResult = this.evaluateHouseVote('citizens_house');
      if (citizensResult.vetoTriggered) {
        this.proposal.veto('Citizens House veto');
        return {
          passed: false,
          reason: 'Vetoed by Citizens House',
          details: { citizensHouse: citizensResult },
        };
      }
    }

    // Check for staker veto (Lido dual governance)
    if (this.config.hasDualGovernance) {
      const totalStake = this.calculateTotalStakeSupply();
      if (this.proposal.isVetoThresholdReached(totalStake)) {
        // Extend timelock dynamically
        const extension = this.proposal.calculateDynamicTimelock(
          totalStake,
          this.config.minTimelockSteps || 48,
          this.config.maxTimelockSteps || 1080
        );
        this.proposal.dynamicTimelockExtension = extension;

        // Check if rage quit threshold reached
        const rageQuitPercent = (this.proposal.totalVetoSignal / totalStake) * 100;
        if (rageQuitPercent >= (this.config.rageQuitThresholdPercent || 10)) {
          this.proposal.veto('Rage quit threshold reached');
          return {
            passed: false,
            reason: `Rage quit triggered at ${rageQuitPercent.toFixed(1)}% signal`,
            details: { totalVetoSignal: this.proposal.totalVetoSignal, rageQuitPercent },
          };
        }

        return {
          passed: true,
          reason: `Veto signaling active, timelock extended to ${extension} steps`,
          details: { extension, totalVetoSignal: this.proposal.totalVetoSignal },
        };
      }
    }

    // No veto triggered
    return {
      passed: true,
      reason: 'Veto window passed without veto',
    };
  }

  /**
   * Get quorum percentage based on proposal category
   */
  private getQuorumForCategory(): number {
    const category = this.proposal.proposalCategory;

    if (category === 'constitutional' && this.config.constitutionalQuorumPercent) {
      return this.config.constitutionalQuorumPercent;
    }

    if (category === 'non_constitutional' && this.config.nonConstitutionalQuorumPercent) {
      return this.config.nonConstitutionalQuorumPercent;
    }

    return this.config.quorumPercent;
  }

  /**
   * Calculate total voting power in the DAO
   */
  private calculateTotalVotingPower(): number {
    // Sum all member tokens + delegated tokens
    let total = 0;
    for (const member of this.dao.members) {
      total += member.tokens + member.stakedTokens;
    }
    return Math.max(total, 1); // Avoid division by zero
  }

  /**
   * Calculate total staked token supply (for dual governance)
   */
  private calculateTotalStakeSupply(): number {
    let total = 0;
    for (const member of this.dao.members) {
      total += member.stakedTokens;
    }
    return Math.max(total, 1);
  }

  /**
   * Force a specific stage transition (for testing/admin)
   */
  forceAdvance(passed: boolean, reason: string): boolean {
    return this.proposal.advanceToNextStage(passed, reason);
  }

  /**
   * Get current state summary
   */
  getStateSummary(): {
    proposal: string;
    currentStage: ProposalStage;
    stageProgress: number;
    stepsRemaining: number;
    isExpired: boolean;
    isComplete: boolean;
  } {
    return {
      proposal: this.proposal.uniqueId,
      currentStage: this.proposal.currentStage,
      stageProgress: this.proposal.stageProgress,
      stepsRemaining: this.proposal.stepsRemainingInStage,
      isExpired: this.proposal.isCurrentStageExpired,
      isComplete: this.proposal.isComplete,
    };
  }
}

/**
 * Factory function to create a state machine with governance config
 */
export function createProposalStateMachine(
  proposal: MultiStageProposal,
  dao: DAO,
  config: Partial<GovernanceConfig> = {}
): ProposalStateMachine {
  const fullConfig: GovernanceConfig = {
    quorumPercent: config.quorumPercent ?? 5,
    approvalThresholdPercent: config.approvalThresholdPercent ?? 51,
    ...config,
  };

  return new ProposalStateMachine(proposal, dao, fullConfig);
}

// Type alias for backward compatibility
export type StateMachineConfig = GovernanceConfig;
