// Artist Agent - mints and lists NFTs for sale
// Port from agents/artist.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import { random, randomBool } from '../utils/random';

// Art creation configuration
const MIN_NFT_PRICE = 1;
const MAX_NFT_PRICE = 50;
const MINT_PROBABILITY = 0.5;  // 50% chance to mint per step

export class Artist extends DAOMember {
  artStyle: string;
  mintedCount: number = 0;
  soldCount: number = 0;
  totalEarnings: number = 0;

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
  }

  step(): void {
    if (!this.model.dao?.marketplace) return;

    // Only mint with certain probability (not every step)
    if (randomBool(MINT_PROBABILITY)) {
      this.mintAndListNFT();
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
  }
}
