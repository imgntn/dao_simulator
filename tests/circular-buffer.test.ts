// Circular buffer unit tests
import { describe, it, expect } from 'vitest';
import { CircularBuffer, appendCapped } from '@/lib/utils/circular-buffer';

describe('CircularBuffer', () => {
  it('should initialize with correct capacity', () => {
    const buffer = new CircularBuffer<number>(5);
    expect(buffer.length).toBe(0);
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.isFull()).toBe(false);
  });

  it('should throw for invalid capacity', () => {
    expect(() => new CircularBuffer<number>(0)).toThrow('Capacity must be at least 1');
    expect(() => new CircularBuffer<number>(-1)).toThrow('Capacity must be at least 1');
  });

  it('should push items correctly', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    expect(buffer.length).toBe(3);
    expect(buffer.isFull()).toBe(true);
    expect(buffer.toArray()).toEqual([1, 2, 3]);
  });

  it('should overwrite oldest items when at capacity', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4); // Should overwrite 1

    expect(buffer.length).toBe(3);
    expect(buffer.toArray()).toEqual([2, 3, 4]);
  });

  it('should continue overwriting as more items are added', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    buffer.push(5);
    buffer.push(6);

    expect(buffer.length).toBe(3);
    expect(buffer.toArray()).toEqual([4, 5, 6]);
  });

  it('should return latest item correctly', () => {
    const buffer = new CircularBuffer<number>(3);
    expect(buffer.latest()).toBeUndefined();

    buffer.push(1);
    expect(buffer.latest()).toBe(1);

    buffer.push(2);
    expect(buffer.latest()).toBe(2);

    buffer.push(3);
    buffer.push(4);
    expect(buffer.latest()).toBe(4);
  });

  it('should access items by index', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    expect(buffer.at(0)).toBe(1); // oldest
    expect(buffer.at(1)).toBe(2);
    expect(buffer.at(2)).toBe(3); // newest
    expect(buffer.at(3)).toBeUndefined();
    expect(buffer.at(-1)).toBeUndefined();
  });

  it('should access items by index after overwrite', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);

    expect(buffer.at(0)).toBe(2); // oldest after overwrite
    expect(buffer.at(1)).toBe(3);
    expect(buffer.at(2)).toBe(4); // newest
  });

  it('should clear correctly', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.toArray()).toEqual([]);
  });

  it('should be iterable', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    const items = [...buffer];
    expect(items).toEqual([1, 2, 3]);
  });

  it('should iterate correctly after overwrite', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    buffer.push(5);

    const items = [...buffer];
    expect(items).toEqual([3, 4, 5]);
  });

  it('should work with objects', () => {
    interface Item {
      id: number;
      name: string;
    }

    const buffer = new CircularBuffer<Item>(2);
    buffer.push({ id: 1, name: 'first' });
    buffer.push({ id: 2, name: 'second' });
    buffer.push({ id: 3, name: 'third' });

    expect(buffer.toArray()).toEqual([
      { id: 2, name: 'second' },
      { id: 3, name: 'third' },
    ]);
  });
});

describe('appendCapped', () => {
  it('should append when under capacity', () => {
    const list = [1, 2, 3];
    const result = appendCapped(list, 4, 5);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it('should remove oldest when at capacity', () => {
    const list = [1, 2, 3, 4, 5];
    const result = appendCapped(list, 6, 5);
    expect(result).toEqual([2, 3, 4, 5, 6]);
  });

  it('should handle empty list', () => {
    const list: number[] = [];
    const result = appendCapped(list, 1, 3);
    expect(result).toEqual([1]);
  });

  it('should not mutate original list', () => {
    const list = [1, 2, 3];
    appendCapped(list, 4, 3);
    expect(list).toEqual([1, 2, 3]);
  });
});
