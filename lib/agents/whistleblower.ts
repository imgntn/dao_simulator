// Whistleblower Agent - Reports violations for rewards
// New agent type for detecting and reporting DAO violations

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { Violation } from '../data-structures/violation';
import { random, randomChoice, randomBool } from '../utils/random';

// Whistleblower configuration
const DETECTION_PROBABILITY = 0.3;  // 30% chance to detect per check
const REPORT_REWARD_FRACTION = 0.1;  // 10% of recovered funds as reward
const FALSE_POSITIVE_RATE = 0.1;  // 10% chance of false reports
const MIN_REPUTATION_LOSS_FALSE_REPORT = 5;
const INVESTIGATION_COST = 5;  // Cost to investigate a suspected violation

interface InvestigationRecord {
  targetId: string;
  targetType: 'member' | 'proposal' | 'project';
  step: number;
  finding: 'violation' | 'clean' | 'inconclusive';
  rewarded: boolean;
  /** True if finding='violation' but there was no actual violation (false positive) */
  wasFalsePositive: boolean;
}

interface SuspectedViolation {
  targetId: string;
  targetType: 'member' | 'proposal' | 'project';
  suspicionLevel: number;  // 0-1
  evidence: string[];
  investigatedAt?: number;
}

export class Whistleblower extends DAOMember {
  investigations: InvestigationRecord[] = [];
  suspicions: Map<string, SuspectedViolation> = new Map();
  successfulReports: number = 0;
  falseReports: number = 0;
  totalRewards: number = 0;
  detectionSkill: number;  // 0-1, affects detection accuracy

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Random detection skill (affects accuracy)
    this.detectionSkill = 0.3 + random() * 0.5;  // 30-80% skill
  }

  step(): void {
    if (!this.model.dao) return;

    // Monitor for suspicious activity
    if (randomBool(0.5)) {
      this.monitorActivity();
    }

    // Investigate existing suspicions
    if (this.suspicions.size > 0 && this.tokens >= INVESTIGATION_COST) {
      this.investigateSuspicion();
    }

    // Report confirmed violations
    this.reportViolations();

    // Participate in governance
    this.voteOnRandomProposal();

    // Leave comments (often critical/questioning)
    if (random() < (this.model.dao?.commentProbability || 0.2)) {
      this.leaveCriticalComment();
    }
  }

  /**
   * Monitor DAO activity for suspicious behavior
   */
  private monitorActivity(): void {
    if (!this.model.dao) return;

    // Check for suspicious proposals
    this.checkProposals();

    // Check for suspicious member behavior
    this.checkMembers();
  }

  /**
   * Check proposals for violations
   */
  private checkProposals(): void {
    if (!this.model.dao) return;

    const proposals = this.model.dao.proposals;

    for (const proposal of proposals) {
      // Skip if already investigated
      if (this.suspicions.has(`proposal_${proposal.uniqueId}`)) continue;

      const evidence: string[] = [];
      let suspicionLevel = 0;

      // Check for unrealistic funding goals
      if (proposal.fundingGoal > 50000) {
        evidence.push('Unusually high funding goal');
        suspicionLevel += 0.3;
      }

      // Check for rapid funding (possible manipulation)
      if (proposal.currentFunding > proposal.fundingGoal * 0.8 &&
          this.model.currentStep - proposal.creationTime < 5) {
        evidence.push('Suspiciously rapid funding');
        suspicionLevel += 0.4;
      }

      // Check vote manipulation (very lopsided votes)
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      if (totalVotes > 10) {
        const voteRatio = Math.max(proposal.votesFor, proposal.votesAgainst) / totalVotes;
        if (voteRatio > 0.95) {
          evidence.push('Potentially manipulated voting');
          suspicionLevel += 0.3;
        }
      }

      // Apply detection skill and randomness
      suspicionLevel *= this.detectionSkill;
      if (random() > DETECTION_PROBABILITY) {
        suspicionLevel *= 0.5;  // Reduce if not detected
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

      // Check for unusual token accumulation
      if (member.tokens > 1000) {
        evidence.push('Large token holdings');
        suspicionLevel += 0.2;
      }

      // Check for excessive staking (possible manipulation)
      if (member.stakedTokens > member.tokens * 3) {
        evidence.push('Unusual staking ratio');
        suspicionLevel += 0.3;
      }

      // Apply detection skill
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
  private investigateSuspicion(): void {
    if (!this.model.dao || this.suspicions.size === 0) return;

    // Pick highest suspicion to investigate
    let highest: SuspectedViolation | null = null;
    let highestKey: string | null = null;

    for (const [key, suspicion] of this.suspicions) {
      if (!suspicion.investigatedAt &&
          (!highest || suspicion.suspicionLevel > highest.suspicionLevel)) {
        highest = suspicion;
        highestKey = key;
      }
    }

    if (!highest || !highestKey) return;

    // Pay investigation cost
    this.tokens -= INVESTIGATION_COST;
    highest.investigatedAt = this.model.currentStep;

    // Determine outcome based on skill and suspicion level
    const accurateDetection = random() < this.detectionSkill;
    const actualViolation = highest.suspicionLevel > 0.5 && random() < highest.suspicionLevel;

    let finding: 'violation' | 'clean' | 'inconclusive';
    let wasFalsePositive = false;

    if (accurateDetection) {
      // Accurate detection - finding reflects reality
      finding = actualViolation ? 'violation' : 'clean';
    } else {
      // Inaccurate - may produce false positive or miss violation
      if (random() < FALSE_POSITIVE_RATE) {
        finding = 'violation';
        // This is a false positive if there's no actual violation
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

    // Emit investigation event
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
  }

  /**
   * Report confirmed violations
   */
  private reportViolations(): void {
    if (!this.model.dao) return;

    for (const record of this.investigations) {
      if (record.rewarded || record.finding !== 'violation') continue;

      // Create violation report
      const violation = new Violation(
        record.targetId,
        null,
        `Violation reported by whistleblower: ${record.targetType} ${record.targetId}`
      );

      this.model.dao.addViolation(violation);

      // Calculate and receive reward
      const reward = INVESTIGATION_COST * 2 * REPORT_REWARD_FRACTION;

      // Check if it was a false positive (determined during investigation)
      if (record.wasFalsePositive) {
        // Penalty for false report
        this.falseReports++;
        this.reputation = Math.max(0, this.reputation - MIN_REPUTATION_LOSS_FALSE_REPORT);

        if (this.model.eventBus) {
          this.model.eventBus.publish('false_report', {
            step: this.model.currentStep,
            whistleblower: this.uniqueId,
            targetId: record.targetId,
            reputationLoss: MIN_REPUTATION_LOSS_FALSE_REPORT,
          });
        }
      } else {
        // Successful report
        this.successfulReports++;
        this.totalRewards += reward;
        this.tokens += reward;

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
  }

  /**
   * Leave critical/questioning comments on proposals
   */
  private leaveCriticalComment(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProposals.length === 0) return;

    const proposal = randomChoice(openProposals);

    // Whistleblowers tend to leave negative/questioning comments
    const sentiment = randomChoice(['negative', 'negative', 'neutral']);
    this.leaveComment(proposal, sentiment);
  }
}
