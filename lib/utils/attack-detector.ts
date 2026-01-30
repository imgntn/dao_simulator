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
  private voterVotes: Map<string, Map<string, VotingRecord>> = new Map();
  private lastPruneCutoff: number = -1;
  private tokenCacheDirty: boolean = true;
  private tokenDirectCounts: Map<string, Map<string, number>> = new Map();
  private tokenSources: Map<string, Set<string>> = new Map();
  private pairwiseStatsStep: number | null = null;
  private pairwiseVoters: string[] = [];
  private pairwiseIndex: Map<string, number> = new Map();
  private pairwiseShared: Int32Array = new Int32Array(0);
  private pairwiseMatches: Int32Array = new Int32Array(0);
  private pairwiseTemporal: Int32Array = new Int32Array(0);
  private pairwiseSize: number = 0;

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
    let votes = this.voterVotes.get(record.voterId);
    if (!votes) {
      votes = new Map();
      this.voterVotes.set(record.voterId, votes);
    }
    votes.set(record.proposalId, record);

    // Trim old records
    const cutoff = record.step - this.config.votingPatternWindow;
    this.votingHistory = this.votingHistory.filter(r => r.step >= cutoff);
    if (cutoff > this.lastPruneCutoff) {
      this.pruneVoterVotes(cutoff);
      this.lastPruneCutoff = cutoff;
    }
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
    this.tokenCacheDirty = true;
  }

  /**
   * Detect sybil attacks based on voting patterns
   */
  detectSybil(currentStep: number): AttackAlert[] {
    if (!this.config.enabled) return [];

    const alerts: AttackAlert[] = [];
    const cutoff = currentStep - this.config.votingPatternWindow;
    this.computePairwiseStats(currentStep, cutoff);

    // Calculate voting correlations between all pairs
    const voters = this.pairwiseVoters;
    const size = this.pairwiseSize;
    const edges: Array<{ a: string; b: string; correlation: number; temporal: number }> = [];

    for (let i = 0; i < voters.length; i++) {
      for (let j = i + 1; j < voters.length; j++) {
        const pairIndex = this.getPairIndex(i, j, size);
        const shared = this.pairwiseShared[pairIndex];
        if (shared === 0) continue;
        const correlation = this.pairwiseMatches[pairIndex] / shared;

        if (correlation >= this.config.sybilThresholdCorrelation) {
          // Check if they also have temporal clustering
          const temporalScore = this.pairwiseTemporal[pairIndex] / shared;

          if (temporalScore >= this.config.temporalClusteringThreshold * 0.5) {
            edges.push({
              a: voters[i],
              b: voters[j],
              correlation,
              temporal: temporalScore,
            });
          }
        }
      }
    }

    if (edges.length === 0) {
      return alerts;
    }

    // Cluster correlated pairs to avoid combinatorial alert explosions
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      const p = parent.get(x) || x;
      if (p === x) return x;
      const root = find(p);
      parent.set(x, root);
      return root;
    };
    const union = (a: string, b: string): void => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) {
        parent.set(rb, ra);
      }
    };

    for (const voter of voters) {
      parent.set(voter, voter);
    }
    for (const edge of edges) {
      union(edge.a, edge.b);
    }

    const clusters = new Map<string, { members: Set<string>; correlations: number[]; temporals: number[] }>();
    for (const edge of edges) {
      const root = find(edge.a);
      const entry = clusters.get(root) || { members: new Set<string>(), correlations: [], temporals: [] };
      entry.members.add(edge.a);
      entry.members.add(edge.b);
      entry.correlations.push(edge.correlation);
      entry.temporals.push(edge.temporal);
      clusters.set(root, entry);
    }

    for (const cluster of clusters.values()) {
      if (cluster.members.size < this.config.minClusterSize) {
        continue;
      }

      const avgCorrelation = cluster.correlations.length
        ? cluster.correlations.reduce((sum, v) => sum + v, 0) / cluster.correlations.length
        : 0;
      const avgTemporal = cluster.temporals.length
        ? cluster.temporals.reduce((sum, v) => sum + v, 0) / cluster.temporals.length
        : 0;

      const affectedProposals = new Set<string>();
      for (const memberId of cluster.members) {
        const proposals = this.voterVotes.get(memberId);
        if (!proposals) continue;
        for (const [proposalId, record] of proposals) {
          if (record.step >= cutoff) {
            affectedProposals.add(proposalId);
          }
        }
      }

      const alert = this.createAlert(
        'sybil',
        this.calculateSeverity(avgCorrelation, avgTemporal),
        currentStep,
        Array.from(affectedProposals),
        Array.from(cluster.members),
        (avgCorrelation + avgTemporal) / 2,
        {
          clusterSize: cluster.members.size,
          votingCorrelation: avgCorrelation,
          temporalCorrelation: avgTemporal,
        }
      );
      alerts.push(alert);
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
    const cutoff = currentStep - this.config.votingPatternWindow;
    this.computePairwiseStats(currentStep, cutoff);

    // Build similarity matrix
    const voters = this.pairwiseVoters;
    const size = this.pairwiseSize;

    for (let i = 0; i < voters.length; i++) {
      if (!voterSimilarity.has(voters[i])) {
        voterSimilarity.set(voters[i], new Map());
      }

      for (let j = i + 1; j < voters.length; j++) {
        const pairIndex = this.getPairIndex(i, j, size);
        const shared = this.pairwiseShared[pairIndex];
        const votingCorr = shared > 0 ? this.pairwiseMatches[pairIndex] / shared : 0;
        const temporalCorr = shared > 0 ? this.pairwiseTemporal[pairIndex] / shared : 0;
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

  private getVoterVotes(voterId: string): Map<string, VotingRecord> {
    return this.voterVotes.get(voterId) ?? new Map<string, VotingRecord>();
  }

  private calculateVotingCorrelation(
    votes1: Map<string, VotingRecord>,
    votes2: Map<string, VotingRecord>,
    cutoff: number
  ): number {
    let matches = 0;
    let shared = 0;

    const [small, large] = votes1.size <= votes2.size ? [votes1, votes2] : [votes2, votes1];
    for (const [proposalId, recordSmall] of small) {
      if (recordSmall.step < cutoff) continue;
      const recordLarge = large.get(proposalId);
      if (!recordLarge || recordLarge.step < cutoff) continue;
      shared++;
      if (recordSmall.vote === recordLarge.vote) {
        matches++;
      }
    }

    return shared > 0 ? matches / shared : 0;
  }

  private calculateTemporalClustering(
    votes1: Map<string, VotingRecord>,
    votes2: Map<string, VotingRecord>,
    cutoff: number
  ): number {
    let clustered = 0;
    let total = 0;

    const [small, large] = votes1.size <= votes2.size ? [votes1, votes2] : [votes2, votes1];
    for (const [proposalId, recordSmall] of small) {
      if (recordSmall.step < cutoff) continue;
      const recordLarge = large.get(proposalId);
      if (!recordLarge || recordLarge.step < cutoff) continue;
      total++;
      if (Math.abs(recordSmall.step - recordLarge.step) <= 2) {
        clustered++;
      }
    }

    return total > 0 ? clustered / total : 0;
  }

  private calculateTokenCorrelation(voter1: string, voter2: string): number {
    this.ensureTokenCaches();
    const directScore = Math.min((this.tokenDirectCounts.get(voter1)?.get(voter2) ?? 0) / 5, 1);

    const sources1 = this.tokenSources.get(voter1);
    const sources2 = this.tokenSources.get(voter2);

    let commonSources = 0;
    if (sources1 && sources2) {
      if (sources1.size <= sources2.size) {
        for (const source of sources1) {
          if (sources2.has(source)) commonSources++;
        }
      } else {
        for (const source of sources2) {
          if (sources1.has(source)) commonSources++;
        }
      }
    }

    const commonScore = Math.min(commonSources / 3, 1);

    return directScore * 0.6 + commonScore * 0.4;
  }

  private pruneVoterVotes(cutoff: number): void {
    for (const [voterId, votes] of this.voterVotes) {
      for (const [proposalId, record] of votes) {
        if (record.step < cutoff) {
          votes.delete(proposalId);
        }
      }
      if (votes.size === 0) {
        this.voterVotes.delete(voterId);
      }
    }
  }

  private ensureTokenCaches(): void {
    if (!this.tokenCacheDirty) return;

    this.tokenDirectCounts.clear();
    this.tokenSources.clear();

    for (const transfer of this.tokenTransfers) {
      let fromMap = this.tokenDirectCounts.get(transfer.from);
      if (!fromMap) {
        fromMap = new Map();
        this.tokenDirectCounts.set(transfer.from, fromMap);
      }
      fromMap.set(transfer.to, (fromMap.get(transfer.to) ?? 0) + 1);

      let toMap = this.tokenDirectCounts.get(transfer.to);
      if (!toMap) {
        toMap = new Map();
        this.tokenDirectCounts.set(transfer.to, toMap);
      }
      toMap.set(transfer.from, (toMap.get(transfer.from) ?? 0) + 1);

      let sources = this.tokenSources.get(transfer.to);
      if (!sources) {
        sources = new Set();
        this.tokenSources.set(transfer.to, sources);
      }
      sources.add(transfer.from);
    }

    this.tokenCacheDirty = false;
  }

  private computePairwiseStats(currentStep: number, cutoff: number): void {
    if (this.pairwiseStatsStep === currentStep) return;

    const voters = Array.from(this.voterVotes.keys());
    const size = voters.length;
    this.pairwiseVoters = voters;
    this.pairwiseIndex = new Map();
    for (let i = 0; i < voters.length; i++) {
      this.pairwiseIndex.set(voters[i], i);
    }

    this.pairwiseShared = new Int32Array(size * size);
    this.pairwiseMatches = new Int32Array(size * size);
    this.pairwiseTemporal = new Int32Array(size * size);
    this.pairwiseSize = size;

    const proposals = new Map<string, Array<{ idx: number; vote: boolean; step: number }>>();
    for (const [voterId, votes] of this.voterVotes) {
      const voterIdx = this.pairwiseIndex.get(voterId);
      if (voterIdx === undefined) continue;
      for (const [proposalId, record] of votes) {
        if (record.step < cutoff) continue;
        let list = proposals.get(proposalId);
        if (!list) {
          list = [];
          proposals.set(proposalId, list);
        }
        list.push({ idx: voterIdx, vote: record.vote, step: record.step });
      }
    }

    for (const list of proposals.values()) {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (a.idx === b.idx) continue;
          const pairIndex = this.getPairIndex(a.idx, b.idx, size);
          this.pairwiseShared[pairIndex]++;
          if (a.vote === b.vote) {
            this.pairwiseMatches[pairIndex]++;
          }
          if (Math.abs(a.step - b.step) <= 2) {
            this.pairwiseTemporal[pairIndex]++;
          }
        }
      }
    }

    this.pairwiseStatsStep = currentStep;
  }

  private getPairIndex(i: number, j: number, size: number): number {
    return i < j ? i * size + j : j * size + i;
  }


  private calculateClusterVotingCorrelation(members: string[]): number {
    if (members.length < 2) return 0;

    let totalCorr = 0;
    let count = 0;
    const size = this.pairwiseSize;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const idx = this.pairwiseIndex.get(members[i]);
        const jdx = this.pairwiseIndex.get(members[j]);
        if (idx === undefined || jdx === undefined) {
          count++;
          continue;
        }
        const pairIndex = this.getPairIndex(idx, jdx, size);
        const shared = this.pairwiseShared[pairIndex];
        totalCorr += shared > 0 ? this.pairwiseMatches[pairIndex] / shared : 0;
        count++;
      }
    }

    return count > 0 ? totalCorr / count : 0;
  }

  private calculateClusterTemporalCorrelation(members: string[]): number {
    if (members.length < 2) return 0;

    let totalCorr = 0;
    let count = 0;
    const size = this.pairwiseSize;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const idx = this.pairwiseIndex.get(members[i]);
        const jdx = this.pairwiseIndex.get(members[j]);
        if (idx === undefined || jdx === undefined) {
          count++;
          continue;
        }
        const pairIndex = this.getPairIndex(idx, jdx, size);
        const shared = this.pairwiseShared[pairIndex];
        totalCorr += shared > 0 ? this.pairwiseTemporal[pairIndex] / shared : 0;
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
      affectedProposals,
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
