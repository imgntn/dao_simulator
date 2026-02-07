// Speculator Agent - participates in prediction markets
// Upgraded with Q-learning to learn optimal betting strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Prediction configuration
const PREDICTION_PROBABILITY = 0.1;
const MIN_BET_AMOUNT = 1;
const MAX_BET_FRACTION = 0.1;

type SpeculatorAction = 'bet_high_pass' | 'bet_moderate_pass' | 'bet_high_fail' | 'bet_moderate_fail' | 'create_prediction' | 'hold';

export class Speculator extends DAOMember {
  static readonly ACTIONS: readonly SpeculatorAction[] = [
    'bet_high_pass', 'bet_moderate_pass', 'bet_high_fail', 'bet_moderate_fail', 'create_prediction', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  predictions: Set<string> = new Set();
  bets: Map<string, { choice: string; amount: number }> = new Map();

  // Learning tracking
  lastAction: SpeculatorAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  betHistory: Array<{ won: boolean; amount: number }> = [];
  totalWinnings: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
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
   * Get state representation for betting decisions
   */
  private getBettingState(): string {
    if (!this.model.dao) return 'none|low|balanced';

    // Prediction market state
    const predictions = this.model.dao.predictionMarket?.predictions || [];
    const marketState = predictions.length === 0 ? 'none' :
                        predictions.length < 3 ? 'few' :
                        predictions.length < 6 ? 'normal' : 'active';

    // Capital state
    const capitalRatio = this.tokens / Math.max(100, this.lastTokens);
    const capitalState = capitalRatio < 0.5 ? 'low' :
                         capitalRatio < 0.8 ? 'moderate' :
                         capitalRatio < 1.2 ? 'stable' : 'growing';

    // Recent performance state
    const recentBets = this.betHistory.slice(-10);
    const winRate = recentBets.length > 0
      ? recentBets.filter(b => b.won).length / recentBets.length
      : 0.5;
    const performanceState = winRate < 0.3 ? 'losing' :
                             winRate < 0.5 ? 'balanced' :
                             winRate < 0.7 ? 'winning' : 'hot';

    return StateDiscretizer.combineState(marketState, capitalState, performanceState);
  }

  /**
   * Choose betting action using Q-learning
   */
  private chooseBettingAction(): SpeculatorAction {
    const state = this.getBettingState();

    if (!settings.learning_enabled) {
      return this.heuristicBettingAction();
    }

    return this.learning.selectAction(
      state,
      [...Speculator.ACTIONS]
    ) as SpeculatorAction;
  }

  /**
   * Heuristic-based betting action (fallback)
   */
  private heuristicBettingAction(): SpeculatorAction {
    if (!this.model.dao) return 'hold';

    const predictions = this.model.dao.predictionMarket?.predictions || [];

    // Create predictions if market is quiet
    if (predictions.length < 3 && random() < PREDICTION_PROBABILITY) {
      return 'create_prediction';
    }

    if (predictions.length === 0) return 'hold';

    // Check win rate to decide bet size
    const recentBets = this.betHistory.slice(-5);
    const winRate = recentBets.length > 0
      ? recentBets.filter(b => b.won).length / recentBets.length
      : 0.5;

    if (winRate > 0.6) {
      return randomBool(0.5) ? 'bet_high_pass' : 'bet_high_fail';
    }

    return randomBool(0.5) ? 'bet_moderate_pass' : 'bet_moderate_fail';
  }

  /**
   * Execute betting action and return reward
   */
  private executeBettingAction(action: SpeculatorAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'bet_high_pass':
        reward = this.placeBet('pass', MAX_BET_FRACTION);
        break;
      case 'bet_moderate_pass':
        reward = this.placeBet('pass', MAX_BET_FRACTION / 2);
        break;
      case 'bet_high_fail':
        reward = this.placeBet('fail', MAX_BET_FRACTION);
        break;
      case 'bet_moderate_fail':
        reward = this.placeBet('fail', MAX_BET_FRACTION / 2);
        break;
      case 'create_prediction':
        this.createRandomPrediction();
        reward = 0.1;
        break;
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Place a bet on a prediction
   */
  private placeBet(choice: string, fraction: number): number {
    if (!this.model.dao) return -0.1;

    const predictions = this.model.dao.predictionMarket?.predictions || [];
    if (predictions.length === 0) return -0.1;

    const prediction = randomChoice(predictions);
    const maxBet = this.tokens * fraction;
    const amount = Math.min(this.tokens, Math.max(MIN_BET_AMOUNT, random() * maxBet));

    if (amount <= 0 || amount > this.tokens) return -0.1;

    const placed = this.model.dao.predictionMarket?.placeBet(
      this,
      prediction,
      choice,
      amount
    );

    if (placed) {
      this.bets.set(prediction.question, { choice, amount });
      this.markActive();
      return 0.1;
    }

    return -0.1;
  }

  /**
   * Update Q-values based on betting outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from token change
    const tokenChange = this.tokens - this.lastTokens;

    // Check resolved predictions for wins/losses
    if (this.model.dao?.predictionMarket) {
      const resolved = this.model.dao.predictionMarket.predictions.filter(p => p.resolved);
      for (const prediction of resolved) {
        const bet = this.bets.get(prediction.question);
        if (bet) {
          const won = bet.choice === prediction.resolution;
          this.betHistory.push({ won, amount: bet.amount });
          if (won) {
            this.totalWinnings += bet.amount;
          } else {
            this.totalWinnings -= bet.amount;
          }
          this.bets.delete(prediction.question);
        }
      }
    }
    if (this.betHistory.length > 50) {
      this.betHistory.splice(0, this.betHistory.length - 50);
    }

    // Normalize reward
    let reward = tokenChange / Math.max(50, this.lastTokens) * 10;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getBettingState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Speculator.ACTIONS]
    );
  }

  createRandomPrediction(): void {
    if (!this.model.dao) return;

    const openProposals = this.model.dao.proposals.filter(
      (p) => p.status === 'open'
    );

    if (openProposals.length === 0 || random() > PREDICTION_PROBABILITY) return;

    const proposal = randomChoice(openProposals);
    const question = `Will '${proposal.title}' pass?`;
    const resolveStep = proposal.creationTime + (proposal.votingPeriod || 10);

    this.model.dao.predictionMarket?.createPrediction(
      question,
      resolveStep,
      proposal
    );

    this.predictions.add(proposal.uniqueId);
  }

  betOnPrediction(): void {
    if (!this.model.dao) return;

    const predictions = this.model.dao.predictionMarket?.predictions || [];
    if (predictions.length === 0) return;

    const prediction = randomChoice(predictions);
    const choice = randomBool(0.5) ? 'pass' : 'fail';
    const maxBet = this.tokens * MAX_BET_FRACTION;
    const amount = Math.min(this.tokens, Math.max(MIN_BET_AMOUNT, random() * maxBet));

    if (amount <= 0 || amount > this.tokens) return;

    const placed = this.model.dao.predictionMarket?.placeBet(
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
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getBettingState();

    // Choose and execute action
    const action = this.chooseBettingAction();
    this.executeBettingAction(action);
    this.lastAction = action;

    // Participate in governance
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
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
   * Get learning statistics
   */
  getLearningStats(): {
    qTableSize: number;
    stateCount: number;
    episodeCount: number;
    totalReward: number;
    explorationRate: number;
    totalBets: number;
    winRate: number;
    totalWinnings: number;
  } {
    const winRate = this.betHistory.length > 0
      ? this.betHistory.filter(b => b.won).length / this.betHistory.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      totalBets: this.betHistory.length,
      winRate,
      totalWinnings: this.totalWinnings,
    };
  }
}
