// Data Collector for simulation statistics

import type { DataCollectorData, EventData } from '@/types/simulation';
import type { DAO } from '../data-structures/dao';

export class SimpleDataCollector implements DataCollectorData {
  modelVars: any[] = [];
  eventCounts: Map<string, number> = new Map();
  priceHistory: number[] = [];
  giniHistory: number[] = [];
  reputationGiniHistory: number[] = [];
  avgTokenHistory: number[] = [];
  delegationCentrality: Array<Map<string, number>> = [];
  tokenRankingHistory: Array<Array<[string, number]>> = [];
  influenceRankingHistory: Array<Array<[string, number]>> = [];
  achievements: Map<string, string> = new Map();
  campaignHistory: any[] = [];
  history: Array<{
    step: number;
    memberCount: number;
    proposalCount: number;
    projectCount: number;
    tokenPrice: number;
    treasuryFunds: number;
  }> = [];

  private centralityInterval: number;
  private lastCentralityStep: number | null = null;
  private dao: DAO | null = null;
  private lastCampaign: any = null;

  constructor(dao?: DAO, centralityInterval: number = 1) {
    this.centralityInterval = Math.max(1, Math.floor(centralityInterval));
    this.dao = dao || null;

    if (dao && dao.eventBus) {
      dao.eventBus.subscribe('*', this.handleEvent.bind(this));
    }
  }

  private handleEvent(data: EventData): void {
    const { event } = data;
    this.eventCounts.set(event, (this.eventCounts.get(event) || 0) + 1);

    if (event === 'marketing_campaign') {
      const prevPrice =
        (data as any).oldPrice ||
        (this.priceHistory.length > 0
          ? this.priceHistory[this.priceHistory.length - 1]
          : this.dao?.treasury.getTokenPrice('DAO_TOKEN') || 100);

      const newPrice = (data as any).newPrice || this.dao?.treasury.getTokenPrice('DAO_TOKEN') || 100;
      const prevMembers = (data as any).oldMembers || 0;
      const newMembers = (data as any).newMembers || 0;

      this.lastCampaign = {
        step: data.step,
        oldPrice: prevPrice,
        newPrice: newPrice,
        priceChange: newPrice - prevPrice,
        oldMembers: prevMembers,
        newMembers: newMembers,
        memberChange: newMembers - prevMembers,
      };
      this.campaignHistory.push(this.lastCampaign);
    }
  }

  /**
   * Collect statistics from the DAO
   */
  collect(dao: DAO): void {
    if (!this.dao) {
      this.dao = dao;
    }

    const step = dao.currentStep;

    // Collect token price
    const price = dao.treasury.getTokenPrice('DAO_TOKEN');
    this.priceHistory.push(price);

    // Calculate Gini coefficient for token distribution
    const tokenBalances = dao.members.map(m => m.tokens);
    const gini = this.calculateGini(tokenBalances);
    this.giniHistory.push(gini);

    // Calculate Gini coefficient for reputation
    const reputations = dao.members.map(m => m.reputation);
    const repGini = this.calculateGini(reputations);
    this.reputationGiniHistory.push(repGini);

    // Calculate average tokens
    const avgTokens = tokenBalances.reduce((a, b) => a + b, 0) / tokenBalances.length;
    this.avgTokenHistory.push(avgTokens);

    // Token rankings
    const tokenRanking = dao.members
      .map(m => [m.uniqueId, m.tokens] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    this.tokenRankingHistory.push(tokenRanking);

    // Influence rankings (reputation)
    const influenceRanking = dao.members
      .map(m => [m.uniqueId, m.reputation] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    this.influenceRankingHistory.push(influenceRanking);

    // Delegation centrality (only on interval)
    if (
      this.lastCentralityStep === null ||
      step - this.lastCentralityStep >= this.centralityInterval
    ) {
      const centrality = this.calculateDelegationCentrality(dao);
      this.delegationCentrality.push(centrality);
      this.lastCentralityStep = step;
    }

    // Store model variables
    this.modelVars.push({
      step,
      price,
      gini,
      repGini,
      avgTokens,
      numProposals: dao.proposals.length,
      numProjects: dao.projects.length,
      numMembers: dao.members.length,
    });

    this.history.push({
      step,
      memberCount: dao.members.length,
      proposalCount: dao.proposals.length,
      projectCount: dao.projects.length,
      tokenPrice: price,
      treasuryFunds: dao.treasury.funds,
    });
    if (this.history.length > 5000) {
      this.history.shift();
    }
  }

  /**
   * Calculate Gini coefficient for inequality measurement
   */
  private calculateGini(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    if (sum === 0) return 0;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i + 1) * sorted[i];
    }

    return (2 * numerator) / (n * sum) - (n + 1) / n;
  }

  /**
   * Calculate delegation centrality metrics
   */
  private calculateDelegationCentrality(dao: DAO): Map<string, number> {
    const centrality = new Map<string, number>();

    for (const member of dao.members) {
      let totalDelegated = 0;
      for (const [, amount] of member.delegations) {
        totalDelegated += amount;
      }
      centrality.set(member.uniqueId, totalDelegated);
    }

    return centrality;
  }

  /**
   * Get the latest statistics
   */
  getLatestStats() {
    return this.modelVars.length > 0 ? this.modelVars[this.modelVars.length - 1] : null;
  }

  /**
   * Reset all collected data
   */
  reset(): void {
    this.modelVars = [];
    this.eventCounts.clear();
    this.priceHistory = [];
    this.giniHistory = [];
    this.reputationGiniHistory = [];
    this.avgTokenHistory = [];
    this.delegationCentrality = [];
    this.tokenRankingHistory = [];
    this.influenceRankingHistory = [];
    this.achievements.clear();
    this.campaignHistory = [];
    this.history = [];
    this.lastCentralityStep = null;
    this.lastCampaign = null;
  }
}
