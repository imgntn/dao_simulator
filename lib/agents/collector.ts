// Collector Agent - buys affordable NFTs from the marketplace
// Port from agents/collector.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';

// Collection configuration
const MAX_PURCHASE_FRACTION = 0.3;  // Max 30% of tokens on single purchase
const PURCHASE_PROBABILITY = 0.7;  // 70% chance to try buying each step

export class Collector extends DAOMember {
  collection: Set<string> = new Set();  // NFT IDs owned
  totalSpent: number = 0;
  preferredStyle: string | null = null;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0',
    votingStrategy?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, votingStrategy);
    // Collectors may have a preferred style
    const styles = ['abstract', 'portrait', 'landscape', 'digital', 'generative', null];
    this.preferredStyle = randomChoice(styles);
  }

  step(): void {
    // Try to buy an affordable NFT
    if (this.model.dao?.marketplace && random() < PURCHASE_PROBABILITY) {
      this.tryBuyNFT();
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
      this.collection.add(nft.id);
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
}
