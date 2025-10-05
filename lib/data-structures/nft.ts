// NFT and NFT Marketplace

import type { EventBus } from '../utils/event-bus';
import type { DAOMember } from '../agents/base';

export class NFT {
  id: number;
  creator: string; // Creator's unique ID
  owner: string; // Owner's unique ID
  metadata: any;
  price: number;
  listed: boolean;

  constructor(
    id: number,
    creator: string,
    owner: string,
    metadata: any,
    price: number = 0,
    listed: boolean = false
  ) {
    this.id = id;
    this.creator = creator;
    this.owner = owner;
    this.metadata = metadata;
    this.price = price;
    this.listed = listed;
  }
}

export class NFTMarketplace {
  eventBus: EventBus | null;
  nfts: NFT[] = [];
  private nextId: number = 0;

  constructor(eventBus: EventBus | null = null) {
    this.eventBus = eventBus;
  }

  mintNFT(creator: DAOMember, metadata: any, price: number = 0, listed: boolean = true): NFT {
    const nft = new NFT(this.nextId, creator.uniqueId, creator.uniqueId, metadata, price, listed);
    this.nfts.push(nft);
    this.nextId++;

    const step = creator.model?.currentStep || 0;

    if (this.eventBus) {
      this.eventBus.publish('nft_minted', {
        step,
        nftId: nft.id,
        creator: creator.uniqueId,
        price,
      });
    }

    if (listed) {
      this.listNFT(nft.id, price, step);
    }

    return nft;
  }

  listNFT(nftId: number, price?: number, step: number = 0): boolean {
    const nft = this.getNFT(nftId);
    if (!nft) return false;

    if (price !== undefined) {
      nft.price = price;
    }
    nft.listed = true;

    if (this.eventBus) {
      this.eventBus.publish('nft_listed', {
        step,
        nftId: nft.id,
        price: nft.price,
        owner: nft.owner,
      });
    }

    return true;
  }

  buyNFT(buyer: DAOMember, nftId: number): boolean {
    const nft = this.getNFT(nftId);
    if (!nft || !nft.listed || buyer.tokens < nft.price) {
      return false;
    }

    // Find seller (owner) - we need to get the actual member object
    // This assumes we have access to the model with members
    const seller = buyer.model?.dao?.members.find(m => m.uniqueId === nft.owner);
    if (!seller) return false;

    // Transfer tokens
    buyer.tokens -= nft.price;
    seller.tokens += nft.price;

    // Transfer ownership
    nft.owner = buyer.uniqueId;
    nft.listed = false;

    const step = buyer.model?.currentStep || 0;

    if (this.eventBus) {
      this.eventBus.publish('nft_sold', {
        step,
        nftId: nft.id,
        seller: seller.uniqueId,
        buyer: buyer.uniqueId,
        price: nft.price,
      });
    }

    return true;
  }

  transferNFT(nftId: number, newOwner: DAOMember): boolean {
    const nft = this.getNFT(nftId);
    if (!nft) return false;

    const oldOwner = nft.owner;
    nft.owner = newOwner.uniqueId;
    nft.listed = false;

    const step = newOwner.model?.currentStep || 0;

    if (this.eventBus) {
      this.eventBus.publish('nft_transferred', {
        step,
        nftId: nft.id,
        oldOwner,
        newOwner: newOwner.uniqueId,
      });
    }

    return true;
  }

  getListedNFTs(): NFT[] {
    return this.nfts.filter(n => n.listed);
  }

  getNFT(nftId: number): NFT | null {
    return this.nfts.find(n => n.id === nftId) || null;
  }
}
