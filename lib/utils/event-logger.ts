// Event Logger - log events to various storage backends
// Port from utils/event_logger.py

export interface LogEntry {
  step: number;
  event: string;
  details: Record<string, any>;
}

/**
 * Base Event Logger - stores events in memory
 */
export class EventLogger {
  protected entries: LogEntry[] = [];
  protected maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Log an event
   */
  log(step: number, event: string, details: Record<string, any> = {}): void {
    this.entries.push({ step, event, details });

    // Limit memory usage
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * Handle event from event bus
   */
  handleEvent(event: string, data: Record<string, any>): void {
    const step = data.step || 0;
    const { step: _step, ...details } = data;
    this.log(step, event, details);
  }

  /**
   * Get all logged entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific step
   */
  getEntriesForStep(step: number): LogEntry[] {
    return this.entries.filter((e) => e.step === step);
  }

  /**
   * Get entries for a specific event type
   */
  getEntriesForEvent(event: string): LogEntry[] {
    return this.entries.filter((e) => e.event === event);
  }

  /**
   * Get event counts
   */
  getEventCounts(): Map<string, number> {
    const counts = new Map<string, number>();

    for (const entry of this.entries) {
      const current = counts.get(entry.event) || 0;
      counts.set(entry.event, current + 1);
    }

    return counts;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalEvents: number;
    eventTypes: number;
    stepRange: [number, number];
    counts: Record<string, number>;
  } {
    const counts = this.getEventCounts();
    const steps = this.entries.map((e) => e.step);

    return {
      totalEvents: this.entries.length,
      eventTypes: counts.size,
      stepRange: steps.length > 0
        ? [Math.min(...steps), Math.max(...steps)]
        : [0, 0],
      counts: Object.fromEntries(counts),
    };
  }

  /**
   * Export to CSV format
   */
  toCSV(): string {
    const lines = ['step,event,details'];

    for (const entry of this.entries) {
      const details = JSON.stringify(entry.details).replace(/"/g, '""');
      lines.push(`${entry.step},${entry.event},"${details}"`);
    }

    return lines.join('\n');
  }

  /**
   * Export to JSON format
   */
  toJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Download logs as CSV (browser only)
   */
  downloadCSV(filename: string = 'simulation-log.csv'): void {
    if (typeof window === 'undefined') {
      throw new Error('downloadCSV is only available in browser environment');
    }

    const csv = this.toCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Download logs as JSON (browser only)
   */
  downloadJSON(filename: string = 'simulation-log.json'): void {
    if (typeof window === 'undefined') {
      throw new Error('downloadJSON is only available in browser environment');
    }

    const json = this.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * IndexedDB Event Logger - persists events to browser storage
 */
export class IndexedDBEventLogger extends EventLogger {
  private dbName: string;
  private db: IDBDatabase | null = null;
  private ready: Promise<void>;

  constructor(dbName: string = 'dao-simulation-logs', maxEntries: number = 100000) {
    super(maxEntries);
    this.dbName = dbName;
    this.ready = this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available, falling back to memory storage');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { autoIncrement: true });
          store.createIndex('step', 'step', { unique: false });
          store.createIndex('event', 'event', { unique: false });
        }
      };
    });
  }

  /**
   * Log event to IndexedDB
   */
  async log(step: number, event: string, details: Record<string, any> = {}): Promise<void> {
    // Also log to memory
    super.log(step, event, details);

    await this.ready;

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const request = store.add({ step, event, details, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load entries from IndexedDB
   */
  async loadFromDB(): Promise<LogEntry[]> {
    await this.ready;

    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const request = store.getAll();

      request.onsuccess = () => {
        this.entries = request.result.map((r: any) => ({
          step: r.step,
          event: r.event,
          details: r.details,
        }));
        resolve(this.entries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear IndexedDB
   */
  async clearDB(): Promise<void> {
    this.clear();
    await this.ready;

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
