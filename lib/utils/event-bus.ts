// Event Bus for pub/sub event handling

import type { EventBus as IEventBus, EventCallback, EventData } from '@/types/simulation';

export class EventBus implements IEventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();
  private asyncMode: boolean;
  private pendingAsyncCallbacks: Promise<void>[] = [];

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
   * Publish an event to all subscribers (sync version)
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
   * Publish an event and wait for all async callbacks to complete
   */
  async publishAsync(event: string, data: Omit<EventData, 'event'>): Promise<void> {
    const eventData = { event, ...data } as EventData;

    const promises: Promise<void>[] = [];

    // Notify specific event subscribers
    const eventCallbacks = this.subscribers.get(event);
    if (eventCallbacks) {
      promises.push(...this.notifyCallbacksAsync(eventCallbacks, eventData));
    }

    // Notify wildcard subscribers
    const wildcardCallbacks = this.subscribers.get('*');
    if (wildcardCallbacks) {
      promises.push(...this.notifyCallbacksAsync(wildcardCallbacks, eventData));
    }

    // Wait for all callbacks to complete
    await Promise.all(promises);
  }

  /**
   * Wait for all pending async callbacks to complete
   */
  async flush(): Promise<void> {
    const pending = [...this.pendingAsyncCallbacks];
    this.pendingAsyncCallbacks = [];
    await Promise.all(pending);
  }

  /**
   * Notify all callbacks with the event data (internal sync method)
   */
  private notifyCallbacks(callbacks: Set<EventCallback>, eventData: EventData): void {
    if (this.asyncMode) {
      // Async mode - callbacks executed asynchronously with error handling
      callbacks.forEach(callback => {
        const promise = new Promise<void>((resolve) => {
          setTimeout(async () => {
            try {
              await Promise.resolve(callback(eventData));
            } catch (error) {
              console.error('Error in async event callback:', error);
            }
            resolve();
          }, 0);
        });
        this.pendingAsyncCallbacks.push(promise);
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
   * Notify callbacks and return promises for async waiting
   */
  private notifyCallbacksAsync(callbacks: Set<EventCallback>, eventData: EventData): Promise<void>[] {
    const promises: Promise<void>[] = [];

    callbacks.forEach(callback => {
      const promise = (async () => {
        try {
          await Promise.resolve(callback(eventData));
        } catch (error) {
          console.error('Error in async event callback:', error);
        }
      })();
      promises.push(promise);
    });

    return promises;
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
    this.pendingAsyncCallbacks = [];
  }

  /**
   * Get count of subscribers for an event
   */
  getSubscriberCount(event: string): number {
    return this.subscribers.get(event)?.size || 0;
  }
}
