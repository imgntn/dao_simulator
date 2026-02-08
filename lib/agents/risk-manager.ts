// Risk Manager Agent - Monitors portfolio concentration and manages risk
// Upgraded with Q-learning to learn optimal risk management strategies

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { random, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Risk thresholds
const MAX_STAKE_RATIO = 0.7;
const REBALANCE_THRESHOLD = 0.1;
const RISK_ASSESSMENT_PROBABILITY = 0.8;

type RiskAction = 'stake_more' | 'unstake_some' | 'rebalance' | 'raise_alert' | 'hold' | 'hedge';

interface PortfolioState {
  totalValue: number;
  stakedRatio: number;
  liquidRatio: number;
  concentrationRisk: number;
  volatilityExposure: number;
}

interface RiskAlert {
  step: number;
  type: 'concentration' | 'volatility' | 'liquidity' | 'stake';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export class RiskManager extends DAOMember {
  static readonly ACTIONS: readonly RiskAction[] = [
    'stake_more', 'unstake_some', 'rebalance', 'raise_alert', 'hold', 'hedge'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  targetStakeRatio: number;
  riskTolerance: number;
  alerts: RiskAlert[] = [];
  portfolioHistory: PortfolioState[] = [];
  rebalanceCount: number = 0;

  // Learning tracking
  lastAction: RiskAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  lastPortfolioValue: number;
  alertHistory: Array<{ correct: boolean; severity: string }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 60,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    this.targetStakeRatio = 0.2 + random() * 0.4;
    this.riskTolerance = random();
    this.lastTokens = tokens;
    this.lastPortfolioValue = tokens;

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
   * Get state representation for risk decisions
   */
  private getRiskState(): string {
    if (!this.model.dao) return 'adequate|low|low';

    const totalValue = this.tokens + this.stakedTokens;
    const stakedRatio = totalValue > 0 ? this.stakedTokens / totalValue : 0;

    // Stake level state
    const stakeState = stakedRatio < 0.2 ? 'low' :
                       stakedRatio < 0.5 ? 'moderate' :
                       stakedRatio < MAX_STAKE_RATIO ? 'high' : 'excessive';

    // Volatility state from portfolio history
    const volatility = this.calculateVolatilityExposure();
    const volatilityState = volatility < 0.3 ? 'low' :
                            volatility < 0.6 ? 'medium' : 'high';

    // Liquidity state
    const liquidRatio = 1 - stakedRatio;
    const liquidityState = liquidRatio < 0.2 ? 'critical' :
                           liquidRatio < 0.4 ? 'low' :
                           liquidRatio < 0.6 ? 'adequate' : 'high';

    return StateDiscretizer.combineState(stakeState, volatilityState, liquidityState);
  }

  /**
   * Choose risk action using Q-learning
   */
  private chooseRiskAction(): RiskAction {
    const state = this.getRiskState();

    if (!settings.learning_enabled) {
      return this.heuristicRiskAction();
    }

    return this.learning.selectAction(
      state,
      [...RiskManager.ACTIONS]
    ) as RiskAction;
  }

  /**
   * Heuristic-based risk action (fallback)
   */
  private heuristicRiskAction(): RiskAction {
    if (!this.model.dao) return 'hold';

    const totalValue = this.tokens + this.stakedTokens;
    const currentStakeRatio = totalValue > 0 ? this.stakedTokens / totalValue : 0;
    const volatility = this.calculateVolatilityExposure();

    // High volatility - reduce exposure
    if (volatility > 0.7) {
      return 'unstake_some';
    }

    // Excessive stake - unstake
    if (currentStakeRatio > MAX_STAKE_RATIO) {
      return 'unstake_some';
    }

    // Below target - stake more
    if (currentStakeRatio < this.targetStakeRatio - REBALANCE_THRESHOLD) {
      return 'stake_more';
    }

    // Above target - unstake
    if (currentStakeRatio > this.targetStakeRatio + REBALANCE_THRESHOLD) {
      return 'unstake_some';
    }

    // Check for alerts
    if (this.alerts.filter(a => a.step === this.model.currentStep).length > 0) {
      return 'raise_alert';
    }

    return 'hold';
  }

  /**
   * Execute risk action and return reward
   */
  private executeRiskAction(action: RiskAction): number {
    if (!this.model.dao) return 0;

    let reward = 0;

    switch (action) {
      case 'stake_more': {
        const toStake = Math.min(this.tokens * 0.3, 50);
        if (toStake > 1) {
          this.stakeTokens(toStake);
          this.rebalanceCount++;
          reward = 0.2;
        }
        break;
      }
      case 'unstake_some': {
        const toUnstake = Math.min(this.stakedTokens * 0.3, 50);
        if (toUnstake > 1) {
          this.unstakeTokens(toUnstake);
          this.rebalanceCount++;
          reward = 0.2;
        }
        break;
      }
      case 'rebalance': {
        this.rebalancePortfolio();
        reward = 0.3;
        break;
      }
      case 'raise_alert': {
        // Check if alert is warranted
        const volatility = this.calculateVolatilityExposure();
        if (volatility > 0.5) {
          this.createAlert('volatility', 'medium', 'Elevated volatility detected');
          reward = 0.5; // Good alert
          this.alertHistory.push({ correct: true, severity: 'medium' });
        } else {
          reward = -0.3; // False alarm
          this.alertHistory.push({ correct: false, severity: 'low' });
        }
        break;
      }
      case 'hedge': {
        // Reduce stake to hedge
        const hedgeAmount = this.stakedTokens * 0.1;
        if (hedgeAmount > 1) {
          this.unstakeTokens(hedgeAmount);
          reward = 0.1;
        }
        break;
      }
      case 'hold':
        return 0;
    }

    this.markActive();
    return reward;
  }

  /**
   * Update Q-values based on performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from portfolio value change and risk metrics
    const currentValue = this.tokens + this.stakedTokens;
    const valueChange = currentValue - this.lastPortfolioValue;
    const volatility = this.calculateVolatilityExposure();

    // Reward for value preservation and low volatility
    let reward = valueChange / Math.max(100, this.lastPortfolioValue) * 10;
    reward -= volatility * 2; // Penalty for high volatility
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getRiskState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...RiskManager.ACTIONS]
    );
  }

  step(): void {
    if (!this.model.dao) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastPortfolioValue = this.tokens + this.stakedTokens;
    this.lastState = this.getRiskState();

    // Assess portfolio risk
    if (randomBool(RISK_ASSESSMENT_PROBABILITY)) {
      this.assessRisk();
    }

    // Choose and execute action
    const action = this.chooseRiskAction();
    this.executeRiskAction(action);
    this.lastAction = action;

    // Participate in governance
    this.voteOnRandomProposal();

    if (random() < (this.model.dao?.commentProbability || 0.2)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  /**
   * Assess current portfolio risk
   */
  private assessRisk(): void {
    if (!this.model.dao) return;

    const totalValue = this.tokens + this.stakedTokens;
    const stakedRatio = totalValue > 0 ? this.stakedTokens / totalValue : 0;
    const liquidRatio = 1 - stakedRatio;
    const concentrationRisk = this.calculateConcentrationRisk();
    const volatilityExposure = this.calculateVolatilityExposure();

    const state: PortfolioState = {
      totalValue,
      stakedRatio,
      liquidRatio,
      concentrationRisk,
      volatilityExposure,
    };

    this.portfolioHistory.push(state);
    if (this.portfolioHistory.length > 100) {
      this.portfolioHistory.shift();
    }

    this.checkRiskAlerts(state);

    if (this.model.eventBus) {
      this.model.eventBus.publish('risk_assessed', {
        step: this.model.currentStep,
        manager: this.uniqueId,
        totalValue,
        stakedRatio,
        concentrationRisk,
        volatilityExposure,
        alertCount: this.alerts.filter(a => a.step === this.model.currentStep).length,
      });
    }
  }

  private calculateConcentrationRisk(): number {
    if (!this.model.dao) return 0.5;

    const members = this.model.dao.members;
    if (members.length === 0) return 0;

    // HHI-inspired: calculate this agent's share of total supply
    const totalSupply = members.reduce(
      (sum, m) => sum + m.tokens + m.stakedTokens, 0
    );
    if (totalSupply <= 0) return 0;

    const myHoldings = this.tokens + this.stakedTokens;
    const myShare = myHoldings / totalSupply;

    // Also factor in overall concentration (top-heavy distribution)
    // Sum of squared shares across all members (HHI)
    let hhi = 0;
    for (const m of members) {
      const share = (m.tokens + m.stakedTokens) / totalSupply;
      hhi += share * share;
    }

    // Blend personal concentration with market concentration
    // myShare near 0 = low risk, myShare near 1 = very high risk
    // hhi near 1/N = equal distribution (low risk), hhi near 1 = monopoly (high risk)
    return Math.min(1, myShare * 3 + hhi * 2);
  }

  private calculateVolatilityExposure(): number {
    if (!this.model.dao || this.portfolioHistory.length < 2) return 0.5;

    const recentStates = this.portfolioHistory.slice(-10);
    if (recentStates.length < 2) return 0.5;

    const values = recentStates.map(s => s.totalValue);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return Math.min(1, stdDev / Math.max(1, mean));
  }

  private checkRiskAlerts(state: PortfolioState): void {
    if (state.stakedRatio > MAX_STAKE_RATIO) {
      this.createAlert('stake', 'high', `Stake ratio ${(state.stakedRatio * 100).toFixed(1)}% exceeds limit`);
    } else if (state.stakedRatio > MAX_STAKE_RATIO * 0.8) {
      this.createAlert('stake', 'medium', `Stake ratio ${(state.stakedRatio * 100).toFixed(1)}% approaching limit`);
    }

    if (state.liquidRatio < 0.2) {
      this.createAlert('liquidity', 'high', `Low liquidity: only ${(state.liquidRatio * 100).toFixed(1)}% liquid`);
    }

    if (state.volatilityExposure > 0.7) {
      this.createAlert('volatility', 'high', `High volatility exposure: ${(state.volatilityExposure * 100).toFixed(1)}%`);
    } else if (state.volatilityExposure > 0.5) {
      this.createAlert('volatility', 'medium', `Elevated volatility: ${(state.volatilityExposure * 100).toFixed(1)}%`);
    }
  }

  private createAlert(
    type: RiskAlert['type'],
    severity: RiskAlert['severity'],
    description: string
  ): void {
    const alert: RiskAlert = {
      step: this.model.currentStep,
      type,
      severity,
      description,
    };

    this.alerts.push(alert);
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    if (this.model.eventBus) {
      this.model.eventBus.publish('risk_alert', {
        ...alert,
        step: this.model.currentStep,
        manager: this.uniqueId,
      });
    }
  }

  private rebalancePortfolio(): void {
    if (!this.model.dao) return;

    const totalValue = this.tokens + this.stakedTokens;
    if (totalValue <= 0) return;

    const currentStakeRatio = this.stakedTokens / totalValue;
    const deviation = Math.abs(currentStakeRatio - this.targetStakeRatio);

    if (deviation < REBALANCE_THRESHOLD) return;

    if (currentStakeRatio < this.targetStakeRatio) {
      const targetStaked = totalValue * this.targetStakeRatio;
      const toStake = Math.min(this.tokens * 0.5, targetStaked - this.stakedTokens);
      if (toStake > 1) {
        this.stakeTokens(toStake);
        this.rebalanceCount++;
      }
    } else {
      const targetStaked = totalValue * this.targetStakeRatio;
      const toUnstake = Math.min(this.stakedTokens * 0.5, this.stakedTokens - targetStaked);
      if (toUnstake > 1) {
        this.unstakeTokens(toUnstake);
        this.rebalanceCount++;
      }
    }

    this.markActive();
  }

  override decideVote(topic: Proposal | string): 'yes' | 'no' {
    if (typeof topic === 'object' && topic !== null && 'fundingGoal' in topic) {
      const proposal = topic as Proposal;
      const riskScore = Math.min(1, proposal.fundingGoal / 5000);
      return riskScore <= this.riskTolerance ? 'yes' : 'no';
    }
    return super.decideVote(topic);
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
    rebalanceCount: number;
    alertCount: number;
    alertAccuracy: number;
  } {
    const correctAlerts = this.alertHistory.filter(a => a.correct).length;
    const alertAccuracy = this.alertHistory.length > 0 ? correctAlerts / this.alertHistory.length : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      rebalanceCount: this.rebalanceCount,
      alertCount: this.alerts.length,
      alertAccuracy,
    };
  }
}
