// Speculator Agent - participates in prediction markets
// Port from agents/speculator.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';

export class Speculator extends DAOMember {
  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy: any = null
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
  }

  /**
   * Create a prediction about a random proposal
   */
  createRandomPrediction(): void {
    const openProposals = this.model.dao.proposals.filter(
      (p) => p.status === 'open'
    );

    if (openProposals.length === 0 || Math.random() > 0.1) {
      return;
    }

    const proposal = openProposals[
      Math.floor(Math.random() * openProposals.length)
    ];
    const question = `Will '${proposal.title}' pass?`;
    const resolveStep = proposal.createdAt + (proposal.votingPeriod || 10);

    this.model.dao.predictionMarket.createPrediction(
      question,
      resolveStep,
      proposal
    );
  }

  /**
   * Place a bet on a random prediction
   */
  betOnPrediction(): void {
    const predictions = this.model.dao.predictionMarket.predictions;

    if (predictions.length === 0) {
      return;
    }

    const prediction =
      predictions[Math.floor(Math.random() * predictions.length)];
    const choice = Math.random() < 0.5 ? 'pass' : 'fail';
    const amount = Math.min(this.tokens, Math.random() * 5 + 1);

    if (amount <= 0) {
      return;
    }

    const placed = this.model.dao.predictionMarket.placeBet(
      this.uniqueId,
      prediction,
      choice,
      amount
    );

    if (placed) {
      this.markActive();
    }
  }

  step(): void {
    this.createRandomPrediction();
    this.betOnPrediction();
    this.voteOnRandomProposal();

    // Occasionally leave comments
    if (Math.random() < (this.model.dao.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
