// Event Bus for pub/sub event handling

import type { EventBus as IEventBus, EventCallback, EventData } from '@/types/simulation';

export class EventBus implements IEventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();
  private asyncMode: boolean;

  constructor(asyncMode: boolean = false) {
    this.asyncMode = asyncMode;
  }

  /**
   * Subscribe to an event
   * Use '*' to subscribe to all events
   */
  subscribe(event: string, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(event: string, callback: EventCallback): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(event);
      }
    }
  }

  /**
   * Publish an event to all subscribers
   */
  publish(event: string, data: Omit<EventData, 'event'>): void {
    const eventData = { event, ...data } as EventData;

    // Notify specific event subscribers
    const eventCallbacks = this.subscribers.get(event);
    if (eventCallbacks) {
      this.notifyCallbacks(eventCallbacks, eventData);
    }

    // Notify wildcard subscribers
    const wildcardCallbacks = this.subscribers.get('*');
    if (wildcardCallbacks) {
      this.notifyCallbacks(wildcardCallbacks, eventData);
    }
  }

  /**
   * Notify all callbacks with the event data
   */
  private notifyCallbacks(callbacks: Set<EventCallback>, eventData: EventData): void {
    if (this.asyncMode) {
      // Async mode - callbacks executed asynchronously
      callbacks.forEach(callback => {
        setTimeout(() => callback(eventData), 0);
      });
    } else {
      // Sync mode - callbacks executed immediately
      callbacks.forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
  }

  /**
   * Get count of subscribers for an event
   */
  getSubscriberCount(event: string): number {
    return this.subscribers.get(event)?.size || 0;
  }
}
