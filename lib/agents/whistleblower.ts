// Whistleblower Agent - Reports violations for rewards
// Upgraded with Q-learning to optimize detection and reporting strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { Violation } from '../data-structures/violation';
import { random, randomChoice, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Whistleblower configuration
const DETECTION_PROBABILITY = 0.3;
const REPORT_REWARD_FRACTION = 0.1;
const FALSE_POSITIVE_RATE = 0.1;
const MIN_REPUTATION_LOSS_FALSE_REPORT = 5;
const INVESTIGATION_COST = 5;

type WatchdogAction = 'monitor_proposals' | 'monitor_members' | 'investigate' | 'report' | 'stand_down' | 'escalate';

interface InvestigationRecord {
  targetId: string;
  targetType: 'member' | 'proposal' | 'project';
  step: number;
  finding: 'violation' | 'clean' | 'inconclusive';
  rewarded: boolean;
  wasFalsePositive: boolean;
}

interface SuspectedViolation {
  targetId: string;
  targetType: 'member' | 'proposal' | 'project';
  suspicionLevel: number;
  evidence: string[];
  investigatedAt?: number;
}

export class Whistleblower extends DAOMember {
  static readonly ACTIONS: readonly WatchdogAction[] = [
    'monitor_proposals', 'monitor_members', 'investigate', 'report', 'stand_down', 'escalate'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  // Whistleblower state
  investigations: InvestigationRecord[] = [];
  suspicions: Map<string, SuspectedViolation> = new Map();
  successfulReports: number = 0;
  falseReports: number = 0;
  totalRewards: number = 0;
  detectionSkill: number;

  // Learning tracking
  lastAction: WatchdogAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  pendingReportReward: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.detectionSkill = 0.3 + random() * 0.5;
    this.lastTokens = tokens;

    // Initialize learning
    const config: Partial<LearningConfig> = {
      learningRate: settings.learning_global_learning_rate,
      discountFactor: settings.learning_discount_factor,
      explorationRate: settings.learning_exploration_rate,
      explorationDecay: settings.learning_exploration_decay,
      minExploration: settings.learning_min_exploration,
      qBounds: [-50, 50],
    };

    this.learning = new LearningMixin(config);
  }

  /**
   * Get state representation for watchdog decisions
   */
  private getWatchdogState(): string {
    if (!this.model.dao) return 'low|low|safe';

    // Suspicion level state
    const maxSuspicion = Math.max(0, ...Array.from(this.suspicions.values()).map(s => s.suspicionLevel));
    const suspicionState = maxSuspicion < 0.3 ? 'low' :
                           maxSuspicion < 0.5 ? 'medium' :
                           maxSuspicion < 0.7 ? 'high' : 'critical';

    // Pending investigations
    const pendingCount = Array.from(this.suspicions.values()).filter(s => !s.investigatedAt).length;
    const pendingState = pendingCount === 0 ? 'none' :
                         pendingCount < 3 ? 'few' :
                         pendingCount < 6 ? 'some' : 'many';

    // Treasury risk
    const treasuryRisk = this.assessTreasuryRisk();
    const riskState = StateDiscretizer.discretizeRisk(treasuryRisk);

    return StateDiscretizer.combineState(suspicionState, pendingState, riskState);
  }

  /**
   * Assess overall treasury risk
   */
  private assessTreasuryRisk(): number {
    if (!this.model.dao) return 0;

    let risk = 0;

    // High-value proposals
    const highValueProposals = this.model.dao.proposals.filter(
      p => p.fundingGoal > 10000 && p.status === 'open'
    );
    risk += highValueProposals.length * 0.1;

    // Rapidly funded proposals
    const rapidlyFunded = this.model.dao.proposals.filter(p => {
      if (p.status !== 'open') return false;
      const age = this.model.currentStep - p.creationTime;
      return p.currentFunding > p.fundingGoal * 0.5 && age < 3;
    });
    risk += rapidlyFunded.length * 0.15;

    // Known violations
    risk += this.model.dao.violations.length * 0.05;

    return Math.min(1, risk);
  }

  /**
   * Choose watchdog action using Q-learning
   */
  private chooseWatchdogAction(): WatchdogAction {
    const state = this.getWatchdogState();

    if (!settings.learning_enabled) {
      return this.heuristicWatchdogAction();
    }

    return this.learning.selectAction(
      state,
      [...Whistleblower.ACTIONS]
    ) as WatchdogAction;
  }

  /**
   * Heuristic-based watchdog action (fallback)
   */
  private heuristicWatchdogAction(): WatchdogAction {
    // Have unreported violations? Report them
    const unreported = this.investigations.filter(
      i => i.finding === 'violation' && !i.rewarded
    );
    if (unreported.length > 0) {
      return 'report';
    }

    // Have high suspicions? Investigate
    const highSuspicions = Array.from(this.suspicions.values()).filter(
      s => s.suspicionLevel > 0.5 && !s.investigatedAt
    );
    if (highSuspicions.length > 0 && this.tokens >= INVESTIGATION_COST) {
      return 'investigate';
    }

    // Low on resources? Stand down
    if (this.tokens < INVESTIGATION_COST * 2) {
      return 'stand_down';
    }

    // Monitor based on current suspicion level
    const maxSuspicion = Math.max(0, ...Array.from(this.suspicions.values()).map(s => s.suspicionLevel));
    if (maxSuspicion > 0.7) {
      return 'escalate';
    }

    return random() < 0.5 ? 'monitor_proposals' : 'monitor_members';
  }

  /**
   * Execute watchdog action and return reward
   */
  private executeWatchdogAction(action: WatchdogAction): number {
    let reward = 0;

    switch (action) {
      case 'monitor_proposals':
        this.checkProposals();
        reward = this.suspicions.size > 0 ? 0.2 : 0.05;
        break;

      case 'monitor_members':
        this.checkMembers();
        reward = this.suspicions.size > 0 ? 0.2 : 0.05;
        break;

      case 'investigate':
        reward = this.investigateSuspicion();
        break;

      case 'report':
        reward = this.reportViolations();
        break;

      case 'stand_down':
        // Conserve resources
        reward = 0.1;
        break;

      case 'escalate':
        reward = this.escalateHighRisk();
        break;
    }

    return reward;
  }

  /**
   * Escalate high-risk situations
   */
  private escalateHighRisk(): number {
    if (!this.model.dao) return 0;

    let reward = 0;
    const highSuspicions = Array.from(this.suspicions.values()).filter(
      s => s.suspicionLevel > 0.7
    );

    for (const suspicion of highSuspicions) {
      if (this.model.eventBus) {
        this.model.eventBus.publish('risk_escalated', {
          step: this.model.currentStep,
          whistleblower: this.uniqueId,
          targetId: suspicion.targetId,
          targetType: suspicion.targetType,
          suspicionLevel: suspicion.suspicionLevel,
          evidence: suspicion.evidence,
        });
      }
      reward += 0.5;
    }

    return reward;
  }

  /**
   * Update Q-values based on watchdog performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from outcomes
    let reward = 0;

    // Reward for successful reports
    reward += this.pendingReportReward;
    this.pendingReportReward = 0;

    // Penalty for false reports
    if (this.falseReports > 0) {
      reward -= 5;
    }

    // Small reward for maintaining resources
    if (this.tokens > this.lastTokens) {
      reward += 0.1;
    }

    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getWatchdogState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Whistleblower.ACTIONS]
    );
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getWatchdogState();

    // Choose and execute action
    const action = this.chooseWatchdogAction();
    this.executeWatchdogAction(action);
    this.lastAction = action;

    // Participate in governance
    this.voteOnRandomProposal();

    // Leave comments (often critical/questioning)
    if (random() < (this.model.dao?.commentProbability || 0.2)) {
      this.leaveCriticalComment();
    }
  }

  /**
   * Check proposals for violations
   */
  private checkProposals(): void {
    if (!this.model.dao) return;

    const proposals = this.model.dao.proposals;

    for (const proposal of proposals) {
      if (this.suspicions.has(`proposal_${proposal.uniqueId}`)) continue;

      const evidence: string[] = [];
      let suspicionLevel = 0;

      if (proposal.fundingGoal > 50000) {
        evidence.push('Unusually high funding goal');
        suspicionLevel += 0.3;
      }

      if (proposal.currentFunding > proposal.fundingGoal * 0.8 &&
          this.model.currentStep - proposal.creationTime < 5) {
        evidence.push('Suspiciously rapid funding');
        suspicionLevel += 0.4;
      }

      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      if (totalVotes > 10) {
        const voteRatio = Math.max(proposal.votesFor, proposal.votesAgainst) / totalVotes;
        if (voteRatio > 0.95) {
          evidence.push('Potentially manipulated voting');
          suspicionLevel += 0.3;
        }
      }

      suspicionLevel *= this.detectionSkill;
      if (random() > DETECTION_PROBABILITY) {
        suspicionLevel *= 0.5;
      }

      if (suspicionLevel > 0.3) {
        this.suspicions.set(`proposal_${proposal.uniqueId}`, {
          targetId: proposal.uniqueId,
          targetType: 'proposal',
          suspicionLevel,
          evidence,
        });
      }
    }
  }

  /**
   * Check members for suspicious behavior
   */
  private checkMembers(): void {
    if (!this.model.dao) return;

    for (const member of this.model.dao.members) {
      if (member === this) continue;
      if (this.suspicions.has(`member_${member.uniqueId}`)) continue;

      const evidence: string[] = [];
      let suspicionLevel = 0;

      if (member.tokens > 1000) {
        evidence.push('Large token holdings');
        suspicionLevel += 0.2;
      }

      if (member.stakedTokens > member.tokens * 3) {
        evidence.push('Unusual staking ratio');
        suspicionLevel += 0.3;
      }

      suspicionLevel *= this.detectionSkill;

      if (suspicionLevel > 0.3 && random() < DETECTION_PROBABILITY) {
        this.suspicions.set(`member_${member.uniqueId}`, {
          targetId: member.uniqueId,
          targetType: 'member',
          suspicionLevel,
          evidence,
        });
      }
    }
  }

  /**
   * Investigate a suspicious target
   */
  private investigateSuspicion(): number {
    if (!this.model.dao || this.suspicions.size === 0) return -0.1;

    let highest: SuspectedViolation | null = null;
    let highestKey: string | null = null;

    for (const [key, suspicion] of this.suspicions) {
      if (!suspicion.investigatedAt &&
          (!highest || suspicion.suspicionLevel > highest.suspicionLevel)) {
        highest = suspicion;
        highestKey = key;
      }
    }

    if (!highest || !highestKey) return 0;

    if (this.tokens < INVESTIGATION_COST) return -0.2;

    this.tokens -= INVESTIGATION_COST;
    highest.investigatedAt = this.model.currentStep;

    const accurateDetection = random() < this.detectionSkill;
    const actualViolation = highest.suspicionLevel > 0.5 && random() < highest.suspicionLevel;

    let finding: 'violation' | 'clean' | 'inconclusive';
    let wasFalsePositive = false;

    if (accurateDetection) {
      finding = actualViolation ? 'violation' : 'clean';
    } else {
      if (random() < FALSE_POSITIVE_RATE) {
        finding = 'violation';
        wasFalsePositive = !actualViolation;
      } else {
        finding = 'inconclusive';
      }
    }

    const record: InvestigationRecord = {
      targetId: highest.targetId,
      targetType: highest.targetType,
      step: this.model.currentStep,
      finding,
      rewarded: false,
      wasFalsePositive,
    };

    this.investigations.push(record);

    if (this.model.eventBus) {
      this.model.eventBus.publish('investigation_complete', {
        step: this.model.currentStep,
        whistleblower: this.uniqueId,
        targetId: highest.targetId,
        targetType: highest.targetType,
        finding,
        evidence: highest.evidence,
      });
    }

    this.markActive();

    // Reward based on finding
    if (finding === 'violation') {
      return wasFalsePositive ? -2 : 5;
    } else if (finding === 'clean') {
      return 0.5; // Good to clear suspicion
    }
    return 0;
  }

  /**
   * Report confirmed violations
   */
  private reportViolations(): number {
    if (!this.model.dao) return 0;

    let totalReward = 0;

    for (const record of this.investigations) {
      if (record.rewarded || record.finding !== 'violation') continue;

      const violation = new Violation(
        record.targetId,
        null,
        `Violation reported by whistleblower: ${record.targetType} ${record.targetId}`
      );

      this.model.dao.addViolation(violation);

      const reward = INVESTIGATION_COST * 2 * REPORT_REWARD_FRACTION;

      if (record.wasFalsePositive) {
        this.falseReports++;
        this.reputation = Math.max(0, this.reputation - MIN_REPUTATION_LOSS_FALSE_REPORT);
        totalReward -= 5;

        if (this.model.eventBus) {
          this.model.eventBus.publish('false_report', {
            step: this.model.currentStep,
            whistleblower: this.uniqueId,
            targetId: record.targetId,
            reputationLoss: MIN_REPUTATION_LOSS_FALSE_REPORT,
          });
        }
      } else {
        this.successfulReports++;
        this.totalRewards += reward;
        this.tokens += reward;
        this.pendingReportReward += reward;
        totalReward += 10;

        if (this.model.eventBus) {
          this.model.eventBus.publish('violation_reported', {
            step: this.model.currentStep,
            whistleblower: this.uniqueId,
            targetId: record.targetId,
            targetType: record.targetType,
            reward,
          });
        }
      }

      record.rewarded = true;
    }

    return totalReward;
  }

  /**
   * Leave critical/questioning comments on proposals
   */
  private leaveCriticalComment(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return;

    const proposal = randomChoice(openProposals);
    const sentiment = randomChoice(['negative', 'negative', 'neutral']);
    this.leaveComment(proposal, sentiment);
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
   * Get whistleblower and learning statistics
   */
  getWhistleblowerStats(): {
    successfulReports: number;
    falseReports: number;
    totalRewards: number;
    detectionSkill: number;
    activeSuspicions: number;
    qTableSize: number;
    explorationRate: number;
    totalLearningReward: number;
  } {
    return {
      successfulReports: this.successfulReports,
      falseReports: this.falseReports,
      totalRewards: this.totalRewards,
      detectionSkill: this.detectionSkill,
      activeSuspicions: this.suspicions.size,
      qTableSize: this.learning.getQTableSize(),
      explorationRate: this.learning.getExplorationRate(),
      totalLearningReward: this.learning.getTotalReward(),
    };
  }
}
