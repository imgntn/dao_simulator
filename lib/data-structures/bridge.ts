// Bridge - enables token and NFT transfers between DAOs
// Port from data_structures/bridge.py

import type { DAO } from './dao';
import type { NFT } from './nft';

interface PendingTransfer {
  arrivalStep: number;
  token: string;
  amount: number;
}

interface PendingNFTTransfer {
  arrivalStep: number;
  nft: NFT;
}

export class Bridge {
  srcDao: DAO;
  dstDao: DAO;
  srcMarketplace: any;
  dstMarketplace: any;
  feeRate: number;
  delay: number;
  private pending: PendingTransfer[] = [];
  private pendingNfts: PendingNFTTransfer[] = [];

  constructor(
    srcDao: DAO,
    dstDao: DAO,
    feeRate: number = 0.0,
    delay: number = 0,
    srcMarketplace?: any,
    dstMarketplace?: any
  ) {
    this.srcDao = srcDao;
    this.dstDao = dstDao;
    this.srcMarketplace = srcMarketplace;
    this.dstMarketplace = dstMarketplace;
    this.feeRate = feeRate;
    this.delay = Math.max(0, Math.floor(delay));
  }

  /**
   * Request a token transfer from source DAO to destination DAO
   */
  requestTransfer(token: string, amount: number, step: number): void {
    const withdrawn = this.srcDao.treasury.withdraw(token, amount, step);
    const transferred = withdrawn * (1 - this.feeRate);

    // Add fee to source DAO revenue
    if (this.feeRate > 0 && withdrawn > 0) {
      const fee = withdrawn - transferred;
      this.srcDao.treasury.addRevenue(fee);
    }

    const fee = withdrawn - transferred;
    const arrivalStep = step + this.delay;

    this.pending.push({
      arrivalStep,
      token,
      amount: transferred,
    });

    // Emit event
    if (this.srcDao.eventBus) {
      this.srcDao.eventBus.publish('bridge_transfer_requested', {
        step,
        target: this.dstDao.name,
        token,
        amount: transferred,
        fee,
        arrivalStep,
      });
    }
  }

  /**
   * Request an NFT transfer from source marketplace to destination marketplace
   */
  requestNftTransfer(nftId: number, step: number): void {
    if (!this.srcMarketplace || !this.dstMarketplace) {
      return;
    }

    // Find and remove NFT from source marketplace
    const nftIndex = this.srcMarketplace.nfts.findIndex(
      (n: NFT) => n.id === nftId
    );

    if (nftIndex === -1) {
      return;
    }

    const nft = this.srcMarketplace.nfts.splice(nftIndex, 1)[0];
    const arrivalStep = step + this.delay;

    this.pendingNfts.push({
      arrivalStep,
      nft,
    });

    // Emit event
    if (this.srcDao.eventBus) {
      this.srcDao.eventBus.publish('nft_bridge_requested', {
        step,
        target: this.dstDao.name,
        nftId: nft.id,
        arrivalStep,
      });
    }
  }

  /**
   * Process pending transfers that have arrived at their destination
   */
  processPendingTransfers(step: number): void {
    // Process token transfers
    const remainingTransfers: PendingTransfer[] = [];

    for (const transfer of this.pending) {
      if (step >= transfer.arrivalStep) {
        // Transfer has arrived
        this.dstDao.treasury.deposit(
          transfer.token,
          transfer.amount,
          step
        );

        // Emit event
        if (this.dstDao.eventBus) {
          this.dstDao.eventBus.publish('bridge_transfer_completed', {
            step,
            source: this.srcDao.name,
            token: transfer.token,
            amount: transfer.amount,
          });
        }
      } else {
        // Still pending
        remainingTransfers.push(transfer);
      }
    }

    this.pending = remainingTransfers;

    // Process NFT transfers
    const remainingNfts: PendingNFTTransfer[] = [];

    for (const transfer of this.pendingNfts) {
      if (step >= transfer.arrivalStep) {
        // NFT has arrived
        if (this.dstMarketplace) {
          this.dstMarketplace.nfts.push(transfer.nft);
        }

        // Emit event
        if (this.dstDao.eventBus) {
          this.dstDao.eventBus.publish('nft_bridge_completed', {
            step,
            source: this.srcDao.name,
            nftId: transfer.nft.id,
          });
        }
      } else {
        // Still pending
        remainingNfts.push(transfer);
      }
    }

    this.pendingNfts = remainingNfts;
  }

  /**
   * Get pending transfer count
   */
  getPendingCount(): number {
    return this.pending.length + this.pendingNfts.length;
  }

  /**
   * Get all pending transfers (for debugging/visualization)
   */
  getPendingTransfers(): {
    tokens: PendingTransfer[];
    nfts: PendingNFTTransfer[];
  } {
    return {
      tokens: [...this.pending],
      nfts: [...this.pendingNfts],
    };
  }
}
