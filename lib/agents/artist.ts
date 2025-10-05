// Artist Agent - mints and lists NFTs for sale
// Port from agents/artist.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';

export class Artist extends DAOMember {
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
    if (!this.model.dao.marketplace) return;

    // Mint an NFT with metadata
    const metadata = {
      name: `NFT_${this.model.currentStep}_${this.uniqueId}`,
      creator: this.uniqueId,
      createdAt: this.model.currentStep,
    };

    const price = Math.random() * 10 + 1; // Random price between 1 and 11

    // Mint NFT (not listed initially)
    const nft = this.model.dao.marketplace.mintNFT(
      this,
      metadata,
      price,
      false
    );

    // List the NFT for sale
    this.model.dao.marketplace.listNFT(nft.id, price, this.model.currentStep);

    // Participate in governance
    this.voteOnRandomProposal();

    // Occasionally leave comments
    if (Math.random() < (this.model.dao.commentProbability || 0.1)) {
      this.leaveCommentOnRandomProposal();
    }
  }
}
