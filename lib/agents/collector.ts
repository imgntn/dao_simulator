// Collector Agent - buys affordable NFTs from the marketplace
// Upgraded with Q-learning to learn optimal purchasing strategies
// Port from agents/collector.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Collection configuration
const MAX_PURCHASE_FRACTION = 0.3;  // Max 30% of tokens on single purchase
const PURCHASE_PROBABILITY = 0.7;  // 70% chance to try buying each step

type CollectorAction = 'buy_premium' | 'buy_bargain' | 'buy_preferred' | 'wait_deals' | 'hold';

export class Collector extends DAOMember {
  static readonly ACTIONS: readonly CollectorAction[] = [
    'buy_premium', 'buy_bargain', 'buy_preferred', 'wait_deals', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  collection: Set<string> = new Set();  // NFT IDs owned
  totalSpent: number = 0;
  preferredStyle: string | null = null;

  // Learning tracking
  lastAction: CollectorAction | null = null;
  lastState: string | null = null;
  lastTokens: number;
  purchaseHistory: Array<{ price: number; style: string | null }> = [];

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
    // Collectors may have a preferred style
    const styles = ['abstract', 'portrait', 'landscape', 'digital', 'generative', null];
    this.preferredStyle = randomChoice(styles);

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
   * Get state representation for purchasing decisions
   */
  private getPurchasingState(): string {
    if (!this.model.dao?.marketplace) return 'none|adequate|small';

    // Market availability state
    const listings = this.model.dao.marketplace.getListedNFTs();
    const marketState = listings.length === 0 ? 'none' :
                        listings.length < 5 ? 'scarce' :
                        listings.length < 15 ? 'normal' : 'abundant';

    // Budget state
    const budgetRatio = this.tokens / Math.max(100, this.lastTokens);
    const budgetState = budgetRatio < 0.3 ? 'low' :
                        budgetRatio < 0.6 ? 'moderate' :
                        budgetRatio < 0.9 ? 'adequate' : 'flush';

    // Collection state
    const collectionState = this.collection.size < 3 ? 'small' :
                            this.collection.size < 10 ? 'growing' :
                            this.collection.size < 20 ? 'large' : 'extensive';

    return StateDiscretizer.combineState(marketState, budgetState, collectionState);
  }

  /**
   * Choose purchasing action using Q-learning
   */
  private choosePurchasingAction(): CollectorAction {
    const state = this.getPurchasingState();

    if (!settings.learning_enabled) {
      return this.heuristicPurchasingAction();
    }

    return this.learning.selectAction(
      state,
      [...Collector.ACTIONS]
    ) as CollectorAction;
  }

  /**
   * Heuristic-based purchasing action (fallback)
   */
  private heuristicPurchasingAction(): CollectorAction {
    if (!this.model.dao?.marketplace) return 'hold';

    const listings = this.model.dao.marketplace.getListedNFTs();
    if (listings.length === 0) return 'wait_deals';

    // If we have a preferred style and items available, buy preferred
    if (this.preferredStyle) {
      const preferred = listings.filter((nft) =>
        (nft.metadata as { style?: string })?.style === this.preferredStyle
      );
      if (preferred.length > 0) {
        return 'buy_preferred';
      }
    }

    // Low budget -> look for bargains
    if (this.tokens < 50) {
      return 'buy_bargain';
    }

    // Abundant budget -> can buy premium
    if (this.tokens > 200) {
      return 'buy_premium';
    }

    return 'buy_bargain';
  }

  /**
   * Execute purchasing action and return reward
   */
  private executePurchasingAction(action: CollectorAction): number {
    if (!this.model.dao?.marketplace) return 0;

    let reward = 0;
    const listings = this.model.dao.marketplace.getListedNFTs();

    switch (action) {
      case 'buy_premium': {
        // Buy highest-priced affordable NFT
        const maxPrice = this.tokens * MAX_PURCHASE_FRACTION;
        const affordable = listings.filter(nft => nft.price <= maxPrice && nft.price <= this.tokens);
        if (affordable.length > 0) {
          const sorted = affordable.sort((a, b) => b.price - a.price);
          const nft = sorted[0];
          const bought = this.model.dao!.marketplace!.buyNFT(this, nft.id);
          if (bought) {
            this.collection.add(String(nft.id));
            this.totalSpent += nft.price;
            this.purchaseHistory.push({ price: nft.price, style: (nft.metadata as any)?.style });
            reward = 0.5;
            this.markActive();
          }
        }
        break;
      }
      case 'buy_bargain': {
        // Buy lowest-priced NFT
        const maxPrice = this.tokens * MAX_PURCHASE_FRACTION;
        const affordable = listings.filter(nft => nft.price <= maxPrice && nft.price <= this.tokens);
        if (affordable.length > 0) {
          const sorted = affordable.sort((a, b) => a.price - b.price);
          const nft = sorted[0];
          const bought = this.model.dao!.marketplace!.buyNFT(this, nft.id);
          if (bought) {
            this.collection.add(String(nft.id));
            this.totalSpent += nft.price;
            this.purchaseHistory.push({ price: nft.price, style: (nft.metadata as any)?.style });
            reward = 0.3;
            this.markActive();
          }
        }
        break;
      }
      case 'buy_preferred': {
        // Buy preferred style NFT
        const maxPrice = this.tokens * MAX_PURCHASE_FRACTION;
        const preferred = listings.filter(nft =>
          nft.price <= maxPrice &&
          nft.price <= this.tokens &&
          (nft.metadata as { style?: string })?.style === this.preferredStyle
        );
        if (preferred.length > 0) {
          const nft = randomChoice(preferred);
          const bought = this.model.dao!.marketplace!.buyNFT(this, nft.id);
          if (bought) {
            this.collection.add(String(nft.id));
            this.totalSpent += nft.price;
            this.purchaseHistory.push({ price: nft.price, style: this.preferredStyle });
            reward = 0.6; // Higher reward for collecting preferred style
            this.markActive();
          }
        }
        break;
      }
      case 'wait_deals':
        reward = 0.1; // Small reward for patience
        break;
      case 'hold':
        return 0;
    }

    return reward;
  }

  /**
   * Update Q-values based on collection performance
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from collection growth and token efficiency
    const collectionGrowth = this.collection.size > 0 ? 0.2 : 0;
    const tokenEfficiency = this.tokens / Math.max(1, this.lastTokens);

    let reward = collectionGrowth + (tokenEfficiency > 0.5 ? 0.5 : -0.5);
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getPurchasingState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Collector.ACTIONS]
    );

    // Limit purchase history
    if (this.purchaseHistory.length > 50) {
      this.purchaseHistory.splice(0, this.purchaseHistory.length - 50);
    }
  }

  step(): void {
    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastTokens = this.tokens;
    this.lastState = this.getPurchasingState();

    // Try to buy an affordable NFT
    if (this.model.dao?.marketplace && random() < PURCHASE_PROBABILITY) {
      const action = this.choosePurchasingAction();
      this.executePurchasingAction(action);
      this.lastAction = action;
    }

    // Participate in governance
    this.voteOnRandomProposal();

    // Occasionally leave comments
    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  private tryBuyNFT(): void {
    if (!this.model.dao?.marketplace) return;

    const listings = this.model.dao.marketplace.getListedNFTs();

    // Filter to affordable NFTs (within budget constraint)
    const maxPrice = this.tokens * MAX_PURCHASE_FRACTION;
    const affordable = listings.filter((nft) =>
      nft.price <= maxPrice && nft.price <= this.tokens
    );

    if (affordable.length === 0) return;

    // Prefer NFTs matching preferred style if we have one
    let candidates = affordable;
    if (this.preferredStyle) {
      const preferred = affordable.filter((nft) =>
        (nft.metadata as { style?: string })?.style === this.preferredStyle
      );
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    const nft = randomChoice(candidates);
    const bought = this.model.dao.marketplace.buyNFT(this, nft.id);

    if (bought) {
      this.collection.add(String(nft.id));
      this.totalSpent += nft.price;

      // Emit event
      if (this.model.eventBus) {
        this.model.eventBus.publish('nft_purchased', {
          step: this.model.currentStep,
          collector: this.uniqueId,
          nftId: nft.id,
          price: nft.price,
          collectionSize: this.collection.size,
        });
      }

      this.markActive();
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
    collectionSize: number;
    totalSpent: number;
    avgPurchasePrice: number;
  } {
    const avgPrice = this.purchaseHistory.length > 0
      ? this.purchaseHistory.reduce((sum, p) => sum + p.price, 0) / this.purchaseHistory.length
      : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      collectionSize: this.collection.size,
      totalSpent: this.totalSpent,
      avgPurchasePrice: avgPrice,
    };
  }
}
