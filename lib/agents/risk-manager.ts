// Risk Manager Agent - Monitors portfolio concentration and manages risk
// New agent type for portfolio risk management

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomBool } from '../utils/random';

// Risk thresholds
const MAX_STAKE_RATIO = 0.7;  // Max 70% of tokens staked
const REBALANCE_THRESHOLD = 0.1;  // Rebalance if off target by 10%
const RISK_ASSESSMENT_PROBABILITY = 0.8;  // 80% chance to assess risk each step

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
  targetStakeRatio: number;
  riskTolerance: number;  // 0-1, higher = more risk tolerant
  alerts: RiskAlert[] = [];
  portfolioHistory: PortfolioState[] = [];
  rebalanceCount: number = 0;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 60,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Random target stake ratio and risk tolerance
    this.targetStakeRatio = 0.2 + random() * 0.4;  // 20-60%
    this.riskTolerance = random();
  }

  step(): void {
    if (!this.model.dao) return;

    // Assess portfolio risk
    if (randomBool(RISK_ASSESSMENT_PROBABILITY)) {
      this.assessRisk();
    }

    // Rebalance if needed
    this.rebalancePortfolio();

    // Participate in governance (vote conservatively)
    this.voteConservatively();

    // Leave comments about risk-related proposals
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

    // Calculate concentration risk (simplified - could use multiple assets)
    const concentrationRisk = this.calculateConcentrationRisk();

    // Calculate volatility exposure based on price history
    const volatilityExposure = this.calculateVolatilityExposure();

    const state: PortfolioState = {
      totalValue,
      stakedRatio,
      liquidRatio,
      concentrationRisk,
      volatilityExposure,
    };

    this.portfolioHistory.push(state);

    // Keep only last 100 states
    if (this.portfolioHistory.length > 100) {
      this.portfolioHistory.shift();
    }

    // Check for risk alerts
    this.checkRiskAlerts(state);

    // Emit risk assessment event
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

  /**
   * Calculate concentration risk
   */
  private calculateConcentrationRisk(): number {
    // In a single-token system, concentration is inherently 1.0
    // In multi-asset system, would calculate Herfindahl index
    return 1.0;
  }

  /**
   * Calculate volatility exposure based on recent price changes
   */
  private calculateVolatilityExposure(): number {
    if (!this.model.dao || this.portfolioHistory.length < 2) return 0.5;

    // Calculate price volatility from recent history
    const recentStates = this.portfolioHistory.slice(-10);
    if (recentStates.length < 2) return 0.5;

    const values = recentStates.map(s => s.totalValue);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 range
    return Math.min(1, stdDev / mean);
  }

  /**
   * Check for and create risk alerts
   */
  private checkRiskAlerts(state: PortfolioState): void {
    // Check stake ratio
    if (state.stakedRatio > MAX_STAKE_RATIO) {
      this.createAlert('stake', 'high', `Stake ratio ${(state.stakedRatio * 100).toFixed(1)}% exceeds limit`);
    } else if (state.stakedRatio > MAX_STAKE_RATIO * 0.8) {
      this.createAlert('stake', 'medium', `Stake ratio ${(state.stakedRatio * 100).toFixed(1)}% approaching limit`);
    }

    // Check liquidity
    if (state.liquidRatio < 0.2) {
      this.createAlert('liquidity', 'high', `Low liquidity: only ${(state.liquidRatio * 100).toFixed(1)}% liquid`);
    }

    // Check volatility
    if (state.volatilityExposure > 0.7) {
      this.createAlert('volatility', 'high', `High volatility exposure: ${(state.volatilityExposure * 100).toFixed(1)}%`);
    } else if (state.volatilityExposure > 0.5) {
      this.createAlert('volatility', 'medium', `Elevated volatility: ${(state.volatilityExposure * 100).toFixed(1)}%`);
    }
  }

  /**
   * Create a risk alert
   */
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

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Emit alert event
    if (this.model.eventBus) {
      this.model.eventBus.publish('risk_alert', {
        ...alert,
        step: this.model.currentStep,
        manager: this.uniqueId,
      });
    }
  }

  /**
   * Rebalance portfolio to target allocations
   */
  private rebalancePortfolio(): void {
    if (!this.model.dao) return;

    const totalValue = this.tokens + this.stakedTokens;
    if (totalValue <= 0) return;

    const currentStakeRatio = this.stakedTokens / totalValue;
    const deviation = Math.abs(currentStakeRatio - this.targetStakeRatio);

    // Only rebalance if deviation exceeds threshold
    if (deviation < REBALANCE_THRESHOLD) return;

    if (currentStakeRatio < this.targetStakeRatio) {
      // Need to stake more
      const targetStaked = totalValue * this.targetStakeRatio;
      const toStake = Math.min(this.tokens * 0.5, targetStaked - this.stakedTokens);
      if (toStake > 1) {
        this.stakeTokens(toStake);
        this.rebalanceCount++;
      }
    } else {
      // Need to unstake
      const targetStaked = totalValue * this.targetStakeRatio;
      const toUnstake = Math.min(this.stakedTokens * 0.5, this.stakedTokens - targetStaked);
      if (toUnstake > 1) {
        this.unstakeTokens(toUnstake);
        this.rebalanceCount++;
      }
    }

    this.markActive();
  }

  /**
   * Vote conservatively - prefer low-risk proposals
   */
  private voteConservatively(): void {
    if (!this.model.dao) return;

    // Respect votingActivity parameter
    const votingActivity = this.model.dao.votingActivity ?? 0.3;
    if (random() >= votingActivity) {
      return;  // Risk manager decides not to vote this step
    }

    const openProposals = this.model.dao.proposals.filter(p =>
      p.status === 'open' && !this.votes.has(p.uniqueId)
    );

    if (openProposals.length === 0) return;

    // Prefer proposals with lower funding goals (less risky)
    openProposals.sort((a, b) => a.fundingGoal - b.fundingGoal);

    const proposal = openProposals[0];

    // Vote yes on low-risk, no on high-risk (based on funding goal)
    const riskScore = Math.min(1, proposal.fundingGoal / 5000);
    const voteYes = riskScore <= this.riskTolerance;

    proposal.addVote(this.uniqueId, voteYes, this.tokens);
    this.votes.set(proposal.uniqueId, { vote: voteYes, weight: this.tokens });
    this.markActive();
  }
}
