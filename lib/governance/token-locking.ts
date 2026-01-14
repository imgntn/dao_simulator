/**
 * Token Locking - MakerDAO-style Vote Locking
 *
 * Implements the token locking mechanism required for voting in Maker governance.
 * Tokens must be locked in the voting contract to participate.
 * Supports hot/cold wallet separation via voting proxies.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export interface LockedPosition {
  owner: string;
  amount: number;
  lockedStep: number;
  unlockRequestStep: number | null;
  unlockCooldownSteps: number;
  votingProxy: string | null;  // Hot wallet that can vote on behalf
}

export interface VotingProxy {
  coldWallet: string;    // Owner of locked tokens
  hotWallet: string;     // Wallet that can vote
  createdStep: number;
  active: boolean;
}

export interface TokenLockingConfig {
  unlockCooldownSteps: number;  // Default 0 (instant unlock for Maker)
  minLockAmount: number;        // Minimum tokens to lock
  maxProxiesPerCold: number;    // Max hot wallets per cold wallet
}

// =============================================================================
// TOKEN LOCKING CONTROLLER
// =============================================================================

export class TokenLockingController {
  private positions: Map<string, LockedPosition> = new Map();
  private proxies: Map<string, VotingProxy> = new Map();  // hotWallet -> proxy
  private coldToHot: Map<string, Set<string>> = new Map();  // coldWallet -> hotWallets
  private eventBus: EventBus | null = null;

  config: TokenLockingConfig;
  totalLocked: number = 0;

  constructor(config?: Partial<TokenLockingConfig>) {
    this.config = {
      unlockCooldownSteps: config?.unlockCooldownSteps ?? 0,
      minLockAmount: config?.minLockAmount ?? 0,
      maxProxiesPerCold: config?.maxProxiesPerCold ?? 5,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Lock tokens for voting
   */
  lockTokens(
    owner: string,
    amount: number,
    currentStep: number
  ): boolean {
    if (amount < this.config.minLockAmount) {
      return false;
    }

    const existing = this.positions.get(owner);

    if (existing) {
      // Add to existing position
      existing.amount += amount;
      existing.unlockRequestStep = null;  // Cancel pending unlock
    } else {
      // Create new position
      const position: LockedPosition = {
        owner,
        amount,
        lockedStep: currentStep,
        unlockRequestStep: null,
        unlockCooldownSteps: this.config.unlockCooldownSteps,
        votingProxy: null,
      };
      this.positions.set(owner, position);
    }

    this.totalLocked += amount;

    this.emit('tokens_locked', {
      step: currentStep,
      owner,
      amount,
      totalLocked: this.positions.get(owner)?.amount || 0,
    });

    return true;
  }

  /**
   * Request unlock (starts cooldown if configured)
   */
  requestUnlock(
    owner: string,
    currentStep: number
  ): boolean {
    const position = this.positions.get(owner);
    if (!position) return false;

    position.unlockRequestStep = currentStep;

    this.emit('unlock_requested', {
      step: currentStep,
      owner,
      amount: position.amount,
      unlockAvailableStep: currentStep + position.unlockCooldownSteps,
    });

    return true;
  }

  /**
   * Withdraw unlocked tokens
   */
  withdrawTokens(
    owner: string,
    amount: number,
    currentStep: number
  ): boolean {
    const position = this.positions.get(owner);
    if (!position) return false;

    // Check cooldown if configured
    if (this.config.unlockCooldownSteps > 0) {
      if (!position.unlockRequestStep) return false;
      if (currentStep < position.unlockRequestStep + position.unlockCooldownSteps) {
        return false;  // Cooldown not complete
      }
    }

    if (amount > position.amount) {
      return false;
    }

    position.amount -= amount;
    this.totalLocked -= amount;

    // Remove position if empty
    if (position.amount <= 0) {
      // Remove proxies
      const hotWallets = this.coldToHot.get(owner);
      if (hotWallets) {
        for (const hot of hotWallets) {
          this.proxies.delete(hot);
        }
        this.coldToHot.delete(owner);
      }
      this.positions.delete(owner);
    } else {
      position.unlockRequestStep = null;  // Reset unlock request
    }

    this.emit('tokens_withdrawn', {
      step: currentStep,
      owner,
      amount,
      remaining: position.amount,
    });

    return true;
  }

  /**
   * Create voting proxy (hot/cold wallet separation)
   */
  createVotingProxy(
    coldWallet: string,
    hotWallet: string,
    currentStep: number
  ): boolean {
    const position = this.positions.get(coldWallet);
    if (!position) return false;

    // Check max proxies limit
    const existing = this.coldToHot.get(coldWallet) || new Set();
    if (existing.size >= this.config.maxProxiesPerCold) {
      return false;
    }

    // Check if hot wallet already a proxy for someone else
    if (this.proxies.has(hotWallet)) {
      return false;
    }

    const proxy: VotingProxy = {
      coldWallet,
      hotWallet,
      createdStep: currentStep,
      active: true,
    };

    this.proxies.set(hotWallet, proxy);
    existing.add(hotWallet);
    this.coldToHot.set(coldWallet, existing);
    position.votingProxy = hotWallet;

    this.emit('voting_proxy_created', {
      step: currentStep,
      coldWallet,
      hotWallet,
    });

    return true;
  }

  /**
   * Revoke voting proxy
   */
  revokeVotingProxy(
    coldWallet: string,
    hotWallet: string,
    currentStep: number
  ): boolean {
    const proxy = this.proxies.get(hotWallet);
    if (!proxy || proxy.coldWallet !== coldWallet) {
      return false;
    }

    proxy.active = false;
    this.proxies.delete(hotWallet);

    const hotWallets = this.coldToHot.get(coldWallet);
    if (hotWallets) {
      hotWallets.delete(hotWallet);
    }

    const position = this.positions.get(coldWallet);
    if (position && position.votingProxy === hotWallet) {
      position.votingProxy = null;
    }

    this.emit('voting_proxy_revoked', {
      step: currentStep,
      coldWallet,
      hotWallet,
    });

    return true;
  }

  /**
   * Get voting power for a wallet (considers proxies)
   */
  getVotingPower(wallet: string): number {
    // Direct locked position
    const position = this.positions.get(wallet);
    if (position) {
      return position.amount;
    }

    // Check if wallet is a proxy
    const proxy = this.proxies.get(wallet);
    if (proxy && proxy.active) {
      const coldPosition = this.positions.get(proxy.coldWallet);
      return coldPosition?.amount || 0;
    }

    return 0;
  }

  /**
   * Check if wallet can vote (has locked tokens or is active proxy)
   */
  canVote(wallet: string): boolean {
    return this.getVotingPower(wallet) > 0;
  }

  /**
   * Get the owner of voting power (resolves proxy to cold wallet)
   */
  resolveOwner(wallet: string): string | null {
    // Direct position
    if (this.positions.has(wallet)) {
      return wallet;
    }

    // Proxy
    const proxy = this.proxies.get(wallet);
    if (proxy && proxy.active) {
      return proxy.coldWallet;
    }

    return null;
  }

  /**
   * Get locked position
   */
  getPosition(owner: string): LockedPosition | undefined {
    return this.positions.get(owner);
  }

  /**
   * Get all positions
   */
  getAllPositions(): LockedPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get proxy info
   */
  getProxy(hotWallet: string): VotingProxy | undefined {
    return this.proxies.get(hotWallet);
  }

  /**
   * Get all proxies for a cold wallet
   */
  getProxiesForCold(coldWallet: string): VotingProxy[] {
    const hotWallets = this.coldToHot.get(coldWallet);
    if (!hotWallets) return [];

    return Array.from(hotWallets)
      .map(hot => this.proxies.get(hot))
      .filter((p): p is VotingProxy => p !== undefined);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalLocked: number;
    positionCount: number;
    proxyCount: number;
    averageLocked: number;
  } {
    const positions = Array.from(this.positions.values());
    return {
      totalLocked: this.totalLocked,
      positionCount: positions.length,
      proxyCount: this.proxies.size,
      averageLocked: positions.length > 0
        ? this.totalLocked / positions.length
        : 0,
    };
  }

  /**
   * Emit event
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.publish(event, data as { step: number; [key: string]: unknown });
    }
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    return {
      config: this.config,
      totalLocked: this.totalLocked,
      positions: Array.from(this.positions.entries()),
      proxies: Array.from(this.proxies.entries()),
      coldToHot: Array.from(this.coldToHot.entries()).map(([cold, hots]) => [
        cold,
        Array.from(hots),
      ]),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): TokenLockingController {
    const controller = new TokenLockingController(data.config);
    controller.totalLocked = data.totalLocked || 0;

    if (data.positions) {
      for (const [owner, position] of data.positions) {
        controller.positions.set(owner, position);
      }
    }

    if (data.proxies) {
      for (const [hot, proxy] of data.proxies) {
        controller.proxies.set(hot, proxy);
      }
    }

    if (data.coldToHot) {
      for (const [cold, hots] of data.coldToHot) {
        controller.coldToHot.set(cold, new Set(hots));
      }
    }

    return controller;
  }
}

/**
 * Factory function to create token locking for MakerDAO
 */
export function createMakerTokenLocking(): TokenLockingController {
  return new TokenLockingController({
    unlockCooldownSteps: 0,  // Instant unlock in Maker
    minLockAmount: 0.01,     // Minimum MKR to lock
    maxProxiesPerCold: 5,    // Reasonable limit
  });
}
