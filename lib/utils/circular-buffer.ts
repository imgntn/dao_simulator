/**
 * Circular buffer implementation for efficient bounded collections
 * O(1) append without array copying/allocation
 */
export class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error('Capacity must be at least 1');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add an item to the buffer
   * If at capacity, overwrites the oldest item
   */
  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Overwriting oldest item, move head forward
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Get the number of items in the buffer
   */
  get length(): number {
    return this.count;
  }

  /**
   * Get all items as an array (oldest to newest)
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      result.push(this.buffer[index] as T);
    }
    return result;
  }

  /**
   * Get the most recent item
   */
  latest(): T | undefined {
    if (this.count === 0) return undefined;
    const index = (this.tail - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }

  /**
   * Get item at index (0 = oldest)
   */
  at(index: number): T | undefined {
    if (index < 0 || index >= this.count) return undefined;
    const bufferIndex = (this.head + index) % this.capacity;
    return this.buffer[bufferIndex];
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if buffer is at capacity
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Iterate over items (oldest to newest)
   */
  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      yield this.buffer[index] as T;
    }
  }
}

/**
 * Helper to append item to array with maximum size
 * Uses circular buffer semantics - when at capacity, removes oldest
 * This is a functional helper that returns a new array
 */
export function appendCapped<T>(list: T[], item: T, maxSize: number): T[] {
  if (list.length < maxSize) {
    return [...list, item];
  }
  // Remove oldest items to make room
  const overflow = list.length - maxSize + 1;
  return [...list.slice(overflow), item];
}
