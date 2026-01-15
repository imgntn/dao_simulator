/**
 * Token Locking Tests
 *
 * Tests for MakerDAO-style token locking governance system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TokenLockingController,
  createMakerTokenLocking,
} from '../lib/governance/token-locking';
import { EventBus } from '../lib/utils/event-bus';

describe('TokenLockingController', () => {
  let controller: TokenLockingController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new TokenLockingController({
      unlockCooldownSteps: 24,  // 1 day cooldown
      minLockAmount: 100,
      maxProxiesPerCold: 3,
    });
    controller.setEventBus(eventBus);
  });

  describe('lockTokens', () => {
    it('should lock tokens for a new position', () => {
      const result = controller.lockTokens('user_1', 1000, 1);

      expect(result).toBe(true);
      expect(controller.totalLocked).toBe(1000);
    });

    it('should add to existing position', () => {
      controller.lockTokens('user_1', 1000, 1);
      controller.lockTokens('user_1', 500, 2);

      expect(controller.totalLocked).toBe(1500);
      const position = controller.getPosition('user_1');
      expect(position?.amount).toBe(1500);
    });

    it('should reject amount below minimum', () => {
      const result = controller.lockTokens('user_1', 50, 1);

      expect(result).toBe(false);
      expect(controller.totalLocked).toBe(0);
    });

    it('should emit tokens_locked event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('tokens_locked', (data) => events.push(data));

      controller.lockTokens('user_1', 1000, 1);

      expect(events.length).toBe(1);
      expect((events[0] as { owner: string }).owner).toBe('user_1');
    });

    it('should cancel pending unlock when adding tokens', () => {
      controller.lockTokens('user_1', 1000, 1);
      controller.requestUnlock('user_1', 5);
      controller.lockTokens('user_1', 500, 10);

      const position = controller.getPosition('user_1');
      expect(position?.unlockRequestStep).toBeNull();
    });
  });

  describe('requestUnlock', () => {
    it('should request unlock for existing position', () => {
      controller.lockTokens('user_1', 1000, 1);
      const result = controller.requestUnlock('user_1', 5);

      expect(result).toBe(true);
      const position = controller.getPosition('user_1');
      expect(position?.unlockRequestStep).toBe(5);
    });

    it('should reject unlock for non-existent position', () => {
      const result = controller.requestUnlock('user_1', 5);
      expect(result).toBe(false);
    });

    it('should emit unlock_requested event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('unlock_requested', (data) => events.push(data));

      controller.lockTokens('user_1', 1000, 1);
      controller.requestUnlock('user_1', 5);

      expect(events.length).toBe(1);
    });
  });

  describe('withdrawTokens', () => {
    it('should withdraw after cooldown', () => {
      controller.lockTokens('user_1', 1000, 1);
      controller.requestUnlock('user_1', 5);

      // After cooldown (5 + 24 = 29)
      const result = controller.withdrawTokens('user_1', 500, 30);

      expect(result).toBe(true);
      expect(controller.totalLocked).toBe(500);
    });

    it('should reject withdrawal before cooldown', () => {
      controller.lockTokens('user_1', 1000, 1);
      controller.requestUnlock('user_1', 5);

      // Before cooldown (5 + 24 = 29)
      const result = controller.withdrawTokens('user_1', 500, 20);

      expect(result).toBe(false);
      expect(controller.totalLocked).toBe(1000);
    });

    it('should reject withdrawal without unlock request', () => {
      controller.lockTokens('user_1', 1000, 1);
      const result = controller.withdrawTokens('user_1', 500, 100);

      expect(result).toBe(false);
    });

    it('should reject withdrawal exceeding locked amount', () => {
      controller.lockTokens('user_1', 1000, 1);
      controller.requestUnlock('user_1', 5);

      const result = controller.withdrawTokens('user_1', 2000, 30);

      expect(result).toBe(false);
    });

    it('should delete position when fully withdrawn', () => {
      controller.lockTokens('user_1', 1000, 1);
      controller.requestUnlock('user_1', 5);
      controller.withdrawTokens('user_1', 1000, 30);

      const position = controller.getPosition('user_1');
      expect(position).toBeUndefined();
    });
  });

  describe('voting proxies', () => {
    it('should create voting proxy', () => {
      controller.lockTokens('cold_wallet', 1000, 1);
      const result = controller.createVotingProxy('cold_wallet', 'hot_wallet', 2);

      expect(result).toBe(true);
      const proxy = controller.getProxy('hot_wallet');
      expect(proxy?.coldWallet).toBe('cold_wallet');
      expect(proxy?.active).toBe(true);
    });

    it('should reject proxy for non-existent position', () => {
      const result = controller.createVotingProxy('cold_wallet', 'hot_wallet', 2);
      expect(result).toBe(false);
    });

    it('should respect max proxies per cold wallet', () => {
      controller.lockTokens('cold_wallet', 1000, 1);
      controller.createVotingProxy('cold_wallet', 'hot_1', 2);
      controller.createVotingProxy('cold_wallet', 'hot_2', 3);
      controller.createVotingProxy('cold_wallet', 'hot_3', 4);

      // Fourth proxy should fail (max is 3)
      const result = controller.createVotingProxy('cold_wallet', 'hot_4', 5);
      expect(result).toBe(false);
    });

    it('should revoke voting proxy', () => {
      controller.lockTokens('cold_wallet', 1000, 1);
      controller.createVotingProxy('cold_wallet', 'hot_wallet', 2);

      const result = controller.revokeVotingProxy('cold_wallet', 'hot_wallet', 5);

      expect(result).toBe(true);
      // After revocation, proxy is deleted from the map
      const proxy = controller.getProxy('hot_wallet');
      expect(proxy).toBeUndefined();
    });

    it('should get voting power through proxy', () => {
      controller.lockTokens('cold_wallet', 1000, 1);
      controller.createVotingProxy('cold_wallet', 'hot_wallet', 2);

      const power = controller.getVotingPower('hot_wallet');
      expect(power).toBe(1000);
    });
  });

  describe('getVotingPower', () => {
    it('should return locked amount for direct owner', () => {
      controller.lockTokens('user_1', 1000, 1);
      const power = controller.getVotingPower('user_1');
      expect(power).toBe(1000);
    });

    it('should return 0 for non-participant', () => {
      const power = controller.getVotingPower('unknown');
      expect(power).toBe(0);
    });
  });

  describe('canVote', () => {
    it('should allow voting with locked tokens', () => {
      controller.lockTokens('user_1', 1000, 1);
      expect(controller.canVote('user_1')).toBe(true);
    });

    it('should allow voting through active proxy', () => {
      controller.lockTokens('cold_wallet', 1000, 1);
      controller.createVotingProxy('cold_wallet', 'hot_wallet', 2);
      expect(controller.canVote('hot_wallet')).toBe(true);
    });

    it('should deny voting for non-participant', () => {
      expect(controller.canVote('unknown')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      controller.lockTokens('user_1', 1000, 1);
      controller.lockTokens('user_2', 2000, 2);
      controller.createVotingProxy('user_1', 'hot_1', 3);

      const stats = controller.getStats();

      expect(stats.totalLocked).toBe(3000);
      expect(stats.positionCount).toBe(2);
      expect(stats.proxyCount).toBe(1);
    });
  });
});

describe('createMakerTokenLocking', () => {
  it('should create controller with Maker defaults', () => {
    const controller = createMakerTokenLocking();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(TokenLockingController);

    // Maker has instant unlock (no cooldown)
    controller.lockTokens('user_1', 1000, 1);
    const result = controller.withdrawTokens('user_1', 500, 2);
    expect(result).toBe(true);
  });
});
