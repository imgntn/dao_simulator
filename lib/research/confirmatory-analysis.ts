import {
  mean,
  median,
  percentile,
  standardDeviation,
  tDistributionCDF,
} from './statistics';

export interface AnalysisObservation {
  condition: string;
  seed: number;
  value: number;
  daoId?: string;
  factors?: Record<string, string | number | boolean>;
  runId?: string;
}

export interface Interval {
  lower: number;
  upper: number;
  level: number;
}

export interface PairedEffect {
  conditionA: string;
  conditionB: string;
  experimentalUnit: 'paired_seed';
  nPairs: number;
  missingInA: number[];
  missingInB: number[];
  excludedNonFinite: string[];
  differences: Array<{ seed: number; value: number; runIdA?: string; runIdB?: string }>;
  meanDifference: number;
  medianDifference: number;
  standardDeviation: number;
  standardError: number;
  confidenceInterval: Interval;
  bootstrapInterval: Interval;
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  signFlipPValue: number;
  cohensDz: number;
  practicalEquivalenceInterval: { lower: number; upper: number };
  practicallyEquivalent: boolean;
  practicallyImportant: boolean;
}

export type CorrectionMethod = 'holm' | 'benjamini-hochberg';

export interface CorrectedTest {
  id: string;
  rawPValue: number;
  adjustedPValue: number;
  rejected: boolean;
}

export interface FactorialCoefficient {
  term: string;
  estimate: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  confidenceInterval: Interval;
  robustStandardError: number;
  robustTStatistic: number;
  robustPValue: number;
  robustConfidenceInterval: Interval;
}

export interface FactorialModel {
  outcome: string;
  n: number;
  residualDegreesOfFreedom: number;
  rSquared: number;
  adjustedRSquared: number;
  coefficients: FactorialCoefficient[];
  influentialRows: number[];
  residualSkewness: number;
}

export interface DaoEffect {
  daoId: string;
  estimate: number;
  standardError: number;
}

export interface HierarchicalSummary {
  model: 'random_effects_meta_analysis';
  daoCount: number;
  pooledEstimate: number;
  standardError: number;
  confidenceInterval: Interval;
  tauSquared: number;
  iSquared: number;
  daoEffects: DaoEffect[];
}

export interface PilotPower {
  targetPower: number;
  alpha: number;
  smallestEffectOfInterest: number;
  pilotPairs: number;
  pilotDifferenceSd: number;
  requiredPairs: number;
}

export interface SimulationPower {
  method: 'empirical_residual_paired_t_monte_carlo';
  alpha: number;
  targetPower: number;
  smallestEffectOfInterest: number;
  simulationsPerCandidate: number;
  candidatePower: Array<{ pairs: number; power: number }>;
  requiredPairs: number | null;
}

export function analyzePairedEffect(
  observations: readonly AnalysisObservation[],
  conditionA: string,
  conditionB: string,
  equivalenceHalfWidth: number,
  bootstrapSamples = 10_000,
): PairedEffect {
  if (!(equivalenceHalfWidth > 0) || !Number.isFinite(equivalenceHalfWidth)) {
    throw new Error('equivalenceHalfWidth must be finite and positive');
  }
  const a = indexCondition(observations, conditionA);
  const b = indexCondition(observations, conditionB);
  const seeds = [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x - y);
  const missingInA: number[] = [];
  const missingInB: number[] = [];
  const excludedNonFinite: string[] = [];
  const differences: PairedEffect['differences'] = [];

  for (const seed of seeds) {
    const left = a.get(seed);
    const right = b.get(seed);
    if (!left) {
      missingInA.push(seed);
      continue;
    }
    if (!right) {
      missingInB.push(seed);
      continue;
    }
    if (!Number.isFinite(left.value) || !Number.isFinite(right.value)) {
      excludedNonFinite.push(`${conditionA}/${conditionB}:seed=${seed}`);
      continue;
    }
    differences.push({
      seed,
      value: right.value - left.value,
      runIdA: left.runId,
      runIdB: right.runId,
    });
  }
  if (differences.length < 2) {
    throw new Error(
      `Paired analysis requires at least two finite seed pairs; found ${differences.length}`
    );
  }

  const values = differences.map(item => item.value);
  const estimate = mean(values);
  const sd = standardDeviation(values);
  const se = sd / Math.sqrt(values.length);
  const df = values.length - 1;
  const t = se === 0 ? (estimate === 0 ? 0 : Math.sign(estimate) * Infinity) : estimate / se;
  const pValue = Number.isFinite(t)
    ? Math.min(1, 2 * (1 - tDistributionCDF(Math.abs(t), df)))
    : 0;
  const critical = tCritical(0.975, df);
  const ci = {
    lower: estimate - critical * se,
    upper: estimate + critical * se,
    level: 0.95,
  };
  const bootstrapInterval = bootstrapMeanInterval(values, bootstrapSamples);
  const equivalence = { lower: -equivalenceHalfWidth, upper: equivalenceHalfWidth };

  return {
    conditionA,
    conditionB,
    experimentalUnit: 'paired_seed',
    nPairs: values.length,
    missingInA,
    missingInB,
    excludedNonFinite,
    differences,
    meanDifference: estimate,
    medianDifference: median(values),
    standardDeviation: sd,
    standardError: se,
    confidenceInterval: ci,
    bootstrapInterval,
    tStatistic: t,
    degreesOfFreedom: df,
    pValue,
    signFlipPValue: signFlipTest(values),
    cohensDz: sd === 0 ? (estimate === 0 ? 0 : Math.sign(estimate) * Infinity) : estimate / sd,
    practicalEquivalenceInterval: equivalence,
    practicallyEquivalent: ci.lower >= equivalence.lower && ci.upper <= equivalence.upper,
    practicallyImportant: ci.lower > equivalence.upper || ci.upper < equivalence.lower,
  };
}

