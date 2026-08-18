import { describe, expect, it } from 'vitest';
import { sampleTimeline } from '../lib/research/timeline-sampling';

describe('timeline sampling', () => {
  it('retains endpoints and stride-aligned observations', () => {
    const timeline = Array.from({ length: 11 }, (_, step) => ({ step, value: step * 2 }));
    expect(sampleTimeline(timeline, 4).map(entry => entry.step)).toEqual([0, 4, 8, 10]);
  });

  it('returns copies and rejects invalid strides', () => {
    const source = [{ step: 1 }, { step: 2 }];
    const sampled = sampleTimeline(source);
    expect(sampled).toEqual(source);
    expect(sampled).not.toBe(source);
    expect(sampled[0]).not.toBe(source[0]);
    expect(() => sampleTimeline(source, 0)).toThrow(/positive integer/);
  });
});
