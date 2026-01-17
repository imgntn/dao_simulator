/**
 * Soulbound Tokens (SBTs) - Non-Transferable Membership Tokens
 *
 * Implements non-transferable tokens that represent membership, credentials,
 * or permissions. Can be used for proposal gating, voting rights, and access control.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type SBTType =
  | 'membership'      // Basic DAO membership
  | 'steward'         // Steward/governance role
  | 'delegate'        // Delegation rights
  | 'citizen'         // Citizenship (like Optimism)
  | 'contributor'     // Contributor badge
  | 'expert'          // Domain expertise
  | 'council'         // Council member
  | 'badgeholder'     // Badge holder (for RetroPGF)
  | 'custom';         // Custom type

export type SBTPermission =
  | 'create_proposal'
  | 'vote'
  | 'vote_council'
  | 'veto'
  | 'delegate'
  | 'allocate_funds'
  | 'submit_retropgf'
  | 'grant_sbt'
  | 'revoke_sbt'
  | 'custom';

export interface SoulboundToken {
  tokenId: string;
  holder: string;
  issuer: string;
  type: SBTType;
  permissions: SBTPermission[];
  metadata: Record<string, unknown>;
  issuedStep: number;
  expirationStep: number | null;  // null = never expires
  revoked: boolean;
  revokedStep: number | null;
  revokedReason: string | null;
}

export interface SBTIssuanceRequest {
  holder: string;
  type: SBTType;
  permissions?: SBTPermission[];
  metadata?: Record<string, unknown>;
  durationSteps?: number;  // If provided, sets expiration
}

export interface SBTConfig {
  allowSelfRevoke: boolean;        // Can holders revoke their own SBT
  requireIssuerForRevoke: boolean; // Only issuer can revoke
  maxTokensPerHolder: number;      // Max SBTs a single holder can have
  defaultExpirationSteps: number | null;  // Default expiration (null = never)
}

export interface SBTGateResult {
  passed: boolean;
  requiredType?: SBTType;
  requiredPermission?: SBTPermission;
  message?: string;
}

export interface SBTStats {
  totalIssued: number;
  totalActive: number;
  totalRevoked: number;
  totalExpired: number;
  holderCount: number;
  tokensByType: Record<SBTType, number>;
}

// =============================================================================
// SOULBOUND TOKEN REGISTRY
// =============================================================================

export class SoulboundTokenRegistry {
  private tokens: Map<string, SoulboundToken> = new Map();
  private holderTokens: Map<string, Set<string>> = new Map();  // holder -> tokenIds
  private typeTokens: Map<SBTType, Set<string>> = new Map();   // type -> tokenIds
  private eventBus: EventBus | null = null;
  private tokenCounter: number = 0;

  config: SBTConfig;

  constructor(config?: Partial<SBTConfig>) {
    this.config = {
      allowSelfRevoke: false,
      requireIssuerForRevoke: true,
      maxTokensPerHolder: 10,
      defaultExpirationSteps: null,
      ...config,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Issue a new soulbound token
   */
  issue(
    request: SBTIssuanceRequest,
    issuer: string,
    currentStep: number
  ): SoulboundToken | null {
    // Check holder's token limit
    const holderTokenIds = this.holderTokens.get(request.holder) || new Set();
    const activeCount = Array.from(holderTokenIds)
      .filter(id => {
        const token = this.tokens.get(id);
        return token && !token.revoked && (
          token.expirationStep === null || token.expirationStep > currentStep
        );
      }).length;

    if (activeCount >= this.config.maxTokensPerHolder) {
      return null;
    }

    // Generate token ID
    this.tokenCounter++;
    const tokenId = `sbt_${this.tokenCounter}`;

    // Calculate expiration
    let expirationStep: number | null = null;
    if (request.durationSteps) {
      expirationStep = currentStep + request.durationSteps;
    } else if (this.config.defaultExpirationSteps) {
      expirationStep = currentStep + this.config.defaultExpirationSteps;
    }

    // Default permissions based on type
    const permissions = request.permissions || this.getDefaultPermissions(request.type);

    const token: SoulboundToken = {
      tokenId,
      holder: request.holder,
      issuer,
      type: request.type,
      permissions,
      metadata: request.metadata || {},
      issuedStep: currentStep,
      expirationStep,
      revoked: false,
      revokedStep: null,
      revokedReason: null,
    };

    // Store token
    this.tokens.set(tokenId, token);

    // Update holder index
    if (!this.holderTokens.has(request.holder)) {
      this.holderTokens.set(request.holder, new Set());
    }
    this.holderTokens.get(request.holder)!.add(tokenId);

    // Update type index
    if (!this.typeTokens.has(request.type)) {
      this.typeTokens.set(request.type, new Set());
    }
    this.typeTokens.get(request.type)!.add(tokenId);

    this.emit('sbt_issued', {
      step: currentStep,
      tokenId,
      holder: request.holder,
      issuer,
      type: request.type,
      permissions,
      expirationStep,
    });

    return token;
  }

  /**
   * Revoke a soulbound token
   */
  revoke(
    tokenId: string,
    revoker: string,
    reason: string,
    currentStep: number
  ): boolean {
    const token = this.tokens.get(tokenId);
    if (!token || token.revoked) {
      return false;
    }

    // Check revocation permissions
    if (this.config.requireIssuerForRevoke && revoker !== token.issuer) {
      // Check if revoker is the holder and self-revoke is allowed
      if (!(this.config.allowSelfRevoke && revoker === token.holder)) {
        return false;
      }
    }

    token.revoked = true;
    token.revokedStep = currentStep;
    token.revokedReason = reason;

    this.emit('sbt_revoked', {
      step: currentStep,
      tokenId,
      holder: token.holder,
      revoker,
      reason,
    });

    return true;
  }

  /**
   * Process expirations for current step
   */
  processExpirations(currentStep: number): void {
    const expiredTokens: string[] = [];

    for (const [tokenId, token] of this.tokens) {
      if (
        !token.revoked &&
        token.expirationStep !== null &&
        token.expirationStep <= currentStep
      ) {
        expiredTokens.push(tokenId);
      }
    }

    for (const tokenId of expiredTokens) {
      const token = this.tokens.get(tokenId)!;

      this.emit('sbt_expired', {
        step: currentStep,
        tokenId,
        holder: token.holder,
        type: token.type,
      });
    }
  }

  /**
   * Check if a holder can perform an action based on SBT permissions
   */
  canPerformAction(
    holder: string,
    permission: SBTPermission,
    currentStep: number
  ): boolean {
    const tokenIds = this.holderTokens.get(holder);
    if (!tokenIds) return false;

    for (const tokenId of tokenIds) {
      const token = this.tokens.get(tokenId);
      if (!token) continue;

      // Check if token is active
      if (token.revoked) continue;
      if (token.expirationStep !== null && token.expirationStep <= currentStep) continue;

      // Check if token has the required permission
      if (token.permissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check gate - verify holder has a specific SBT type
   */
  checkGate(
    holder: string,
    requiredType: SBTType,
    currentStep: number
  ): SBTGateResult {
    const tokenIds = this.holderTokens.get(holder);
    if (!tokenIds) {
      return {
        passed: false,
        requiredType,
        message: `No SBTs found for holder ${holder}`,
      };
    }

    for (const tokenId of tokenIds) {
      const token = this.tokens.get(tokenId);
      if (!token) continue;

      // Check if token is active and of required type
      if (token.type === requiredType && !token.revoked) {
        if (token.expirationStep === null || token.expirationStep > currentStep) {
          return { passed: true };
        }
      }
    }

    return {
      passed: false,
      requiredType,
      message: `Holder ${holder} does not have active ${requiredType} SBT`,
    };
  }

  /**
   * Check gate with permission requirement
   */
  checkGateWithPermission(
    holder: string,
    requiredType: SBTType,
    requiredPermission: SBTPermission,
    currentStep: number
  ): SBTGateResult {
    const typeGate = this.checkGate(holder, requiredType, currentStep);
    if (!typeGate.passed) {
      return typeGate;
    }

    if (!this.canPerformAction(holder, requiredPermission, currentStep)) {
      return {
        passed: false,
        requiredType,
        requiredPermission,
        message: `Holder ${holder} does not have ${requiredPermission} permission`,
      };
    }

    return { passed: true };
  }

  /**
   * Get all active tokens for a holder
   */
  getHolderTokens(holder: string, currentStep: number): SoulboundToken[] {
    const tokenIds = this.holderTokens.get(holder);
    if (!tokenIds) return [];

    return Array.from(tokenIds)
      .map(id => this.tokens.get(id))
      .filter((t): t is SoulboundToken => {
        if (!t || t.revoked) return false;
        if (t.expirationStep !== null && t.expirationStep <= currentStep) return false;
        return true;
      });
  }

  /**
   * Get all tokens of a specific type
   */
  getTokensByType(type: SBTType, activeOnly: boolean = true, currentStep?: number): SoulboundToken[] {
    const tokenIds = this.typeTokens.get(type);
    if (!tokenIds) return [];

    return Array.from(tokenIds)
      .map(id => this.tokens.get(id))
      .filter((t): t is SoulboundToken => {
        if (!t) return false;
        if (!activeOnly) return true;
        if (t.revoked) return false;
        if (currentStep !== undefined && t.expirationStep !== null && t.expirationStep <= currentStep) {
          return false;
        }
        return true;
      });
  }

  /**
   * Get all holders with a specific SBT type
   */
  getHoldersByType(type: SBTType, currentStep: number): string[] {
    const tokens = this.getTokensByType(type, true, currentStep);
    return [...new Set(tokens.map(t => t.holder))];
  }

  /**
   * Get token by ID
   */
  getToken(tokenId: string): SoulboundToken | undefined {
    return this.tokens.get(tokenId);
  }

  /**
   * Get default permissions for a token type
   */
  private getDefaultPermissions(type: SBTType): SBTPermission[] {
    switch (type) {
      case 'membership':
        return ['vote'];
      case 'steward':
        return ['vote', 'create_proposal', 'delegate'];
      case 'delegate':
        return ['vote', 'delegate'];
      case 'citizen':
        return ['vote', 'create_proposal'];
      case 'contributor':
        return ['vote'];
      case 'expert':
        return ['vote', 'create_proposal'];
      case 'council':
        return ['vote', 'vote_council', 'veto', 'create_proposal'];
      case 'badgeholder':
        return ['vote', 'submit_retropgf', 'allocate_funds'];
      default:
        return [];
    }
  }

  /**
   * Get statistics
   */
  getStats(currentStep?: number): SBTStats {
    let totalActive = 0;
    let totalRevoked = 0;
    let totalExpired = 0;
    const holderSet = new Set<string>();
    const tokensByType: Record<SBTType, number> = {
      membership: 0,
      steward: 0,
      delegate: 0,
      citizen: 0,
      contributor: 0,
      expert: 0,
      council: 0,
      badgeholder: 0,
      custom: 0,
    };

    for (const token of this.tokens.values()) {
      tokensByType[token.type] = (tokensByType[token.type] || 0) + 1;

      if (token.revoked) {
        totalRevoked++;
      } else if (currentStep !== undefined && token.expirationStep !== null && token.expirationStep <= currentStep) {
        totalExpired++;
      } else {
        totalActive++;
        holderSet.add(token.holder);
      }
    }

    return {
      totalIssued: this.tokens.size,
      totalActive,
      totalRevoked,
      totalExpired,
      holderCount: holderSet.size,
      tokensByType,
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
      tokenCounter: this.tokenCounter,
      tokens: Array.from(this.tokens.entries()),
      holderTokens: Array.from(this.holderTokens.entries()).map(([holder, ids]) => [
        holder,
        Array.from(ids),
      ]),
      typeTokens: Array.from(this.typeTokens.entries()).map(([type, ids]) => [
        type,
        Array.from(ids),
      ]),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): SoulboundTokenRegistry {
    const registry = new SoulboundTokenRegistry(data.config);
    registry.tokenCounter = data.tokenCounter || 0;

    if (data.tokens) {
      for (const [id, token] of data.tokens) {
        registry.tokens.set(id, token);
      }
    }

    if (data.holderTokens) {
      for (const [holder, ids] of data.holderTokens) {
        registry.holderTokens.set(holder, new Set(ids));
      }
    }

    if (data.typeTokens) {
      for (const [type, ids] of data.typeTokens) {
        registry.typeTokens.set(type as SBTType, new Set(ids));
      }
    }

    return registry;
  }
}

/**
 * Factory function to create SBT registry for Optimism-style governance
 */
export function createOptimismSBTRegistry(): SoulboundTokenRegistry {
  return new SoulboundTokenRegistry({
    allowSelfRevoke: false,
    requireIssuerForRevoke: true,
    maxTokensPerHolder: 5,
    defaultExpirationSteps: null,  // Citizenship doesn't expire
  });
}
