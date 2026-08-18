import {
  RandomStreamRegistry,
  SeededRandom,
  clearGlobalRandom,
  deriveSeed,
  setSeed,
  random,
  randomInt,
  randomFloat,
  randomBool,
  randomChoice,
  randomShuffle,
  randomGaussian,
  withRandomSource,
} from '@/lib/utils/random';

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
  it('rejects unseeded randomness in research mode', () => {
    const previous = process.env.DAO_SIM_RESEARCH_MODE;
    process.env.DAO_SIM_RESEARCH_MODE = '1';
    clearGlobalRandom();
    expect(() => random()).toThrow(/Unseeded randomness/);
    if (previous === undefined) delete process.env.DAO_SIM_RESEARCH_MODE;
    else process.env.DAO_SIM_RESEARCH_MODE = previous;
  });

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

describe('versioned child random streams', () => {
  it('derives stable, namespace-sensitive seeds', () => {
    expect(deriveSeed(42, 'simulation:markets')).toBe(
      deriveSeed(42, 'simulation:markets')
    );
    expect(deriveSeed(42, 'simulation:markets')).not.toBe(
      deriveSeed(42, 'simulation:governance')
    );
    expect(deriveSeed(42, 'dao:a:markets')).not.toBe(
      deriveSeed(42, 'dao:b:markets')
    );
  });

  it('keeps streams independent of access and consumption order', () => {
    const first = new RandomStreamRegistry(99);
    const marketFirst = first.get('markets').next();
    first.get('governance').next();

    const second = new RandomStreamRegistry(99);
    second.get('governance').next();
    const marketSecond = second.get('markets').next();

    expect(marketSecond).toBe(marketFirst);
  });

  it('serializes stream state and scopes global helper calls synchronously', () => {
    const source = new RandomStreamRegistry(7);
    const stream = source.get('agent:alice');
    const first = withRandomSource(stream, () => [random(), randomInt(0, 100)]);
    const saved = source.getState();
    const expectedNext = withRandomSource(stream, () => random());

    const restored = new RandomStreamRegistry(7);
    restored.setState(saved);
    const restoredNext = withRandomSource(restored.get('agent:alice'), () => random());

    expect(first).toHaveLength(2);
    expect(restoredNext).toBe(expectedNext);
    expect(() => withRandomSource(stream, async () => 1)).toThrow(/synchronous/);
  });
});