export function correctPValues(
  tests: readonly { id: string; pValue: number }[],
  method: CorrectionMethod,
  alpha = 0.05,
): CorrectedTest[] {
  if (!(alpha > 0 && alpha < 1)) throw new Error('alpha must be between zero and one');
  tests.forEach(test => {
    if (!(test.pValue >= 0 && test.pValue <= 1)) {
      throw new Error(`Invalid p-value for ${test.id}: ${test.pValue}`);
    }
  });
  const sorted = tests
    .map((test, index) => ({ ...test, index }))
    .sort((a, b) => a.pValue - b.pValue);
  const adjusted = new Array<number>(tests.length);

  if (method === 'holm') {
    let running = 0;
    sorted.forEach((test, rank) => {
      running = Math.max(running, Math.min(1, (tests.length - rank) * test.pValue));
      adjusted[test.index] = running;
    });
  } else {
    let running = 1;
    for (let rank = sorted.length - 1; rank >= 0; rank--) {
      running = Math.min(running, (sorted.length / (rank + 1)) * sorted[rank].pValue);
      adjusted[sorted[rank].index] = Math.min(1, running);
    }
  }

  return tests.map((test, index) => ({
    id: test.id,
    rawPValue: test.pValue,
    adjustedPValue: adjusted[index],
    rejected: adjusted[index] <= alpha,
  }));
}

