/**
 * Attack Detector - Governance Attack Detection System
 *
 * Detects potential governance attacks including:
 * - Sybil attacks (multiple accounts controlled by same entity)
 * - Flash loan attacks (temporary voting power)
 * - Vote buying and manipulation
 * - Coordinated voting patterns
 */

import type { EventBus } from './event-bus';
import { gini } from './stats';

// =============================================================================
// TYPES
// =============================================================================

export type AttackType =
  | 'sybil'
  | 'flashloan'
  | 'vote_buying'
  | 'coordinated_voting'
  | 'whale_manipulation'
  | 'governance_takeover';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface VotingRecord {
  voterId: string;
  proposalId: string;
  vote: boolean;
  weight: number;
  step: number;
}

export interface TokenTransfer {
  from: string;
  to: string;
  amount: number;
  step: number;
}

export interface AttackAlert {
  alertId: string;
  attackType: AttackType;
  severity: SeverityLevel;
  detectedStep: number;
  affectedProposals: string[];
  suspectedAccounts: string[];
  confidence: number;        // 0-1
  details: Record<string, unknown>;
  resolved: boolean;
  resolvedStep: number | null;
}

export interface ClusterAnalysis {
  clusterId: string;
  members: string[];
  votingCorrelation: number;   // How correlated their votes are (0-1)
  temporalCorrelation: number; // How clustered in time (0-1)
  tokenCorrelation: number;    // Token movement correlation (0-1)
  riskScore: number;           // Overall risk (0-1)
}

export interface AttackDetectorConfig {
  sybilThresholdCorrelation: number;     // Min correlation for sybil detection
  flashloanWindowSteps: number;          // Steps to detect same-step attacks
  minClusterSize: number;                // Minimum accounts to form cluster
  giniAlertThreshold: number;            // Gini coefficient alert threshold
  votingPatternWindow: number;           // Steps to analyze for patterns
  temporalClusteringThreshold: number;   // Temporal clustering threshold
  enabled: boolean;
}

export interface AttackDetectorStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  alertsByType: Record<AttackType, number>;
  currentGini: number;
  averageVotingPowerConcentration: number;
  clustersDetected: number;
}

// =============================================================================
// ATTACK DETECTOR
// =============================================================================

export class AttackDetector {
  private votingHistory: VotingRecord[] = [];
  private tokenTransfers: TokenTransfer[] = [];
  private alerts: Map<string, AttackAlert> = new Map();
  private clusters: Map<string, ClusterAnalysis> = new Map();
  private eventBus: EventBus | null = null;
  private alertCounter: number = 0;

  // Cached metrics
  private cachedGini: number = 0;
  private lastGiniStep: number = -1;

  config: AttackDetectorConfig;

