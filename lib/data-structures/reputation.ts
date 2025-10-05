// Reputation Tracker - tracks member actions and updates reputation
// Port from data_structures/reputation.py

import type { DAO } from './dao';
import type { DAOMember } from '../agents/base';

export class ReputationTracker {
  dao: DAO;
  decayRate: number;
  lastActivity: Map<string, number> = new Map();

  constructor(dao: DAO, decayRate: number = 0.01) {
    this.dao = dao;
    this.decayRate = decayRate;

    // Subscribe to relevant events
    if (dao.eventBus) {
      dao.eventBus.subscribe('project_worked', this.handleEvent.bind(this));
      dao.eventBus.subscribe('service_offered', this.handleEvent.bind(this));
      dao.eventBus.subscribe('proposal_invested', this.handleEvent.bind(this));
    }
  }

  /**
   * Get member by unique ID
   */
  private getMember(uid: string): DAOMember | null {
    return this.dao.members.find((m) => m.uniqueId === uid) || null;
  }

  /**
   * Handle reputation-affecting events
   */
  private handleEvent(data: Record<string, any>): void {
    const currentStep = (this.dao as any).currentStep || 0;
    const event = data.event;

    switch (event) {
      case 'project_worked': {
        const member = this.getMember(data.member);
        if (member) {
          const work = data.work || 0;
          member.reputation += work / 10;
          this.lastActivity.set(member.uniqueId, currentStep);
        }
        break;
      }

      case 'service_offered': {
        const member = this.getMember(data.provider);
        if (member) {
          member.reputation += 1;
          this.lastActivity.set(member.uniqueId, currentStep);
        }
        break;
      }

      case 'proposal_invested': {
        const member = this.getMember(data.investor);
        if (member) {
          const amount = data.amount || 0;
          member.reputation += amount / 100;
          this.lastActivity.set(member.uniqueId, currentStep);
        }
        break;
      }
    }
  }

  /**
   * Apply inactivity decay to all members
   */
  decayReputation(): void {
    const currentStep = (this.dao as any).currentStep || 0;

    for (const member of this.dao.members) {
      const lastActive = this.lastActivity.get(member.uniqueId) || 0;

      if (currentStep > lastActive) {
        member.reputation *= 1 - this.decayRate;
      }
    }
  }

  /**
   * Get reputation statistics
   */
  getStatistics(): {
    average: number;
    median: number;
    min: number;
    max: number;
    totalAboveZero: number;
    totalBelowZero: number;
  } {
    if (this.dao.members.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        totalAboveZero: 0,
        totalBelowZero: 0,
      };
    }

    const reputations = this.dao.members.map((m) => m.reputation).sort((a, b) => a - b);
    const sum = reputations.reduce((s, r) => s + r, 0);
    const average = sum / reputations.length;
    const median = reputations[Math.floor(reputations.length / 2)];
    const min = reputations[0];
    const max = reputations[reputations.length - 1];
    const totalAboveZero = reputations.filter((r) => r > 0).length;
    const totalBelowZero = reputations.filter((r) => r < 0).length;

    return {
      average,
      median,
      min,
      max,
      totalAboveZero,
      totalBelowZero,
    };
  }

  /**
   * Get members ranked by reputation
   */
  getRankings(limit: number = 10): Array<{ id: string; reputation: number }> {
    return this.dao.members
      .map((m) => ({ id: m.uniqueId, reputation: m.reputation }))
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, limit);
  }
}