export function fitFactorialModel(
  observations: readonly AnalysisObservation[],
  outcome: string,
): FactorialModel {
  const finite = observations.filter(item => Number.isFinite(item.value));
  if (finite.length < 4) throw new Error('Factorial model requires at least four finite observations');
  const factorNames = [...new Set(finite.flatMap(item => Object.keys(item.factors ?? {})))].sort();
  if (factorNames.length === 0) throw new Error('Factorial model requires declared factors');

  const encoded = encodeFactors(finite, factorNames);
  const baseTerms = encoded.termNames;
  const interactionPairs: Array<[number, number]> = [];
  for (let i = 0; i < baseTerms.length; i++) {
    for (let j = i + 1; j < baseTerms.length; j++) {
      if (encoded.sourceFactors[i] !== encoded.sourceFactors[j]) interactionPairs.push([i, j]);
    }
  }
  const termNames = [
    '(Intercept)',
    ...baseTerms,
    ...interactionPairs.map(([i, j]) => `${baseTerms[i]}:${baseTerms[j]}`),
  ];
  const x = encoded.rows.map(row => [
    1,
    ...row,
    ...interactionPairs.map(([i, j]) => row[i] * row[j]),
  ]);
  if (x.length <= x[0].length) {
    throw new Error(
      `Factorial model is underdetermined: ${x.length} observations for ${x[0].length} coefficients`
    );
  }
  const y = finite.map(item => item.value);
  const xt = transpose(x);
  const xtxInverse = invertMatrix(multiplyMatrices(xt, x));
  const beta = multiplyMatrixVector(xtxInverse, multiplyMatrixVector(xt, y));
  const fitted = x.map(row => dot(row, beta));
  const residuals = y.map((value, index) => value - fitted[index]);
  const df = y.length - beta.length;
  const sse = residuals.reduce((sum, value) => sum + value * value, 0);
  const yMean = mean(y);
  const sst = y.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  const sigma2 = sse / df;
  const critical = tCritical(0.975, df);
  const coefficients: FactorialCoefficient[] = beta.map((estimate, index) => {
    const se = Math.sqrt(Math.max(0, sigma2 * xtxInverse[index][index]));
    const t = se === 0 ? (estimate === 0 ? 0 : Math.sign(estimate) * Infinity) : estimate / se;
    return {
      term: termNames[index],
      estimate,
      standardError: se,
      tStatistic: t,
      pValue: Number.isFinite(t)
        ? Math.min(1, 2 * (1 - tDistributionCDF(Math.abs(t), df)))
        : 0,
      confidenceInterval: {
        lower: estimate - critical * se,
        upper: estimate + critical * se,
        level: 0.95,
      },
      robustStandardError: 0,
      robustTStatistic: 0,
      robustPValue: 1,
      robustConfidenceInterval: {
        lower: estimate,
        upper: estimate,
        level: 0.95,
      },
    };
  });
  const leverage = x.map(row => dot(row, multiplyMatrixVector(xtxInverse, row)));
  const robustMeat = x.map((row, index) => {
    const adjustedResidual = residuals[index] / Math.max(Number.EPSILON, 1 - leverage[index]);
    return row.map(left => row.map(right => left * right * adjustedResidual ** 2));
  }).reduce(
    (sum, matrix) => sum.map(
      (row, rowIndex) => row.map(
        (value, columnIndex) => value + matrix[rowIndex][columnIndex]
      )
    ),
    x[0].map(() => x[0].map(() => 0)),
  );
  const robustCovariance = multiplyMatrices(
    multiplyMatrices(xtxInverse, robustMeat),
    xtxInverse,
  );
  coefficients.forEach((coefficient, index) => {
    const robustSe = Math.sqrt(Math.max(0, robustCovariance[index][index]));
    const robustT = robustSe === 0
      ? (coefficient.estimate === 0 ? 0 : Math.sign(coefficient.estimate) * Infinity)
      : coefficient.estimate / robustSe;
    coefficient.robustStandardError = robustSe;
    coefficient.robustTStatistic = robustT;
    coefficient.robustPValue = Number.isFinite(robustT)
      ? Math.min(1, 2 * (1 - tDistributionCDF(Math.abs(robustT), df)))
      : 0;
    coefficient.robustConfidenceInterval = {
      lower: coefficient.estimate - critical * robustSe,
      upper: coefficient.estimate + critical * robustSe,
      level: 0.95,
    };
  });
  const cooks = residuals.map(
    (residual, index) =>
      (residual ** 2 / (beta.length * sigma2))
      * (leverage[index] / Math.max(Number.EPSILON, (1 - leverage[index]) ** 2))
  );

  return {
    outcome,
    n: y.length,
    residualDegreesOfFreedom: df,
    rSquared: sst === 0 ? 1 : 1 - sse / sst,
    adjustedRSquared: sst === 0 ? 1 : 1 - (sse / df) / (sst / (y.length - 1)),
    coefficients,
    influentialRows: cooks
      .map((value, index) => ({ value, index }))
      .filter(item => item.value > 4 / y.length)
      .map(item => item.index),
    residualSkewness: skewness(residuals),
  };
}

export function poolDaoEffects(effects: readonly DaoEffect[]): HierarchicalSummary {
  if (effects.length < 2) throw new Error('Hierarchical pooling requires at least two DAOs');
  effects.forEach(effect => {
    if (!Number.isFinite(effect.estimate) || !(effect.standardError > 0)) {
      throw new Error(`Invalid DAO effect for ${effect.daoId}`);
    }
  });
  const fixedWeights = effects.map(effect => 1 / effect.standardError ** 2);
  const fixedMean = weightedMean(effects.map(effect => effect.estimate), fixedWeights);
  const q = effects.reduce(
    (sum, effect, index) => sum + fixedWeights[index] * (effect.estimate - fixedMean) ** 2,
    0,
  );
  const c = fixedWeights.reduce((sum, weight) => sum + weight, 0)
    - fixedWeights.reduce((sum, weight) => sum + weight ** 2, 0)
      / fixedWeights.reduce((sum, weight) => sum + weight, 0);
  const tauSquared = Math.max(0, (q - (effects.length - 1)) / c);
  const weights = effects.map(effect => 1 / (effect.standardError ** 2 + tauSquared));
  const pooledEstimate = weightedMean(effects.map(effect => effect.estimate), weights);
  const standardError = Math.sqrt(1 / weights.reduce((sum, weight) => sum + weight, 0));
  return {
    model: 'random_effects_meta_analysis',
    daoCount: effects.length,
    pooledEstimate,
    standardError,
    confidenceInterval: {
      lower: pooledEstimate - 1.96 * standardError,
      upper: pooledEstimate + 1.96 * standardError,
      level: 0.95,
    },
    tauSquared,
    iSquared: q <= 0 ? 0 : Math.max(0, (q - (effects.length - 1)) / q),
    daoEffects: effects.map(effect => ({ ...effect })),
  };
}

