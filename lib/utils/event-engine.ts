// Event Engine - load and trigger events from configuration
// Port from utils/event_engine.py

import type { DAOModel } from '../engine/model';
import { createRandomProposal } from './proposal-utils';

export interface EventConfig {
  step: number;
  type: string;
  [key: string]: any;
}

export class EventEngine {
  events: EventConfig[] = [];
  byStep: Map<number, EventConfig[]> = new Map();

  constructor(events?: EventConfig[]) {
    if (events) {
      this.loadEvents(events);
    }
  }

  /**
   * Load events from configuration array
   */
  loadEvents(events: EventConfig[]): void {
    this.events = events;
    this.byStep.clear();

    for (const evt of events) {
      const step = evt.step || 0;
      if (!this.byStep.has(step)) {
        this.byStep.set(step, []);
      }
      this.byStep.get(step)!.push(evt);
    }
  }

  /**
   * Load events from JSON string
   */
  loadFromJson(json: string): void {
    const data = JSON.parse(json);
    let events: EventConfig[];

    if (Array.isArray(data)) {
      events = data;
    } else if (data.events && Array.isArray(data.events)) {
      events = data.events;
    } else {
      throw new Error('Event data must be an array or contain an "events" array');
    }

    this.loadEvents(events);
  }

  /**
   * Trigger all events scheduled for the given step
   */
  triggerEvents(step: number, sim: DAOModel): void {
    const events = this.byStep.get(step);
    if (!events) {
      return;
    }

    // Remove from map after retrieving
    this.byStep.delete(step);

    for (const evt of events) {
      const eventType = evt.type;

      switch (eventType) {
        case 'market_shock':
          this.triggerMarketShock(evt, sim);
          break;

        case 'create_proposal':
          this.createProposal(evt, sim);
          break;

        default:
          console.warn(`Unknown event type: ${eventType}`);
      }
    }
  }

  /**
   * Trigger a market shock event
   */
  private triggerMarketShock(evt: EventConfig, sim: DAOModel): void {
    const severity = evt.severity || 0;

    if (typeof (sim as any).triggerMarketShock === 'function') {
      (sim as any).triggerMarketShock(severity);
    } else {
      // Fallback: manually adjust price
      const oldPrice = sim.dao.treasury.getTokenPrice('DAO_TOKEN');
      const newPrice = oldPrice * (1 + severity);
      sim.dao.treasury.updateTokenPrice('DAO_TOKEN', newPrice);

      if (sim.eventBus) {
        sim.eventBus.publish('market_shock', {
          step: sim.currentStep,
          severity,
          oldPrice,
          newPrice,
        });
      }
    }
  }

  /**
   * Create a proposal from event configuration
   */
  private createProposal(evt: EventConfig, sim: DAOModel): void {
    const creator = sim.dao.members.length > 0 ? sim.dao.members[0] : undefined;
    const title = evt.title || 'Event Proposal';

    const proposal = createRandomProposal(sim.dao, creator, title);

    if (proposal) {
      sim.dao.addProposal(proposal);
    }
  }

  /**
   * Add a new event at runtime
   */
  addEvent(event: EventConfig): void {
    this.events.push(event);

    const step = event.step || 0;
    if (!this.byStep.has(step)) {
      this.byStep.set(step, []);
    }
    this.byStep.get(step)!.push(event);
  }

  /**
   * Get all loaded events
   */
  listEvents(): EventConfig[] {
    return [...this.events];
  }

  /**
   * Get events scheduled for a specific step
   */
  getEventsForStep(step: number): EventConfig[] {
    return this.byStep.get(step) || [];
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.byStep.clear();
  }

  /**
   * Export events as JSON
   */
  toJson(): string {
    return JSON.stringify({ events: this.events }, null, 2);
  }
}
