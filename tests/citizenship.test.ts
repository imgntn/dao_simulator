/**
 * Citizenship Tests
 *
 * Tests for Optimism's citizenship badge system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CitizenshipController,
  createOptimismCitizenship,
} from '../lib/governance/citizenship';
import { EventBus } from '../lib/utils/event-bus';

describe('CitizenshipController', () => {
  let controller: CitizenshipController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new CitizenshipController({
      defaultDurationSteps: 1000,  // Expires after 1000 steps
      minAttestations: 0,
      allowSelfAttestation: false,
      maxCitizens: 100,
    });
    controller.setEventBus(eventBus);
  });

  describe('grantCitizenship', () => {
    it('should grant citizenship badge', () => {
      const badge = controller.grantCitizenship(
        'citizen_1',
        'contributor',
        'governance_proposal_1',
        ['Built key infrastructure'],
        1
      );

      expect(badge).toBeDefined();
      expect(badge?.citizenId).toBe('citizen_1');
      expect(badge?.citizenshipType).toBe('contributor');
      expect(badge?.status).toBe('active');
    });

    it('should reject duplicate citizenship', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      const duplicate = controller.grantCitizenship('citizen_1', 'builder', 'system', [], 2);

      expect(duplicate).toBeNull();
    });

    it('should respect max citizens limit', () => {
      // Create controller with low max
      const limitedController = new CitizenshipController({
        maxCitizens: 2,
      });

      limitedController.grantCitizenship('c1', 'contributor', 'system', [], 1);
      limitedController.grantCitizenship('c2', 'contributor', 'system', [], 2);
      const third = limitedController.grantCitizenship('c3', 'contributor', 'system', [], 3);

      expect(third).toBeNull();
    });

    it('should emit citizenship_granted event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('citizenship_granted', (data) => events.push(data));

      controller.grantCitizenship('citizen_1', 'builder', 'system', [], 1);

      expect(events.length).toBe(1);
    });

    it('should set expiration based on config', () => {
      const badge = controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 10);

      expect(badge?.expirationStep).toBe(1010);  // 10 + 1000
    });

    it('should allow permanent citizenship with controller configured for permanent', () => {
      // Create controller with null default duration for permanent badges
      const permanentController = new CitizenshipController({
        defaultDurationSteps: null,  // Permanent by default
        minAttestations: 0,
        allowSelfAttestation: false,
        maxCitizens: 100,
      });

      const badge = permanentController.grantCitizenship(
        'citizen_1',
        'contributor',
        'system',
        [],
        1
      );

      expect(badge?.expirationStep).toBeNull();
    });
  });

  describe('addAttestation', () => {
    it('should add attestation to citizen', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      const result = controller.addAttestation('citizen_1', 'attester_1', 5);

      expect(result).toBe(true);
    });

    it('should reject self-attestation when disabled', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      const result = controller.addAttestation('citizen_1', 'citizen_1', 5);

      expect(result).toBe(false);
    });

    it('should allow self-attestation when enabled', () => {
      const selfAttestController = new CitizenshipController({
        allowSelfAttestation: true,
      });
      selfAttestController.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);

      const result = selfAttestController.addAttestation('citizen_1', 'citizen_1', 5);

      expect(result).toBe(true);
    });

    it('should reject attestation for non-citizen', () => {
      const result = controller.addAttestation('unknown', 'attester_1', 5);
      expect(result).toBe(false);
    });
  });

  describe('suspendCitizenship', () => {
    it('should suspend active citizenship', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      const result = controller.suspendCitizenship('citizen_1', 'Violation of code of conduct', 10);

      expect(result).toBe(true);
      const badge = controller.getBadge('citizen_1');
      expect(badge?.status).toBe('suspended');
    });

    it('should emit citizenship_suspended event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('citizenship_suspended', (data) => events.push(data));

      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      controller.suspendCitizenship('citizen_1', 'Reason', 10);

      expect(events.length).toBe(1);
    });

    it('should reject suspension for non-citizen', () => {
      const result = controller.suspendCitizenship('unknown', 'Reason', 10);
      expect(result).toBe(false);
    });
  });

  describe('revokeCitizenship', () => {
    it('should revoke citizenship', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      const result = controller.revokeCitizenship('citizen_1', 'Permanent ban', 10);

      expect(result).toBe(true);
      const badge = controller.getBadge('citizen_1');
      expect(badge?.status).toBe('revoked');
    });
  });

  describe('reinstateCitizenship', () => {
    it('should reinstate suspended citizenship', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      controller.suspendCitizenship('citizen_1', 'Temporary', 10);
      const result = controller.reinstateCitizenship('citizen_1', 15);

      expect(result).toBe(true);
      const badge = controller.getBadge('citizen_1');
      expect(badge?.status).toBe('active');
    });

    it('should not reinstate revoked citizenship', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      controller.revokeCitizenship('citizen_1', 'Permanent', 10);
      const result = controller.reinstateCitizenship('citizen_1', 15);

      expect(result).toBe(false);
    });
  });

  describe('isActiveCitizen', () => {
    it('should return true for active citizen', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      expect(controller.isActiveCitizen('citizen_1')).toBe(true);
    });

    it('should return false for suspended citizen', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);
      controller.suspendCitizenship('citizen_1', 'Reason', 10);
      expect(controller.isActiveCitizen('citizen_1')).toBe(false);
    });

    it('should return false for non-citizen', () => {
      expect(controller.isActiveCitizen('unknown')).toBe(false);
    });
  });

  describe('processExpirations', () => {
    it('should expire badges past expiration step', () => {
      controller.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);

      // Process at step 1010 (after expiration at 1001)
      const expired = controller.processExpirations(1010);

      expect(expired.length).toBe(1);
      expect(controller.isActiveCitizen('citizen_1')).toBe(false);
    });

    it('should not expire permanent badges', () => {
      // Create controller with null default duration for permanent badges
      const permanentController = new CitizenshipController({
        defaultDurationSteps: null,  // Permanent by default
      });

      permanentController.grantCitizenship('citizen_1', 'contributor', 'system', [], 1);

      const expired = permanentController.processExpirations(10000);

      expect(expired.length).toBe(0);
      expect(permanentController.isActiveCitizen('citizen_1')).toBe(true);
    });
  });

  describe('getActiveCitizens', () => {
    it('should return only active citizens', () => {
      controller.grantCitizenship('c1', 'contributor', 'system', [], 1);
      controller.grantCitizenship('c2', 'builder', 'system', [], 2);
      controller.grantCitizenship('c3', 'governance', 'system', [], 3);
      controller.suspendCitizenship('c2', 'Reason', 10);

      const active = controller.getActiveCitizens();

      expect(active.length).toBe(2);
    });
  });

  describe('getCitizensByType', () => {
    it('should filter by citizenship type', () => {
      controller.grantCitizenship('c1', 'contributor', 'system', [], 1);
      controller.grantCitizenship('c2', 'builder', 'system', [], 2);
      controller.grantCitizenship('c3', 'contributor', 'system', [], 3);

      const contributors = controller.getCitizensByType('contributor');

      expect(contributors.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      controller.grantCitizenship('c1', 'contributor', 'system', [], 1);
      controller.grantCitizenship('c2', 'builder', 'system', [], 2);
      controller.suspendCitizenship('c2', 'Reason', 10);

      const stats = controller.getStats();

      expect(stats.totalBadges).toBe(2);
      expect(stats.activeCitizens).toBe(1);
      expect(stats.suspendedCitizens).toBe(1);
    });
  });
});

describe('createOptimismCitizenship', () => {
  it('should create controller with Optimism defaults', () => {
    const controller = createOptimismCitizenship();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(CitizenshipController);
  });
});
