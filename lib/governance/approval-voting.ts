/**
 * Approval Voting - MakerDAO-style Continuous Executive Voting
 *
 * Implements continuous approval voting where multiple executive proposals
 * ("spells") compete for support. The spell with the most ongoing approval
 * becomes active. Support can be moved between spells at any time.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type SpellStatus =
  | 'pending'      // Awaiting support
  | 'hat'          // Currently the "hat" (active spell)
  | 'executed'     // Has been executed
  | 'expired'      // Expired without execution
  | 'cancelled';   // Cancelled

export interface ExecutiveSpell {
  id: string;
  title: string;
  description: string;
  creator: string;
  createdStep: number;

  // Payload to execute
  payload: unknown;
  payloadHash: string;

  // Support tracking
  supporters: Map<string, number>;  // voter -> voting power
  totalSupport: number;

  // Status
  status: SpellStatus;
  becameHatStep: number | null;
  executedStep: number | null;
  expirationStep: number | null;

  // Safety
  lifetimeSteps: number;  // Spell expires after this many steps
}

export interface ApprovalVotingConfig {
  spellLifetimeSteps: number;  // Default 720 (30 days)
  minSupportToExecute: number; // Minimum support to become executable
  executionDelaySteps: number; // Delay after becoming hat before execution
  allowMultipleSupport: boolean; // Can support multiple spells
}

// =============================================================================
// APPROVAL VOTING CONTROLLER
// =============================================================================

export class ApprovalVotingController {
  private spells: Map<string, ExecutiveSpell> = new Map();
  private spellCounter: number = 0;
  private currentHat: string | null = null;
  private voterSupport: Map<string, Set<string>> = new Map();  // voter -> spellIds
  private eventBus: EventBus | null = null;

  config: ApprovalVotingConfig;
  totalVotingPower: number = 0;

  constructor(config?: Partial<ApprovalVotingConfig>) {
    this.config = {
      spellLifetimeSteps: config?.spellLifetimeSteps ?? 720,
      minSupportToExecute: config?.minSupportToExecute ?? 0,
      executionDelaySteps: config?.executionDelaySteps ?? 0,
      allowMultipleSupport: config?.allowMultipleSupport ?? false,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Update total voting power
   */
  updateTotalVotingPower(power: number): void {
    this.totalVotingPower = power;
  }

  /**
   * Create a new executive spell
   */
  createSpell(
    title: string,
    description: string,
    creator: string,
    payload: unknown,
    currentStep: number
  ): ExecutiveSpell {
    const spellId = `spell_${++this.spellCounter}`;
    const payloadHash = this.hashPayload(payload);

    const spell: ExecutiveSpell = {
      id: spellId,
      title,
      description,
      creator,
      createdStep: currentStep,
      payload,
      payloadHash,
      supporters: new Map(),
      totalSupport: 0,
      status: 'pending',
      becameHatStep: null,
      executedStep: null,
      expirationStep: currentStep + this.config.spellLifetimeSteps,
      lifetimeSteps: this.config.spellLifetimeSteps,
    };

    this.spells.set(spellId, spell);

    this.emit('executive_spell_created', {
      step: currentStep,
      spellId,
      title,
      creator,
      expirationStep: spell.expirationStep,
    });

    return spell;
  }

  /**
   * Support a spell (move voting power to it)
   */
  supportSpell(
    spellId: string,
    voterId: string,
    votingPower: number,
    currentStep: number
  ): boolean {
    const spell = this.spells.get(spellId);
    if (!spell || spell.status === 'executed' || spell.status === 'expired') {
      return false;
    }

    // If not allowing multiple support, remove from other spells
    if (!this.config.allowMultipleSupport) {
      const currentSupports = this.voterSupport.get(voterId);
      if (currentSupports) {
        for (const oldSpellId of currentSupports) {
          if (oldSpellId !== spellId) {
            this.removeSupport(oldSpellId, voterId, currentStep, true);
          }
        }
      }
    }

    // Update or add support
    const previousSupport = spell.supporters.get(voterId) || 0;
    spell.supporters.set(voterId, votingPower);
    spell.totalSupport = spell.totalSupport - previousSupport + votingPower;

    // Track voter's supported spells
    const voterSpells = this.voterSupport.get(voterId) || new Set();
    voterSpells.add(spellId);
    this.voterSupport.set(voterId, voterSpells);

    this.emit('spell_support_changed', {
      step: currentStep,
      spellId,
      voterId,
      previousSupport,
      newSupport: votingPower,
      totalSupport: spell.totalSupport,
    });

    // Check if this spell should become the new hat
    this.updateHat(currentStep);

    return true;
  }

  /**
   * Remove support from a spell
   */
  removeSupport(
    spellId: string,
    voterId: string,
    currentStep: number,
    silent: boolean = false
  ): boolean {
    const spell = this.spells.get(spellId);
    if (!spell) return false;

    const support = spell.supporters.get(voterId);
    if (support === undefined) return false;

    spell.supporters.delete(voterId);
    spell.totalSupport -= support;

    const voterSpells = this.voterSupport.get(voterId);
    if (voterSpells) {
      voterSpells.delete(spellId);
    }

    if (!silent) {
      this.emit('spell_support_removed', {
        step: currentStep,
        spellId,
        voterId,
        removedSupport: support,
        totalSupport: spell.totalSupport,
      });

      this.updateHat(currentStep);
    }

    return true;
  }

  /**
   * Update which spell is the "hat" (has most support)
   */
  private updateHat(currentStep: number): void {
    let maxSupport = 0;
    let newHat: string | null = null;

    for (const [spellId, spell] of this.spells) {
      if (spell.status !== 'pending' && spell.status !== 'hat') continue;
      if (spell.totalSupport > maxSupport &&
          spell.totalSupport >= this.config.minSupportToExecute) {
        maxSupport = spell.totalSupport;
        newHat = spellId;
      }
    }

    if (newHat !== this.currentHat) {
      // Remove hat from old spell
      if (this.currentHat) {
        const oldHat = this.spells.get(this.currentHat);
        if (oldHat && oldHat.status === 'hat') {
          oldHat.status = 'pending';
        }
      }

      // Set new hat
      if (newHat) {
        const newHatSpell = this.spells.get(newHat)!;
        newHatSpell.status = 'hat';
        newHatSpell.becameHatStep = currentStep;

        this.emit('hat_changed', {
          step: currentStep,
          previousHat: this.currentHat,
          newHat,
          newHatTitle: newHatSpell.title,
          totalSupport: newHatSpell.totalSupport,
        });
      }

      this.currentHat = newHat;
    }
  }

  /**
   * Execute the current hat spell
   */
  executeHat(currentStep: number): ExecutiveSpell | null {
    if (!this.currentHat) return null;

    const spell = this.spells.get(this.currentHat);
    if (!spell || spell.status !== 'hat') return null;

    // Check execution delay
    if (this.config.executionDelaySteps > 0 && spell.becameHatStep) {
      if (currentStep < spell.becameHatStep + this.config.executionDelaySteps) {
        return null;  // Still in delay period
      }
    }

    spell.status = 'executed';
    spell.executedStep = currentStep;
    this.currentHat = null;

    this.emit('spell_executed', {
      step: currentStep,
      spellId: spell.id,
      title: spell.title,
      totalSupport: spell.totalSupport,
      payload: spell.payload,
    });

    // Update hat to next highest
    this.updateHat(currentStep);

    return spell;
  }

  /**
   * Process spells - expire old ones, update hat
   */
  processSpells(currentStep: number): void {
    for (const spell of this.spells.values()) {
      // Expire old spells
      if (spell.status === 'pending' || spell.status === 'hat') {
        if (spell.expirationStep && currentStep >= spell.expirationStep) {
          spell.status = 'expired';

          if (this.currentHat === spell.id) {
            this.currentHat = null;
          }

          this.emit('spell_expired', {
            step: currentStep,
            spellId: spell.id,
            title: spell.title,
          });
        }
      }
    }

    // Update hat after expiration
    this.updateHat(currentStep);
  }

  /**
   * Cancel a spell (creator only)
   */
  cancelSpell(
    spellId: string,
    requesterId: string,
    currentStep: number
  ): boolean {
    const spell = this.spells.get(spellId);
    if (!spell) return false;

    if (spell.creator !== requesterId) return false;
    if (spell.status === 'executed') return false;

    spell.status = 'cancelled';

    if (this.currentHat === spellId) {
      this.currentHat = null;
      this.updateHat(currentStep);
    }

    this.emit('spell_cancelled', {
      step: currentStep,
      spellId,
      title: spell.title,
    });

    return true;
  }

  /**
   * Get current hat spell
   */
  getCurrentHat(): ExecutiveSpell | null {
    if (!this.currentHat) return null;
    return this.spells.get(this.currentHat) || null;
  }

  /**
   * Get spell by ID
   */
  getSpell(spellId: string): ExecutiveSpell | undefined {
    return this.spells.get(spellId);
  }

  /**
   * Get all active spells (pending or hat)
   */
  getActiveSpells(): ExecutiveSpell[] {
    return Array.from(this.spells.values())
      .filter(s => s.status === 'pending' || s.status === 'hat')
      .sort((a, b) => b.totalSupport - a.totalSupport);
  }

  /**
   * Get voter's supported spells
   */
  getVoterSupports(voterId: string): ExecutiveSpell[] {
    const spellIds = this.voterSupport.get(voterId);
    if (!spellIds) return [];

    return Array.from(spellIds)
      .map(id => this.spells.get(id))
      .filter((s): s is ExecutiveSpell => s !== undefined);
  }

  /**
   * Hash payload for identification
   */
  private hashPayload(payload: unknown): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSpells: number;
    activeSpells: number;
    executedSpells: number;
    currentHat: string | null;
    totalSupportInPlay: number;
  } {
    const spells = Array.from(this.spells.values());
    const active = spells.filter(s => s.status === 'pending' || s.status === 'hat');

    return {
      totalSpells: spells.length,
      activeSpells: active.length,
      executedSpells: spells.filter(s => s.status === 'executed').length,
      currentHat: this.currentHat,
      totalSupportInPlay: active.reduce((sum, s) => sum + s.totalSupport, 0),
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
      spellCounter: this.spellCounter,
      currentHat: this.currentHat,
      totalVotingPower: this.totalVotingPower,
      spells: Array.from(this.spells.entries()).map(([id, spell]) => ({
        ...spell,
        supporters: Object.fromEntries(spell.supporters),
      })),
      voterSupport: Array.from(this.voterSupport.entries()).map(([voter, spells]) => [
        voter,
        Array.from(spells),
      ]),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): ApprovalVotingController {
    const controller = new ApprovalVotingController(data.config);
    controller.spellCounter = data.spellCounter || 0;
    controller.currentHat = data.currentHat || null;
    controller.totalVotingPower = data.totalVotingPower || 0;

    if (data.spells) {
      for (const spellData of data.spells) {
        const spell: ExecutiveSpell = {
          ...spellData,
          supporters: new Map(Object.entries(spellData.supporters || {})),
        };
        controller.spells.set(spell.id, spell);
      }
    }

    if (data.voterSupport) {
      for (const [voter, spells] of data.voterSupport) {
        controller.voterSupport.set(voter, new Set(spells));
      }
    }

    return controller;
  }
}

/**
 * Factory function for MakerDAO approval voting
 */
export function createMakerApprovalVoting(): ApprovalVotingController {
  return new ApprovalVotingController({
    spellLifetimeSteps: 720,       // 30 days
    minSupportToExecute: 0,        // Any support can become hat
    executionDelaySteps: 0,        // Instant execution when hat
    allowMultipleSupport: false,   // Support one spell at a time
  });
}
