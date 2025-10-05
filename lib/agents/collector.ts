// Collector Agent - buys affordable NFTs from the marketplace
// Port from agents/collector.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';

export class Collector extends DAOMember {
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

  step(): void {
    // Try to buy an affordable NFT
    if (this.model.dao.marketplace) {
      const listings = this.model.dao.marketplace.getListedNFTs();
      const affordable = listings.filter((nft) => nft.price <= this.tokens);

      if (affordable.length > 0) {
        const nft = affordable[Math.floor(Math.random() * affordable.length)];
        const bought = this.model.dao.marketplace.buyNFT(this, nft.id);

        if (bought) {
          this.markActive();
        }
      }
    }

    // Participate in governance
    this.voteOnRandomProposal();

    // Occasionally leave comments
    if (Math.random() < (this.model.dao.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
