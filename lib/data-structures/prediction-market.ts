// Prediction Market - betting system on proposal outcomes
// Port from data_structures/prediction_market.py

import type { DAO } from './dao';
import type { Treasury } from './treasury';
import type { EventBus } from '../utils/event-bus';
import type { DAOMember } from '../agents/base';
import { randomBool } from '../utils/random';

export interface Prediction {
  question: string;
  resolveStep: number;
  target: unknown | null;
  bets: Array<[DAOMember, string, number]>;
  resolved: boolean;
  outcome: string | null;
}

export class PredictionMarket {
  dao: DAO;
  treasury: Treasury;
  eventBus: EventBus | null;
  predictions: Prediction[] = [];
  private resolvedPredictions: Prediction[] = [];

  constructor(dao: DAO, treasury: Treasury, eventBus?: EventBus) {
    this.dao = dao;
    this.treasury = treasury;
    this.eventBus = eventBus || null;
  }

  /**
   * Create a new prediction
   */
  createPrediction(
    question: string,
    resolveStep: number,
    target: unknown = null
  ): Prediction {
    const prediction: Prediction = {
      question,
      resolveStep,
      target,
      bets: [],
      resolved: false,
      outcome: null,
    };

    this.predictions.push(prediction);

    if (this.eventBus) {
      this.eventBus.publish('prediction_created', {
        step: this.dao.currentStep || 0,
        question,
        resolveStep,
      });
    }

    return prediction;
  }

  /**
   * Place a bet on a prediction
   */
  placeBet(
    member: DAOMember,
    prediction: Prediction,
    choice: string,
    amount: number
  ): boolean {
    if (
      !this.predictions.includes(prediction) ||
      prediction.resolved ||
      (choice !== 'pass' && choice !== 'fail') ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(member.tokens) ||
      member.tokens < amount
    ) {
      return false;
    }

    // Deduct tokens from member
    member.tokens -= amount;

    // Deposit into treasury
    this.treasury.deposit('DAO_TOKEN', amount, this.dao.currentStep || 0);

    // Record bet
    prediction.bets.push([member, choice, amount]);

    if (this.eventBus) {
      this.eventBus.publish('bet_placed', {
        step: this.dao.currentStep || 0,
        member: member.uniqueId,
        question: prediction.question,
        choice,
        amount,
      });
    }

    return true;
  }

  /**
   * Determine the outcome of a prediction
   */
  private determineOutcome(prediction: Prediction): string {
    // If target has status property, use it
    if (typeof prediction.target === 'object' && prediction.target !== null) {
      const status = (prediction.target as { status?: unknown }).status;
      if (typeof status === 'string') {
        return status === 'approved' ? 'pass' : 'fail';
      }
    }

    // Otherwise random
    return randomBool() ? 'pass' : 'fail';
  }

  /**
   * Resolve all predictions that are due
   */
  resolvePredictions(step: number): void {
    const remaining: Prediction[] = [];

    for (const pred of this.predictions) {
      if (pred.resolved || step < pred.resolveStep) {
        remaining.push(pred);
        continue;
      }

      // Resolve this prediction
      const outcome = this.determineOutcome(pred);
      pred.outcome = outcome;
      pred.resolved = true;

      // Calculate winners
      const winners = pred.bets.filter(([, choice]) => choice === outcome);
      const totalPool = pred.bets.reduce((sum, [, , amt]) => sum + amt, 0);
      const totalWinning = winners.reduce((sum, [, , amt]) => sum + amt, 0);

      if (totalWinning > 0) {
        // Distribute winnings proportionally
        for (const [member, , amt] of winners) {
          const share = totalPool * (amt / totalWinning);
          const gained = this.treasury.withdraw('DAO_TOKEN', share, step);
          member.tokens += gained;
        }
      }

      if (this.eventBus) {
        this.eventBus.publish('prediction_resolved', {
          step,
          question: pred.question,
          outcome,
        });
      }

      this.resolvedPredictions.push(pred);
    }

    this.predictions = remaining;
  }

  /**
   * Get all active predictions
   */
  getActivePredictions(): Prediction[] {
    return this.predictions.filter((p) => !p.resolved);
  }

  /**
   * Get resolved predictions retained for learning and analytics.
   */
  getResolvedPredictions(): Prediction[] {
    return [...this.resolvedPredictions];
  }

  /**
   * Get prediction statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    resolved: number;
    totalBets: number;
    totalVolume: number;
  } {
    const allPredictions = [...this.predictions, ...this.resolvedPredictions];
    const active = this.predictions.filter((p) => !p.resolved).length;
    const resolved = this.resolvedPredictions.length;
    const totalBets = allPredictions.reduce(
      (sum, p) => sum + p.bets.length,
      0
    );
    const totalVolume = allPredictions.reduce(
      (sum, p) => sum + p.bets.reduce((s, [, , amt]) => s + amt, 0),
      0
    );

    return {
      total: allPredictions.length,
      active,
      resolved,
      totalBets,
      totalVolume,
    };
  }
}
