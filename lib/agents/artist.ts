// Artist Agent - mints and lists NFTs for sale
// Upgraded with Q-learning to learn optimal pricing and minting strategies
// Port from agents/artist.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomBool } from '../utils/random';
import { LearningMixin, LearningConfig, LearningState } from './learning';
import { StateDiscretizer } from './learning';
import { settings } from '../config/settings';

// Art creation configuration
const MIN_NFT_PRICE = 1;
const MAX_NFT_PRICE = 50;
const MINT_PROBABILITY = 0.5;  // 50% chance to mint per step

type ArtistAction = 'mint_premium' | 'mint_standard' | 'mint_budget' | 'wait_demand' | 'hold';

export class Artist extends DAOMember {
  static readonly ACTIONS: readonly ArtistAction[] = [
    'mint_premium', 'mint_standard', 'mint_budget', 'wait_demand', 'hold'
  ];

  // Learning infrastructure
  learning: LearningMixin;

  artStyle: string;
  mintedCount: number = 0;
  soldCount: number = 0;
  totalEarnings: number = 0;

  // Learning tracking
  lastAction: ArtistAction | null = null;
  lastState: string | null = null;
  lastMintedCount: number = 0;
  lastSoldCount: number = 0;
  priceHistory: Array<{ price: number; sold: boolean }> = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Assign random art style
    const styles = ['abstract', 'portrait', 'landscape', 'digital', 'generative'];
    this.artStyle = styles[Math.floor(random() * styles.length)];

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
   * Get state representation for minting decisions
   */
  private getMintingState(): string {
    if (!this.model.dao?.marketplace) return 'low|poor|low';

    // Market activity state
    const listings = this.model.dao.marketplace.getListedNFTs();
    const marketState = listings.length < 5 ? 'quiet' :
                        listings.length < 15 ? 'normal' :
                        listings.length < 30 ? 'busy' : 'saturated';

    // Sales performance state
    const saleRate = this.mintedCount > 0 ? this.soldCount / this.mintedCount : 0;
    const performanceState = saleRate < 0.2 ? 'poor' :
                             saleRate < 0.5 ? 'moderate' :
                             saleRate < 0.8 ? 'good' : 'excellent';

    // Reputation state
    const repState = this.reputation < 30 ? 'low' :
                     this.reputation < 60 ? 'moderate' :
                     this.reputation < 90 ? 'high' : 'elite';

    return StateDiscretizer.combineState(marketState, performanceState, repState);
  }

  /**
   * Choose minting action using Q-learning
   */
  private chooseMintingAction(): ArtistAction {
    const state = this.getMintingState();

    if (!settings.learning_enabled) {
      return this.heuristicMintingAction();
    }

    return this.learning.selectAction(
      state,
      [...Artist.ACTIONS]
    ) as ArtistAction;
  }

  /**
   * Heuristic-based minting action (fallback)
   */
  private heuristicMintingAction(): ArtistAction {
    if (!this.model.dao?.marketplace) return 'hold';

    const saleRate = this.mintedCount > 0 ? this.soldCount / this.mintedCount : 0.5;

    // High sales rate -> try premium pricing
    if (saleRate > 0.7 && this.reputation > 50) {
      return 'mint_premium';
    }

    // Low sales rate -> try budget pricing
    if (saleRate < 0.3) {
      return 'mint_budget';
    }

    // Check market saturation
    const listings = this.model.dao.marketplace.getListedNFTs();
    if (listings.length > 20) {
      return 'wait_demand';
    }

    return 'mint_standard';
  }

  /**
   * Execute minting action and return reward
   */
  private executeMintingAction(action: ArtistAction): number {
    if (!this.model.dao?.marketplace) return 0;

    let reward = 0;
    let priceMultiplier = 1.0;

    switch (action) {
      case 'mint_premium':
        priceMultiplier = 1.8;
        break;
      case 'mint_standard':
        priceMultiplier = 1.0;
        break;
      case 'mint_budget':
        priceMultiplier = 0.5;
        break;
      case 'wait_demand':
        return 0.1; // Small reward for patience
      case 'hold':
        return 0;
    }

    // Mint with adjusted pricing
    this.mintAndListNFTWithPrice(priceMultiplier);
    reward = 0.2;

    return reward;
  }