export function estimatePairedPilotPower(
  differences: readonly number[],
  smallestEffectOfInterest: number,
  targetPower = 0.8,
  alpha = 0.05,
): PilotPower {
  if (differences.length < 2 || differences.some(value => !Number.isFinite(value))) {
    throw new Error('Pilot power requires at least two finite paired differences');
  }
  if (!(smallestEffectOfInterest > 0)) {
    throw new Error('smallestEffectOfInterest must be positive');
  }
  const sd = standardDeviation([...differences]);
  const zAlpha = inverseNormalCDF(1 - alpha / 2);
  const zPower = inverseNormalCDF(targetPower);
  const requiredPairs = sd === 0
    ? 2
    : Math.max(2, Math.ceil(((zAlpha + zPower) * sd / smallestEffectOfInterest) ** 2));
  return {
    targetPower,
    alpha,
    smallestEffectOfInterest,
    pilotPairs: differences.length,
    pilotDifferenceSd: sd,
    requiredPairs,
  };
}

export function estimatePairedSimulationPower(
  differences: readonly number[],
  smallestEffectOfInterest: number,
  options: {
    candidatePairs?: readonly number[];
    simulationsPerCandidate?: number;
    targetPower?: number;
    alpha?: number;
  } = {},
): SimulationPower {
  if (differences.length < 2 || differences.some(value => !Number.isFinite(value))) {
    throw new Error('Simulation power requires at least two finite paired differences');
  }
  if (!(smallestEffectOfInterest > 0) || !Number.isFinite(smallestEffectOfInterest)) {
    throw new Error('smallestEffectOfInterest must be finite and positive');
  }
  const candidatePairs = [...(options.candidatePairs
    ?? [8, 12, 16, 24, 32, 50, 75, 100, 150, 200])]
    .filter((value, index, values) =>
      Number.isInteger(value) && value >= 2 && values.indexOf(value) === index
    )
    .sort((left, right) => left - right);
  if (candidatePairs.length === 0) throw new Error('At least one candidate sample size is required');
  const simulations = options.simulationsPerCandidate ?? 2_000;
  if (!Number.isInteger(simulations) || simulations < 100) {
    throw new Error('simulationsPerCandidate must be an integer of at least 100');
  }
  const targetPower = options.targetPower ?? 0.8;
  const alpha = options.alpha ?? 0.05;
  if (!(targetPower > 0 && targetPower < 1)) throw new Error('targetPower must be between zero and one');
  if (!(alpha > 0 && alpha < 1)) throw new Error('alpha must be between zero and one');

  const pilotMean = mean([...differences]);
  const residuals = differences.map(value => value - pilotMean);
  let state = 0x243f6a88;
  const random = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  const candidatePower = candidatePairs.map(pairs => {
    const critical = tCritical(1 - alpha / 2, pairs - 1);
    let rejected = 0;
    const values = new Array<number>(pairs);
    for (let simulation = 0; simulation < simulations; simulation++) {
      for (let index = 0; index < pairs; index++) {
        values[index] = smallestEffectOfInterest
          + residuals[Math.floor(random() * residuals.length)];
      }
      const estimate = mean(values);
      const sd = standardDeviation(values);
      const statistic = sd === 0
        ? (estimate === 0 ? 0 : Infinity)
        : Math.abs(estimate / (sd / Math.sqrt(pairs)));
      if (statistic >= critical) rejected++;
    }
    return { pairs, power: rejected / simulations };
  });
  return {
    method: 'empirical_residual_paired_t_monte_carlo',
    alpha,
    targetPower,
    smallestEffectOfInterest,
    simulationsPerCandidate: simulations,
    candidatePower,
    requiredPairs: candidatePower.find(result => result.power >= targetPower)?.pairs ?? null,
  };
}

