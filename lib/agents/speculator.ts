// Speculator Agent - participates in prediction markets
// Port from agents/speculator.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomBool } from '../utils/random';

// Prediction configuration
const PREDICTION_PROBABILITY = 0.1;   // 10% chance to create prediction per step
const MIN_BET_AMOUNT = 1;
const MAX_BET_FRACTION = 0.1;         // Bet at most 10% of tokens

export class Speculator extends DAOMember {
  predictions: Set<string> = new Set();  // Track created predictions
  bets: Map<string, { choice: string; amount: number }> = new Map();  // Track bets

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
  }

  /**
   * Create a prediction about a random proposal
   */
  createRandomPrediction(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(
      (p) => p.status === 'open'
    );

    // Only create prediction with configured probability
    if (openProposals.length === 0 || random() > PREDICTION_PROBABILITY) {
      return;
    }

    const proposal = randomChoice(openProposals);
    const question = `Will '${proposal.title}' pass?`;
    const resolveStep = proposal.creationTime + (proposal.votingPeriod || 10);

    this.model.dao.predictionMarket.createPrediction(
      question,
      resolveStep,
      proposal
    );

    this.predictions.add(proposal.uniqueId);
  }

  /**
   * Place a bet on a random prediction
   */
  betOnPrediction(): void {
    if (!this.model.dao) return;

    const predictions = this.model.dao.predictionMarket.predictions;

    if (predictions.length === 0) {
      return;
    }

    const prediction = randomChoice(predictions);
    const choice = randomBool(0.5) ? 'pass' : 'fail';

    // Calculate bet amount as fraction of holdings (more realistic)
    const maxBet = this.tokens * MAX_BET_FRACTION;
    const amount = Math.min(this.tokens, Math.max(MIN_BET_AMOUNT, random() * maxBet));

    if (amount <= 0 || amount > this.tokens) {
      return;
    }

    const placed = this.model.dao.predictionMarket.placeBet(
      this,
      prediction,
      choice,
      amount
    );

    if (placed) {
      this.bets.set(prediction.question, { choice, amount });
      this.markActive();
    }
  }

  step(): void {
    this.createRandomPrediction();
    this.betOnPrediction();
    this.voteOnRandomProposal();

    // Occasionally leave comments
    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