  /**
   * Mint NFT with a price multiplier
   */
  private mintAndListNFTWithPrice(priceMultiplier: number): void {
    if (!this.model.dao?.marketplace) return;

    // Mint an NFT with metadata
    const metadata = {
      name: `NFT_${this.model.currentStep}_${this.uniqueId}`,
      creator: this.uniqueId,
      createdAt: this.model.currentStep,
      style: this.artStyle,
      edition: this.mintedCount + 1,
    };

    // Price based on reputation, randomness, and learning-based multiplier
    const reputationMultiplier = Math.max(0.5, Math.min(2, this.reputation / 50));
    const basePrice = MIN_NFT_PRICE + random() * (MAX_NFT_PRICE - MIN_NFT_PRICE);
    const price = basePrice * reputationMultiplier * priceMultiplier;

    // Mint NFT (not listed initially)
    const nft = this.model.dao.marketplace.mintNFT(
      this,
      metadata,
      price,
      false
    );

    // List the NFT for sale
    this.model.dao.marketplace.listNFT(nft.id, price, this.model.currentStep);
    this.mintedCount++;

    // Track for learning
    this.priceHistory.push({ price, sold: false });

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('nft_minted', {
        step: this.model.currentStep,
        artist: this.uniqueId,
        nftId: nft.id,
        price,
        style: this.artStyle,
      });
    }

    this.markActive();
  }

  /**
   * Update Q-values based on sales outcomes
   */
  private updateLearning(): void {
    if (!settings.learning_enabled || !this.lastAction || !this.lastState) return;

    // Calculate reward from sales
    const newSales = this.soldCount - this.lastSoldCount;
    const earningsChange = this.totalEarnings - (this.lastMintedCount > 0
      ? this.priceHistory.slice(0, this.lastMintedCount).reduce((sum, p) => sum + (p.sold ? p.price : 0), 0)
      : 0);

    let reward = newSales * 2 + earningsChange * 0.1;
    reward = Math.max(-10, Math.min(10, reward));

    const currentState = this.getMintingState();

    this.learning.update(
      this.lastState,
      this.lastAction,
      reward,
      currentState,
      [...Artist.ACTIONS]
    );

    // Update tracking
    this.lastMintedCount = this.mintedCount;
    this.lastSoldCount = this.soldCount;

    // Limit price history
    if (this.priceHistory.length > 50) {
      this.priceHistory.splice(0, this.priceHistory.length - 50);
    }
  }

  step(): void {
    if (!this.model.dao?.marketplace) return;

    // Update learning from previous step
    this.updateLearning();

    // Track state before action
    this.lastState = this.getMintingState();

    // Choose and execute action
    if (randomBool(MINT_PROBABILITY)) {
      const action = this.chooseMintingAction();
      this.executeMintingAction(action);
      this.lastAction = action;
    }

    // Participate in governance
    this.voteOnRandomProposal();

    // Occasionally leave comments
    if (random() < (this.model.dao?.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }

  private mintAndListNFT(): void {
    if (!this.model.dao?.marketplace) return;

    // Mint an NFT with metadata
    const metadata = {
      name: `NFT_${this.model.currentStep}_${this.uniqueId}`,
      creator: this.uniqueId,
      createdAt: this.model.currentStep,
      style: this.artStyle,
      edition: this.mintedCount + 1,
    };

    // Price based on reputation and randomness
    const reputationMultiplier = Math.max(0.5, Math.min(2, this.reputation / 50));
    const basePrice = MIN_NFT_PRICE + random() * (MAX_NFT_PRICE - MIN_NFT_PRICE);
    const price = basePrice * reputationMultiplier;

    // Mint NFT (not listed initially)
    const nft = this.model.dao.marketplace.mintNFT(
      this,
      metadata,
      price,
      false
    );

    // List the NFT for sale
    this.model.dao.marketplace.listNFT(nft.id, price, this.model.currentStep);
    this.mintedCount++;

    // Emit event
    if (this.model.eventBus) {
      this.model.eventBus.publish('nft_minted', {
        step: this.model.currentStep,
        artist: this.uniqueId,
        nftId: nft.id,
        price,
        style: this.artStyle,
      });
    }

    this.markActive();
  }

  /**
   * Called when one of our NFTs is sold
   */
  receiveSale(amount: number): void {
    this.soldCount++;
    this.totalEarnings += amount;
    this.tokens += amount;

    // Mark latest unsold in history as sold
    for (let i = this.priceHistory.length - 1; i >= 0; i--) {
      if (!this.priceHistory[i].sold && Math.abs(this.priceHistory[i].price - amount) < 0.01) {
        this.priceHistory[i].sold = true;
        break;
      }
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
    mintedCount: number;
    soldCount: number;
    saleRate: number;
    totalEarnings: number;
  } {
    const saleRate = this.mintedCount > 0 ? this.soldCount / this.mintedCount : 0;

    return {
      qTableSize: this.learning.getQTableSize(),
      stateCount: this.learning.getStateCount(),
      episodeCount: this.learning.getEpisodeCount(),
      totalReward: this.learning.getTotalReward(),
      explorationRate: this.learning.getExplorationRate(),
      mintedCount: this.mintedCount,
      soldCount: this.soldCount,
      saleRate,
      totalEarnings: this.totalEarnings,
    };
  }
}