  constructor(config?: Partial<AttackDetectorConfig>) {
    this.config = {
      sybilThresholdCorrelation: 0.85,
      flashloanWindowSteps: 1,
      minClusterSize: 3,
      giniAlertThreshold: 0.8,
      votingPatternWindow: 100,
      temporalClusteringThreshold: 0.9,
      enabled: true,
      ...config,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Record a vote for analysis
   */
  recordVote(record: VotingRecord): void {
    if (!this.config.enabled) return;
    this.votingHistory.push(record);

    // Trim old records
    const cutoff = record.step - this.config.votingPatternWindow;
    this.votingHistory = this.votingHistory.filter(r => r.step >= cutoff);
  }

  /**
   * Record a token transfer for analysis
   */
  recordTransfer(transfer: TokenTransfer): void {
    if (!this.config.enabled) return;
    this.tokenTransfers.push(transfer);

    // Trim old records
    const cutoff = transfer.step - this.config.votingPatternWindow;
    this.tokenTransfers = this.tokenTransfers.filter(t => t.step >= cutoff);
  }

  /**
   * Detect sybil attacks based on voting patterns
   */
  detectSybil(currentStep: number): AttackAlert[] {
    if (!this.config.enabled) return [];

    const alerts: AttackAlert[] = [];
    const voterProposalVotes = new Map<string, Map<string, boolean>>();

    // Build voter -> {proposal -> vote} map
    for (const record of this.votingHistory) {
      if (!voterProposalVotes.has(record.voterId)) {
        voterProposalVotes.set(record.voterId, new Map());
      }
      voterProposalVotes.get(record.voterId)!.set(record.proposalId, record.vote);
    }

    // Calculate voting correlations between all pairs
    const voters = Array.from(voterProposalVotes.keys());

    for (let i = 0; i < voters.length; i++) {
      for (let j = i + 1; j < voters.length; j++) {
        const voter1Votes = voterProposalVotes.get(voters[i])!;
        const voter2Votes = voterProposalVotes.get(voters[j])!;

        const correlation = this.calculateVotingCorrelation(voter1Votes, voter2Votes);

        if (correlation >= this.config.sybilThresholdCorrelation) {
          // Check if they also have temporal clustering
          const temporalScore = this.calculateTemporalClustering(voters[i], voters[j]);

          if (temporalScore >= this.config.temporalClusteringThreshold * 0.5) {
            // Potential sybil detected
            const alert = this.createAlert(
              'sybil',
              this.calculateSeverity(correlation, temporalScore),
              currentStep,
              this.getSharedProposals(voter1Votes, voter2Votes),
              [voters[i], voters[j]],
              (correlation + temporalScore) / 2,
              {
                votingCorrelation: correlation,
                temporalCorrelation: temporalScore,
              }
            );
            alerts.push(alert);
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Detect flash loan attacks (same-step acquire-vote patterns)
   */
  detectFlashLoan(currentStep: number): AttackAlert[] {
    if (!this.config.enabled) return [];

    const alerts: AttackAlert[] = [];

    // Find votes in the current window
    const recentVotes = this.votingHistory.filter(
      v => currentStep - v.step <= this.config.flashloanWindowSteps
    );

    // Find corresponding token movements
    const recentTransfers = this.tokenTransfers.filter(
      t => currentStep - t.step <= this.config.flashloanWindowSteps
    );

    // Look for acquire-vote-return patterns
    for (const vote of recentVotes) {
      // Find incoming transfers before vote
      const incomingBefore = recentTransfers.filter(
        t => t.to === vote.voterId && t.step <= vote.step
      );

      // Find outgoing transfers after vote
      const outgoingAfter = recentTransfers.filter(
        t => t.from === vote.voterId && t.step >= vote.step
      );

      if (incomingBefore.length > 0 && outgoingAfter.length > 0) {
        const totalIn = incomingBefore.reduce((sum, t) => sum + t.amount, 0);
        const totalOut = outgoingAfter.reduce((sum, t) => sum + t.amount, 0);

        // If similar amounts moved in and out around the vote
        if (Math.abs(totalIn - totalOut) / totalIn < 0.1 && totalIn > vote.weight * 0.5) {
          const alert = this.createAlert(
            'flashloan',
            'high',
            currentStep,
            [vote.proposalId],
            [vote.voterId],
            0.8,
            {
              voteWeight: vote.weight,
              tokensAcquired: totalIn,
              tokensReturned: totalOut,
              windowSteps: this.config.flashloanWindowSteps,
            }
          );
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }

  /**
   * Calculate Gini coefficient for voting power distribution
   */
  calculateGini(votingPowers: number[]): number {
    return gini(votingPowers);
  }

  /**
   * Detect whale manipulation (concentrated voting power)
   */
  detectWhaleManipulation(
    votingPowers: number[],
    currentStep: number
  ): AttackAlert | null {
    if (!this.config.enabled) return null;

    const giniCoeff = this.calculateGini(votingPowers);
    this.cachedGini = giniCoeff;
    this.lastGiniStep = currentStep;

    if (giniCoeff >= this.config.giniAlertThreshold) {
      // Find the whales (top holders)
      const sorted = [...votingPowers].sort((a, b) => b - a);
      const total = sorted.reduce((sum, v) => sum + v, 0);
      let cumulative = 0;
      let whaleCount = 0;

      for (const power of sorted) {
        cumulative += power;
        whaleCount++;
        if (cumulative >= total * 0.5) break;  // Top holders with 50%+ power
      }

      return this.createAlert(
        'whale_manipulation',
        giniCoeff >= 0.9 ? 'critical' : 'high',
        currentStep,
        [],
        [], // Would need member IDs to populate
        giniCoeff,
        {
          giniCoefficient: giniCoeff,
          whaleCount,
          top10Percent: sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.1)))
            .reduce((sum, v) => sum + v, 0) / total,
        }
      );
    }

    return null;
  }

  /**
   * Analyze voting patterns for coordinated behavior
   */
  analyzeVotingPatterns(currentStep: number): ClusterAnalysis[] {
    if (!this.config.enabled) return [];

    const clusters: ClusterAnalysis[] = [];
    const voterSimilarity = new Map<string, Map<string, number>>();

    // Build similarity matrix
    const voters = [...new Set(this.votingHistory.map(v => v.voterId))];

    for (let i = 0; i < voters.length; i++) {
      if (!voterSimilarity.has(voters[i])) {
        voterSimilarity.set(voters[i], new Map());
      }

      for (let j = i + 1; j < voters.length; j++) {
        const voter1Votes = this.getVoterVotes(voters[i]);
        const voter2Votes = this.getVoterVotes(voters[j]);

        const votingCorr = this.calculateVotingCorrelation(voter1Votes, voter2Votes);
        const temporalCorr = this.calculateTemporalClustering(voters[i], voters[j]);
        const tokenCorr = this.calculateTokenCorrelation(voters[i], voters[j]);

        const similarity = (votingCorr * 0.5 + temporalCorr * 0.3 + tokenCorr * 0.2);

        voterSimilarity.get(voters[i])!.set(voters[j], similarity);
        if (!voterSimilarity.has(voters[j])) {
          voterSimilarity.set(voters[j], new Map());
        }
        voterSimilarity.get(voters[j])!.set(voters[i], similarity);
      }
    }

    // Simple clustering: group voters with high similarity
    const clustered = new Set<string>();
    let clusterCounter = 0;

    for (const voter of voters) {
      if (clustered.has(voter)) continue;

      const cluster: string[] = [voter];
      const similarities = voterSimilarity.get(voter) || new Map();

      for (const [other, sim] of similarities) {
        if (sim >= this.config.sybilThresholdCorrelation && !clustered.has(other)) {
          cluster.push(other);
          clustered.add(other);
        }
      }

      if (cluster.length >= this.config.minClusterSize) {
        clusterCounter++;
        const analysis: ClusterAnalysis = {
          clusterId: `cluster_${clusterCounter}`,
          members: cluster,
          votingCorrelation: this.calculateClusterVotingCorrelation(cluster),
          temporalCorrelation: this.calculateClusterTemporalCorrelation(cluster),
          tokenCorrelation: this.calculateClusterTokenCorrelation(cluster),
          riskScore: 0,
        };

        analysis.riskScore = (
          analysis.votingCorrelation * 0.4 +
          analysis.temporalCorrelation * 0.3 +
          analysis.tokenCorrelation * 0.3
        );

        clusters.push(analysis);
        this.clusters.set(analysis.clusterId, analysis);
      }

      clustered.add(voter);
    }

    // Emit cluster identified events
    for (const cluster of clusters) {
      if (cluster.riskScore >= 0.7) {
        this.emit('cluster_identified', {
          step: currentStep,
          clusterId: cluster.clusterId,
          memberCount: cluster.members.length,
          riskScore: cluster.riskScore,
          votingCorrelation: cluster.votingCorrelation,
        });
      }
    }

    return clusters;
  }

  /**
   * Process all detection for current step
   */
  process(
    currentStep: number,
    votingPowers?: number[]
  ): AttackAlert[] {
    if (!this.config.enabled) return [];

    const allAlerts: AttackAlert[] = [];

    // Run all detectors
    allAlerts.push(...this.detectSybil(currentStep));
    allAlerts.push(...this.detectFlashLoan(currentStep));

    if (votingPowers && votingPowers.length > 0) {
      const whaleAlert = this.detectWhaleManipulation(votingPowers, currentStep);
      if (whaleAlert) {
        allAlerts.push(whaleAlert);
      }
    }

    // Analyze patterns periodically
    if (currentStep % 10 === 0) {
      this.analyzeVotingPatterns(currentStep);
    }

    return allAlerts;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getVoterVotes(voterId: string): Map<string, boolean> {
    const votes = new Map<string, boolean>();
    for (const record of this.votingHistory) {
      if (record.voterId === voterId) {
        votes.set(record.proposalId, record.vote);
      }
    }
    return votes;
  }

  private calculateVotingCorrelation(
    votes1: Map<string, boolean>,
    votes2: Map<string, boolean>
  ): number {
    const sharedProposals = this.getSharedProposals(votes1, votes2);
    if (sharedProposals.length === 0) return 0;

    let matches = 0;
    for (const proposalId of sharedProposals) {
      if (votes1.get(proposalId) === votes2.get(proposalId)) {
        matches++;
      }
    }

    return matches / sharedProposals.length;
  }

  private getSharedProposals(
    votes1: Map<string, boolean>,
    votes2: Map<string, boolean>
  ): string[] {
    const shared: string[] = [];
    for (const proposalId of votes1.keys()) {
      if (votes2.has(proposalId)) {
        shared.push(proposalId);
      }
    }
    return shared;
  }

  private calculateTemporalClustering(voter1: string, voter2: string): number {
    const votes1 = this.votingHistory.filter(v => v.voterId === voter1);
    const votes2 = this.votingHistory.filter(v => v.voterId === voter2);

    if (votes1.length === 0 || votes2.length === 0) return 0;

    let clustered = 0;
    let total = 0;

    for (const v1 of votes1) {
      for (const v2 of votes2) {
        if (v1.proposalId === v2.proposalId) {
          total++;
          if (Math.abs(v1.step - v2.step) <= 2) {
            clustered++;
          }
        }
      }
    }

    return total > 0 ? clustered / total : 0;
  }

  private calculateTokenCorrelation(voter1: string, voter2: string): number {
    // Check for token movements between voters
    const directTransfers = this.tokenTransfers.filter(
      t => (t.from === voter1 && t.to === voter2) ||
           (t.from === voter2 && t.to === voter1)
    );

    // Check for common sources
    const sources1 = new Set(
      this.tokenTransfers.filter(t => t.to === voter1).map(t => t.from)
    );
    const sources2 = new Set(
      this.tokenTransfers.filter(t => t.to === voter2).map(t => t.from)
    );

    const commonSources = [...sources1].filter(s => sources2.has(s)).length;

    const directScore = Math.min(directTransfers.length / 5, 1);
    const commonScore = Math.min(commonSources / 3, 1);

    return directScore * 0.6 + commonScore * 0.4;
  }

  private calculateClusterVotingCorrelation(members: string[]): number {
    if (members.length < 2) return 0;

    let totalCorr = 0;
    let count = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const votes1 = this.getVoterVotes(members[i]);
        const votes2 = this.getVoterVotes(members[j]);
        totalCorr += this.calculateVotingCorrelation(votes1, votes2);
        count++;
      }
    }

    return count > 0 ? totalCorr / count : 0;
  }

  private calculateClusterTemporalCorrelation(members: string[]): number {
    if (members.length < 2) return 0;

    let totalCorr = 0;
    let count = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalCorr += this.calculateTemporalClustering(members[i], members[j]);
        count++;
      }
    }

    return count > 0 ? totalCorr / count : 0;
  }

  private calculateClusterTokenCorrelation(members: string[]): number {
    if (members.length < 2) return 0;

    let totalCorr = 0;
    let count = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalCorr += this.calculateTokenCorrelation(members[i], members[j]);
        count++;
      }
    }

    return count > 0 ? totalCorr / count : 0;
  }

  private calculateSeverity(
    votingCorrelation: number,
    temporalCorrelation: number
  ): SeverityLevel {
    const combined = (votingCorrelation + temporalCorrelation) / 2;

    if (combined >= 0.95) return 'critical';
    if (combined >= 0.9) return 'high';
    if (combined >= 0.85) return 'medium';
    return 'low';
  }

  private createAlert(
    attackType: AttackType,
    severity: SeverityLevel,
    currentStep: number,
    affectedProposals: string[],
    suspectedAccounts: string[],
    confidence: number,
    details: Record<string, unknown>
  ): AttackAlert {
    this.alertCounter++;
    const alertId = `alert_${this.alertCounter}`;

    const alert: AttackAlert = {
      alertId,
      attackType,
      severity,
      detectedStep: currentStep,
      affectedProposals,
      suspectedAccounts,
      confidence,
      details,
      resolved: false,
      resolvedStep: null,
    };

    this.alerts.set(alertId, alert);

    this.emit('attack_detected', {
      step: currentStep,
      alertId,
      attackType,
      severity,
      confidence,
      suspectedAccounts: suspectedAccounts.length,
    });

    if (severity === 'critical' || severity === 'high') {
      this.emit('suspicious_behavior', {
        step: currentStep,
        alertId,
        attackType,
        severity,
        details,
      });
    }

    return alert;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): AttackAlert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AttackAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, currentStep: number): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolvedStep = currentStep;
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): AttackDetectorStats {
    const alertsByType: Record<AttackType, number> = {
      sybil: 0,
      flashloan: 0,
      vote_buying: 0,
      coordinated_voting: 0,
      whale_manipulation: 0,
      governance_takeover: 0,
    };

    let activeAlerts = 0;
    let resolvedAlerts = 0;

    for (const alert of this.alerts.values()) {
      alertsByType[alert.attackType]++;
      if (alert.resolved) {
        resolvedAlerts++;
      } else {
        activeAlerts++;
      }
    }

    return {
      totalAlerts: this.alerts.size,
      activeAlerts,
      resolvedAlerts,
      alertsByType,
      currentGini: this.cachedGini,
      averageVotingPowerConcentration: this.cachedGini,
      clustersDetected: this.clusters.size,
    };
  }

