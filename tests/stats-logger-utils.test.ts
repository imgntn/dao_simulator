/**
 * Tests for lightweight utility modules.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DAOMember } from '../lib/agents/base';
import { Logger } from '../lib/utils/logger';
import {
  gini,
  inDegreeCentrality,
  mean,
  median,
  percentile,
  standardDeviation,
} from '../lib/utils/stats';

describe('stats utilities', () => {
  it('calculates Gini with empty, equal, unequal, and non-finite inputs', () => {
    expect(gini([])).toBe(0);
    expect(gini([0, 0, 0])).toBe(0);
    expect(gini([10, 10, 10])).toBe(0);
    expect(gini([0, 0, 100])).toBeCloseTo(2 / 3);
    expect(gini([-10, Number.NaN, Number.POSITIVE_INFINITY, 10, 20])).toBeCloseTo(1 / 6);
  });

  it('calculates centrality from representative links', () => {
    const alice = member('alice');
    const bob = member('bob');
    const carol = member('carol');
    alice.representative = bob;
    carol.representative = bob;

    const centrality = inDegreeCentrality([alice, bob, carol] as DAOMember[]);

    expect(centrality.get('alice')).toBe(0);
    expect(centrality.get('bob')).toBe(1);
    expect(centrality.get('carol')).toBe(0);
    expect(inDegreeCentrality([alice] as DAOMember[]).get('alice')).toBe(0);
  });

  it('calculates mean, median, standard deviation, and percentiles with finite values only', () => {
    expect(mean([])).toBe(0);
    expect(mean([1, 2, Number.NaN, Number.POSITIVE_INFINITY, 3])).toBe(2);

    expect(median([])).toBe(0);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([Number.NaN, 10, 20])).toBe(15);

    expect(standardDeviation([1])).toBe(0);
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);

    expect(percentile([], 50)).toBe(0);
    expect(percentile([10, 20, 30], 0)).toBe(10);
    expect(percentile([10, 20, 30], 50)).toBe(20);
    expect(percentile([10, 20, 30], 100)).toBe(30);
    expect(percentile([Number.NaN, 10, 20], 50)).toBe(15);
    expect(() => percentile([1, 2, 3], -1)).toThrow('Percentile');
    expect(() => percentile([1, 2, 3], 101)).toThrow('Percentile');
  });
});

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters output by level and preserves level for child loggers', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new Logger('root');

    expect(logger.getLevel()).toBe('warn');
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn', { id: 1 });
    logger.error('error');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[root] warn', { id: 1 });
    expect(errorSpy).toHaveBeenCalledWith('[root] error');

    logger.setLevel('debug');
    const child = logger.child('child');
    child.debug('debug');
    child.info('info');

    expect(child.getLevel()).toBe('debug');
    expect(logSpy).toHaveBeenCalledWith('[root:child] debug');
    expect(logSpy).toHaveBeenCalledWith('[root:child] info');

    logger.setLevel('silent');
    logger.error('silent error');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

function member(uniqueId: string): Pick<DAOMember, 'uniqueId'> & { representative?: Pick<DAOMember, 'uniqueId'> } {
  return { uniqueId };
}