function indexCondition(
  observations: readonly AnalysisObservation[],
  condition: string,
): Map<number, AnalysisObservation> {
  const indexed = new Map<number, AnalysisObservation>();
  for (const observation of observations.filter(item => item.condition === condition)) {
    if (indexed.has(observation.seed)) {
      throw new Error(`Duplicate experimental unit: condition=${condition}, seed=${observation.seed}`);
    }
    indexed.set(observation.seed, observation);
  }
  return indexed;
}

function bootstrapMeanInterval(values: number[], samples: number): Interval {
  if (!Number.isInteger(samples) || samples < 100) {
    throw new Error('bootstrapSamples must be an integer of at least 100');
  }
  let state = 0x9e3779b9;
  const random = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  const estimates = new Array<number>(samples);
  for (let sample = 0; sample < samples; sample++) {
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[Math.floor(random() * values.length)];
    }
    estimates[sample] = sum / values.length;
  }
  return {
    lower: percentile(estimates, 2.5),
    upper: percentile(estimates, 97.5),
    level: 0.95,
  };
}

function signFlipTest(values: number[]): number {
  const observed = Math.abs(mean(values));
  const exact = values.length <= 20;
  const samples = exact ? 2 ** values.length : 100_000;
  let state = 0x85ebca6b;
  let extreme = 0;
  for (let sample = 0; sample < samples; sample++) {
    let sum = 0;
    for (let index = 0; index < values.length; index++) {
      let positive: boolean;
      if (exact) {
        positive = ((sample >>> index) & 1) === 1;
      } else {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        positive = (state >>> 0) / 0x1_0000_0000 >= 0.5;
      }
      sum += positive ? values[index] : -values[index];
    }
    if (Math.abs(sum / values.length) >= observed - 1e-15) extreme++;
  }
  return exact ? extreme / samples : (extreme + 1) / (samples + 1);
}

function tCritical(probability: number, degreesOfFreedom: number): number {
  let low = 0;
  let high = 20;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (tDistributionCDF(mid, degreesOfFreedom) < probability) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function inverseNormalCDF(probability: number): number {
  let low = -10;
  let high = 10;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const cdf = 0.5 * (1 + erf(mid / Math.SQRT2));
    if (cdf < probability) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1
    - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
      + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function encodeFactors(
  observations: readonly AnalysisObservation[],
  factorNames: string[],
): { rows: number[][]; termNames: string[]; sourceFactors: string[] } {
  const columns: Array<(observation: AnalysisObservation) => number> = [];
  const termNames: string[] = [];
  const sourceFactors: string[] = [];
  for (const factor of factorNames) {
    const values = observations.map(item => item.factors?.[factor]);
    if (values.some(value => value === undefined)) {
      throw new Error(`Factor ${factor} is missing from one or more observations`);
    }
    if (values.every(value => typeof value === 'number')) {
      const center = mean(values as number[]);
      columns.push(item => Number(item.factors![factor]) - center);
      termNames.push(factor);
      sourceFactors.push(factor);
    } else {
      const levels = [...new Set(values.map(String))].sort();
      if (levels.length < 2) throw new Error(`Factor ${factor} has fewer than two levels`);
      for (const level of levels.slice(1)) {
        columns.push(item => String(item.factors![factor]) === level ? 1 : 0);
        termNames.push(`${factor}[${level}]`);
        sourceFactors.push(factor);
      }
    }
  }
  return {
    rows: observations.map(item => columns.map(column => column(item))),
    termNames,
    sourceFactors,
  };
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, column) => matrix.map(row => row[column]));
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const bt = transpose(b);
  return a.map(row => bt.map(column => dot(row, column)));
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => dot(row, vector));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  if (matrix.some(row => row.length !== n)) throw new Error('Matrix must be square');
  const augmented = matrix.map((row, index) => [
    ...row,
    ...Array.from({ length: n }, (_, column) => index === column ? 1 : 0),
  ]);
  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) {
      throw new Error('Factorial design matrix is singular');
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map(value => value / divisor);
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const multiple = augmented[row][column];
      augmented[row] = augmented[row].map(
        (value, index) => value - multiple * augmented[column][index]
      );
    }
  }
  return augmented.map(row => row.slice(n));
}

function skewness(values: number[]): number {
  const sd = standardDeviation(values, false);
  if (sd === 0) return 0;
  const center = mean(values);
  return mean(values.map(value => ((value - center) / sd) ** 3));
}

function weightedMean(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  return values.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight;
}
