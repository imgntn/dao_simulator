import { SeededRandom, setSeed, random, randomInt, randomFloat, randomBool, randomChoice, randomShuffle, randomGaussian } from '@/lib/utils/random';

describe('SeededRandom', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = new SeededRandom(123);
    const b = new SeededRandom(123);

    const sequenceA = [a.next(), a.next(), a.next()];
    const sequenceB = [b.next(), b.next(), b.next()];

    expect(sequenceA).toEqual(sequenceB);
  });

  it('honors bounds for integers and floats', () => {
    const r = new SeededRandom(42);
    expect(r.nextInt(0, 5)).toBeGreaterThanOrEqual(0);
    expect(r.nextInt(0, 5)).toBeLessThan(5);

    const f = r.nextFloat(-1, 1);
    expect(f).toBeGreaterThanOrEqual(-1);
    expect(f).toBeLessThanOrEqual(1);
  });

  it('shuffles without mutating the original array', () => {
    const r = new SeededRandom(7);
    const source = [1, 2, 3, 4];
    const shuffled = r.shuffle(source);

    expect(shuffled).toHaveLength(source.length);
    expect(source).toEqual([1, 2, 3, 4]);
    expect(new Set(shuffled)).toEqual(new Set(source));
  });
});

describe('global random helpers', () => {
  it('use the global seed when set', () => {
    setSeed(99);
    const first = [random(), randomInt(0, 10), randomFloat(0, 1), randomBool(1), randomChoice([1, 2, 3])];

    setSeed(99);
    const second = [random(), randomInt(0, 10), randomFloat(0, 1), randomBool(1), randomChoice([1, 2, 3])];

    expect(first).toEqual(second);
  });

  it('returns a reasonable gaussian sample', () => {
    setSeed(2025);
    const sample = randomGaussian(0, 1);
    expect(Number.isFinite(sample)).toBe(true);
  });

  it('shuffles arrays while preserving elements', () => {
    setSeed(5);
    const result = randomShuffle(['a', 'b', 'c']);
    expect(result.sort()).toEqual(['a', 'b', 'c']);
  });
});