  /**
   * Emit event
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.publish(event, data as { step: number; [key: string]: unknown });
    }
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    return {
      config: this.config,
      alertCounter: this.alertCounter,
      alerts: Array.from(this.alerts.entries()),
      clusters: Array.from(this.clusters.entries()),
      cachedGini: this.cachedGini,
      lastGiniStep: this.lastGiniStep,
      // Don't serialize full history - too large
      votingHistoryLength: this.votingHistory.length,
      tokenTransfersLength: this.tokenTransfers.length,
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): AttackDetector {
    const detector = new AttackDetector(data.config);
    detector.alertCounter = data.alertCounter || 0;
    detector.cachedGini = data.cachedGini || 0;
    detector.lastGiniStep = data.lastGiniStep || -1;

    if (data.alerts) {
      for (const [id, alert] of data.alerts) {
        detector.alerts.set(id, alert);
      }
    }

    if (data.clusters) {
      for (const [id, cluster] of data.clusters) {
        detector.clusters.set(id, cluster);
      }
    }

    return detector;
  }
}

/**
 * Factory function to create attack detector with standard settings
 */
export function createStandardAttackDetector(): AttackDetector {
  return new AttackDetector({
    sybilThresholdCorrelation: 0.85,
    flashloanWindowSteps: 2,
    minClusterSize: 3,
    giniAlertThreshold: 0.8,
    votingPatternWindow: 100,
    temporalClusteringThreshold: 0.8,
    enabled: true,
  });
}
