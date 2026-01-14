/**
 * Citizenship - Optimism Badge Tracking System
 *
 * Manages non-transferable citizenship badges for Optimism's Citizens House.
 * Citizens are badge holders with specific governance rights.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type CitizenshipStatus =
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'expired';

export type CitizenshipType =
  | 'contributor'       // Past contributors to the ecosystem
  | 'builder'           // Builders on Optimism
  | 'governance'        // Active governance participants
  | 'retroactive';      // Awarded through RetroPGF

export interface CitizenshipBadge {
  id: string;
  citizenId: string;
  citizenshipType: CitizenshipType;

  // Timing
  grantedStep: number;
  expirationStep: number | null;  // Null = permanent

  // Status
  status: CitizenshipStatus;
  statusReason?: string;

  // Metadata
  grantedBy: string;  // 'system' or governance proposal ID
  contributions: string[];  // Description of contributions
  attestations: string[];   // Other citizens who attested
}

export interface CitizenshipConfig {
  defaultDurationSteps: number | null;  // Null = permanent
  minAttestations: number;              // Min attestations to grant
  allowSelfAttestation: boolean;
  maxCitizens: number;                  // 0 = unlimited
}

// =============================================================================
// CITIZENSHIP CONTROLLER
// =============================================================================

export class CitizenshipController {
  private badges: Map<string, CitizenshipBadge> = new Map();
  private citizenBadges: Map<string, string> = new Map();  // citizenId -> badgeId
  private badgeCounter: number = 0;
  private eventBus: EventBus | null = null;

  config: CitizenshipConfig;

  constructor(config?: Partial<CitizenshipConfig>) {
    this.config = {
      defaultDurationSteps: config?.defaultDurationSteps ?? null,
      minAttestations: config?.minAttestations ?? 0,
      allowSelfAttestation: config?.allowSelfAttestation ?? false,
      maxCitizens: config?.maxCitizens ?? 0,
    };
  }

  /**
   * Set event bus
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Grant citizenship badge
   */
  grantCitizenship(
    citizenId: string,
    citizenshipType: CitizenshipType,
    grantedBy: string,
    contributions: string[],
    currentStep: number,
    durationSteps?: number | null
  ): CitizenshipBadge | null {
    // Check if already a citizen
    if (this.citizenBadges.has(citizenId)) {
      return null;  // Already has badge
    }

    // Check max citizens limit
    if (this.config.maxCitizens > 0 &&
        this.getActiveCitizenCount() >= this.config.maxCitizens) {
      return null;
    }

    const badgeId = `citizenship_${++this.badgeCounter}`;
    const duration = durationSteps ?? this.config.defaultDurationSteps;

    const badge: CitizenshipBadge = {
      id: badgeId,
      citizenId,
      citizenshipType,
      grantedStep: currentStep,
      expirationStep: duration ? currentStep + duration : null,
      status: 'active',
      grantedBy,
      contributions,
      attestations: [],
    };

    this.badges.set(badgeId, badge);
    this.citizenBadges.set(citizenId, badgeId);

    this.emit('citizenship_granted', {
      step: currentStep,
      badgeId,
      citizenId,
      citizenshipType,
      grantedBy,
      expirationStep: badge.expirationStep,
    });

    return badge;
  }

  /**
   * Add attestation to a citizenship
   */
  addAttestation(
    citizenId: string,
    attesterId: string,
    currentStep: number
  ): boolean {
    const badgeId = this.citizenBadges.get(citizenId);
    if (!badgeId) return false;

    const badge = this.badges.get(badgeId);
    if (!badge || badge.status !== 'active') return false;

    // Check self-attestation
    if (!this.config.allowSelfAttestation && attesterId === citizenId) {
      return false;
    }

    // Check if attester is already attesting
    if (badge.attestations.includes(attesterId)) {
      return false;
    }

    badge.attestations.push(attesterId);

    this.emit('citizenship_attested', {
      step: currentStep,
      badgeId,
      citizenId,
      attesterId,
      totalAttestations: badge.attestations.length,
    });

    return true;
  }

  /**
   * Suspend citizenship
   */
  suspendCitizenship(
    citizenId: string,
    reason: string,
    currentStep: number
  ): boolean {
    const badgeId = this.citizenBadges.get(citizenId);
    if (!badgeId) return false;

    const badge = this.badges.get(badgeId);
    if (!badge || badge.status !== 'active') return false;

    badge.status = 'suspended';
    badge.statusReason = reason;

    this.emit('citizenship_suspended', {
      step: currentStep,
      badgeId,
      citizenId,
      reason,
    });

    return true;
  }

  /**
   * Reinstate suspended citizenship
   */
  reinstateCitizenship(
    citizenId: string,
    currentStep: number
  ): boolean {
    const badgeId = this.citizenBadges.get(citizenId);
    if (!badgeId) return false;

    const badge = this.badges.get(badgeId);
    if (!badge || badge.status !== 'suspended') return false;

    badge.status = 'active';
    badge.statusReason = undefined;

    this.emit('citizenship_reinstated', {
      step: currentStep,
      badgeId,
      citizenId,
    });

    return true;
  }

  /**
   * Revoke citizenship
   */
  revokeCitizenship(
    citizenId: string,
    reason: string,
    currentStep: number
  ): boolean {
    const badgeId = this.citizenBadges.get(citizenId);
    if (!badgeId) return false;

    const badge = this.badges.get(badgeId);
    if (!badge) return false;

    badge.status = 'revoked';
    badge.statusReason = reason;

    this.emit('citizenship_revoked', {
      step: currentStep,
      badgeId,
      citizenId,
      reason,
    });

    return true;
  }

  /**
   * Process expirations
   */
  processExpirations(currentStep: number): CitizenshipBadge[] {
    const expired: CitizenshipBadge[] = [];

    for (const badge of this.badges.values()) {
      if (badge.status !== 'active') continue;
      if (badge.expirationStep === null) continue;

      if (currentStep >= badge.expirationStep) {
        badge.status = 'expired';
        badge.statusReason = 'Badge expired';
        expired.push(badge);

        this.emit('citizenship_expired', {
          step: currentStep,
          badgeId: badge.id,
          citizenId: badge.citizenId,
        });
      }
    }

    return expired;
  }

  /**
   * Check if someone is an active citizen
   */
  isActiveCitizen(citizenId: string): boolean {
    const badgeId = this.citizenBadges.get(citizenId);
    if (!badgeId) return false;

    const badge = this.badges.get(badgeId);
    return badge?.status === 'active';
  }

  /**
   * Get citizenship badge for a citizen
   */
  getBadge(citizenId: string): CitizenshipBadge | undefined {
    const badgeId = this.citizenBadges.get(citizenId);
    if (!badgeId) return undefined;
    return this.badges.get(badgeId);
  }

  /**
   * Get all active citizens
   */
  getActiveCitizens(): CitizenshipBadge[] {
    return Array.from(this.badges.values())
      .filter(b => b.status === 'active');
  }

  /**
   * Get active citizen IDs
   */
  getActiveCitizenIds(): string[] {
    return this.getActiveCitizens().map(b => b.citizenId);
  }

  /**
   * Get active citizen count
   */
  getActiveCitizenCount(): number {
    return this.getActiveCitizens().length;
  }

  /**
   * Get citizens by type
   */
  getCitizensByType(citizenshipType: CitizenshipType): CitizenshipBadge[] {
    return Array.from(this.badges.values())
      .filter(b => b.citizenshipType === citizenshipType && b.status === 'active');
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalBadges: number;
    activeCitizens: number;
    suspendedCitizens: number;
    revokedCitizens: number;
    expiredCitizens: number;
    byType: Record<CitizenshipType, number>;
  } {
    const badges = Array.from(this.badges.values());

    const byType: Record<CitizenshipType, number> = {
      contributor: 0,
      builder: 0,
      governance: 0,
      retroactive: 0,
    };

    for (const badge of badges) {
      if (badge.status === 'active') {
        byType[badge.citizenshipType]++;
      }
    }

    return {
      totalBadges: badges.length,
      activeCitizens: badges.filter(b => b.status === 'active').length,
      suspendedCitizens: badges.filter(b => b.status === 'suspended').length,
      revokedCitizens: badges.filter(b => b.status === 'revoked').length,
      expiredCitizens: badges.filter(b => b.status === 'expired').length,
      byType,
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
      badgeCounter: this.badgeCounter,
      badges: Array.from(this.badges.entries()),
      citizenBadges: Array.from(this.citizenBadges.entries()),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): CitizenshipController {
    const controller = new CitizenshipController(data.config);
    controller.badgeCounter = data.badgeCounter || 0;

    if (data.badges) {
      for (const [id, badge] of data.badges) {
        controller.badges.set(id, badge);
      }
    }

    if (data.citizenBadges) {
      for (const [citizenId, badgeId] of data.citizenBadges) {
        controller.citizenBadges.set(citizenId, badgeId);
      }
    }

    return controller;
  }
}

/**
 * Factory function for Optimism citizenship
 */
export function createOptimismCitizenship(): CitizenshipController {
  return new CitizenshipController({
    defaultDurationSteps: null,      // Permanent badges
    minAttestations: 0,              // No attestation requirement
    allowSelfAttestation: false,
    maxCitizens: 0,                  // Unlimited
  });
}
