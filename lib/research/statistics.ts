/**
 * Statistical Utilities for Academic Rigor
 *
 * Provides confidence intervals, effect sizes, significance tests,
 * and power analysis for ensuring statistically valid results.
 */

// =============================================================================
// BASIC STATISTICS
// =============================================================================

/**
 * Calculate mean of an array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate variance (sample variance by default)
 */
export function variance(values: number[], sample = true): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sumSquares = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0);
  return sumSquares / (sample ? values.length - 1 : values.length);
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[], sample = true): number {
  return Math.sqrt(variance(values, sample));
}

/**
 * Calculate standard error of the mean
 */
export function standardError(values: number[]): number {
  if (values.length === 0) return 0;
  return standardDeviation(values) / Math.sqrt(values.length);
}

/**
 * Calculate median
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate percentile
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculate interquartile range (IQR)
 */
export function interquartileRange(values: number[]): number {
  if (values.length === 0) return 0;
  return percentile(values, 75) - percentile(values, 25);
}

// =============================================================================
// T-DISTRIBUTION (for confidence intervals with small samples)
// =============================================================================

/**
 * Approximate t-distribution critical values
 * For df >= 30, approximates normal distribution
 */
function tCritical(df: number, alpha: number = 0.05): number {
  // Two-tailed critical values for common alpha levels
  // These are pre-computed approximations
  const tTable: Record<number, Record<number, number>> = {
    0.10: { 1: 6.314, 2: 2.920, 3: 2.353, 4: 2.132, 5: 2.015, 10: 1.812, 20: 1.725, 30: 1.697 },
    0.05: { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 10: 2.228, 20: 2.086, 30: 2.042 },
    0.01: { 1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032, 10: 3.169, 20: 2.845, 30: 2.750 },
  };

  const alphaKey = alpha as keyof typeof tTable;
  const table = tTable[alphaKey] || tTable[0.05];

  // Find closest df value
  const dfs = Object.keys(table).map(Number).sort((a, b) => a - b);
  let closestDf = dfs[dfs.length - 1];
  for (const d of dfs) {
    if (d >= df) {
      closestDf = d;
      break;
    }
  }

  // For large df, use normal approximation
  if (df >= 30) {
    return alpha === 0.05 ? 1.96 : alpha === 0.01 ? 2.576 : 1.645;
  }

  return table[closestDf] || 1.96;
}

// =============================================================================
// CONFIDENCE INTERVALS
// =============================================================================

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;  // e.g., 0.95 for 95% CI
}

/**
 * Calculate confidence interval for the mean
 * Uses t-distribution for small samples (n < 30)
 */
export function confidenceInterval(
  values: number[],
  level: number = 0.95
): ConfidenceInterval {
  if (values.length < 2) {
    return { lower: values[0] || 0, upper: values[0] || 0, level };
  }

  const m = mean(values);
  const se = standardError(values);
  const df = values.length - 1;
  const alpha = 1 - level;
  const t = tCritical(df, alpha);

  return {
    lower: m - t * se,
    upper: m + t * se,
    level,
  };
}

/**
 * Bootstrap confidence interval (more robust for non-normal distributions)
 */
export function bootstrapConfidenceInterval(
  values: number[],
  level: number = 0.95,
  nBootstrap: number = 1000,
  seed?: number
): ConfidenceInterval {
  if (values.length < 2) {
    return { lower: values[0] || 0, upper: values[0] || 0, level };
  }

  // Simple seeded random for reproducibility
  let random = seed !== undefined
    ? () => {
        seed = (seed! * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      }
    : Math.random;

  const bootstrapMeans: number[] = [];

  for (let i = 0; i < nBootstrap; i++) {
    // Resample with replacement
    const sample: number[] = [];
    for (let j = 0; j < values.length; j++) {
      sample.push(values[Math.floor(random() * values.length)]);
    }
    bootstrapMeans.push(mean(sample));
  }

  bootstrapMeans.sort((a, b) => a - b);

  const alpha = 1 - level;
  const lowerIndex = Math.floor((alpha / 2) * nBootstrap);
  const upperIndex = Math.floor((1 - alpha / 2) * nBootstrap);

  return {
    lower: bootstrapMeans[lowerIndex],
    upper: bootstrapMeans[upperIndex],
    level,
  };
}

// =============================================================================
// EFFECT SIZE
// =============================================================================

export interface EffectSize {
  cohensD: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large' | 'very_large';
}

/**
 * Calculate Cohen's d effect size between two groups
 * Positive d means group1 > group2
 */
export function cohensD(group1: number[], group2: number[]): EffectSize {
  if (group1.length < 2 || group2.length < 2) {
    return { cohensD: 0, interpretation: 'negligible' };
  }

  const m1 = mean(group1);
  const m2 = mean(group2);
  const v1 = variance(group1);
  const v2 = variance(group2);

  // Pooled standard deviation
  const pooledStd = Math.sqrt(
    ((group1.length - 1) * v1 + (group2.length - 1) * v2) /
    (group1.length + group2.length - 2)
  );

  if (pooledStd === 0) {
    return { cohensD: 0, interpretation: 'negligible' };
  }

  const d = (m1 - m2) / pooledStd;

  // Interpret effect size
  const absD = Math.abs(d);
  let interpretation: EffectSize['interpretation'];
  if (absD < 0.2) interpretation = 'negligible';
  else if (absD < 0.5) interpretation = 'small';
  else if (absD < 0.8) interpretation = 'medium';
  else if (absD < 1.2) interpretation = 'large';
  else interpretation = 'very_large';

  return { cohensD: d, interpretation };
}

// =============================================================================
// STATISTICAL SIGNIFICANCE TESTS
// =============================================================================

export interface TTestResult {
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  significant: boolean;
  alpha: number;
}

/**
 * Approximate p-value from t-statistic using normal approximation for large df
 * For smaller df, this is a rough approximation
 */
function approximatePValue(t: number, df: number): number {
  // Use normal approximation for large df
  // For small df, this underestimates p-values slightly
  const absT = Math.abs(t);

  // Approximation using error function
  // P(|T| > t) ≈ 2 * (1 - Φ(t)) for large df
  // Using approximation: Φ(x) ≈ 1 - 0.5 * exp(-0.7179 * x^2)

  if (df >= 30) {
    // Normal approximation
    const p = 2 * 0.5 * Math.exp(-0.5 * absT * absT);
    return Math.min(1, Math.max(0, p));
  }

  // Rough adjustment for smaller df (wider tails)
  const adjustment = 1 + (1 / df);
  const adjustedP = 2 * 0.5 * Math.exp(-0.5 * (absT / adjustment) * (absT / adjustment));
  return Math.min(1, Math.max(0, adjustedP));
}

/**
 * Independent samples t-test (Welch's t-test for unequal variances)
 */
export function independentTTest(
  group1: number[],
  group2: number[],
  alpha: number = 0.05
): TTestResult {
  if (group1.length < 2 || group2.length < 2) {
    return {
      tStatistic: 0,
      degreesOfFreedom: 0,
      pValue: 1,
      significant: false,
      alpha,
    };
  }

  const m1 = mean(group1);
  const m2 = mean(group2);
  const v1 = variance(group1);
  const v2 = variance(group2);
  const n1 = group1.length;
  const n2 = group2.length;

  // Welch's t-statistic
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) {
    return {
      tStatistic: 0,
      degreesOfFreedom: n1 + n2 - 2,
      pValue: 1,
      significant: false,
      alpha,
    };
  }

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const num = Math.pow(v1 / n1 + v2 / n2, 2);
  const denom =
    Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
  const df = denom > 0 ? num / denom : n1 + n2 - 2;

  const pValue = approximatePValue(t, df);

  return {
    tStatistic: t,
    degreesOfFreedom: df,
    pValue,
    significant: pValue < alpha,
    alpha,
  };
}

/**
 * One-way ANOVA for comparing multiple groups
 */
export interface AnovaResult {
  fStatistic: number;
  dfBetween: number;
  dfWithin: number;
  pValue: number;
  significant: boolean;
  alpha: number;
}

export function oneWayAnova(groups: number[][], alpha: number = 0.05): AnovaResult {
  const k = groups.length;
  const allValues = groups.flat();
  const N = allValues.length;

  if (k < 2 || N < k + 1) {
    return {
      fStatistic: 0,
      dfBetween: k - 1,
      dfWithin: N - k,
      pValue: 1,
      significant: false,
      alpha,
    };
  }

  const grandMean = mean(allValues);

  // Sum of squares between groups
  let ssBetween = 0;
  for (const group of groups) {
    const groupMean = mean(group);
    ssBetween += group.length * Math.pow(groupMean - grandMean, 2);
  }

  // Sum of squares within groups
  let ssWithin = 0;
  for (const group of groups) {
    const groupMean = mean(group);
    for (const value of group) {
      ssWithin += Math.pow(value - groupMean, 2);
    }
  }

  const dfBetween = k - 1;
  const dfWithin = N - k;

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  const f = msWithin > 0 ? msBetween / msWithin : 0;

  // Approximate p-value for F distribution
  // Using Fisher's approximation for large df
  const pValue = approximateFPValue(f, dfBetween, dfWithin);

  return {
    fStatistic: f,
    dfBetween,
    dfWithin,
    pValue,
    significant: pValue < alpha,
    alpha,
  };
}

function approximateFPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;

  // Rough approximation using chi-square relationship
  // For large df2, F * df1 ≈ chi-square(df1)
  // Using normal approximation for chi-square: sqrt(2*X) ≈ sqrt(2*df) + z

  const x = f * df1;
  const z = Math.sqrt(2 * x) - Math.sqrt(2 * df1 - 1);

  // Convert z to p-value (one-tailed for F-test)
  const p = 0.5 * Math.exp(-0.5 * z * z);
  return Math.min(1, Math.max(0, p));
}

// =============================================================================
// POWER ANALYSIS & SAMPLE SIZE
// =============================================================================

export interface PowerAnalysis {
  recommendedRuns: number;
  currentPower: number;
  minimumEffectDetectable: number;
  explanation: string;
}

/**
 * Estimate statistical power and recommend sample size
 * Based on detecting a medium effect size (Cohen's d = 0.5) with 80% power
 */
export function powerAnalysis(
  currentN: number,
  observedStd: number,
  desiredEffectSize: number = 0.5,
  desiredPower: number = 0.8,
  alpha: number = 0.05
): PowerAnalysis {
  // For a two-sample t-test comparing means
  // n per group ≈ 2 * ((z_α/2 + z_β) / d)^2
  // where d is Cohen's d effect size

  // z values for common power/alpha levels
  const zAlpha2 = alpha === 0.05 ? 1.96 : alpha === 0.01 ? 2.576 : 1.645;
  const zBeta = desiredPower === 0.8 ? 0.84 : desiredPower === 0.9 ? 1.28 : 0.52;

  const recommendedN = Math.ceil(2 * Math.pow((zAlpha2 + zBeta) / desiredEffectSize, 2));

  // Estimate current power
  // power ≈ Φ(|d|*sqrt(n/2) - z_α/2)
  const currentNonCentrality = desiredEffectSize * Math.sqrt(currentN / 2);
  const currentPower = Math.min(0.99, 0.5 * (1 + Math.tanh((currentNonCentrality - zAlpha2) / 1.5)));

  // Minimum detectable effect with current n and 80% power
  const minEffect = (zAlpha2 + zBeta) / Math.sqrt(currentN / 2);

  let explanation: string;
  if (currentN >= recommendedN) {
    explanation = `Sample size of ${currentN} runs is adequate for detecting a ${desiredEffectSize.toFixed(2)} effect size with ${(desiredPower * 100).toFixed(0)}% power.`;
  } else {
    explanation = `Current sample size of ${currentN} runs has ~${(currentPower * 100).toFixed(0)}% power. ` +
      `Recommend ${recommendedN} runs to detect a ${desiredEffectSize.toFixed(2)} effect size with ${(desiredPower * 100).toFixed(0)}% power.`;
  }

  return {
    recommendedRuns: recommendedN,
    currentPower,
    minimumEffectDetectable: minEffect,
    explanation,
  };
}

// =============================================================================
// COMPREHENSIVE STATISTICAL ANALYSIS
// =============================================================================

export interface StatisticalAnalysis {
  // Basic statistics
  n: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;

  // Confidence intervals
  ci95: ConfidenceInterval;
  ci99: ConfidenceInterval;
  bootstrapCi95?: ConfidenceInterval;
  bootstrapCi99?: ConfidenceInterval;

  // Standard error
  standardError: number;

  // Distribution shape
  skewness: number;
  iqr: number;

  // Sample quality
  coefficientOfVariation: number;  // std/mean - lower is more consistent
}

/**
 * Perform comprehensive statistical analysis on a set of values
 */
export function analyzeDistribution(values: number[]): StatisticalAnalysis {
  const m = mean(values);
  const std = standardDeviation(values);
  const se = standardError(values);

  // Calculate skewness
  let skewness = 0;
  if (values.length >= 3 && std > 0) {
    const n = values.length;
    const skewSum = values.reduce((sum, v) => sum + Math.pow((v - m) / std, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * skewSum;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const iqr = interquartileRange(values);
  const useBootstrap = Math.abs(skewness) > 1 || values.length < 30;
  const bootstrapSeed = seedFromValues(values);

  return {
    n: values.length,
    mean: m,
    median: median(values),
    std,
    min: sorted[0] || 0,
    max: sorted[sorted.length - 1] || 0,
    ci95: confidenceInterval(values, 0.95),
    ci99: confidenceInterval(values, 0.99),
    bootstrapCi95: useBootstrap ? bootstrapConfidenceInterval(values, 0.95, 800, bootstrapSeed) : undefined,
    bootstrapCi99: useBootstrap ? bootstrapConfidenceInterval(values, 0.99, 800, bootstrapSeed + 11) : undefined,
    standardError: se,
    skewness,
    iqr,
    coefficientOfVariation: m !== 0 ? std / Math.abs(m) : 0,
  };
}

function seedFromValues(values: number[]): number {
  let hash = values.length || 1;
  for (const value of values) {
    const scaled = Math.round(value * 1e6);
    hash = (hash * 31 + scaled) | 0;
  }
  return Math.max(1, Math.abs(hash));
}

/**
 * Compare two groups with full statistical analysis
 */
export interface GroupComparison {
  group1Stats: StatisticalAnalysis;
  group2Stats: StatisticalAnalysis;
  tTest: TTestResult;
  effectSize: EffectSize;
  powerAnalysis: PowerAnalysis;
  conclusion: string;
}

export function compareGroups(
  group1: number[],
  group2: number[],
  group1Label: string = 'Group 1',
  group2Label: string = 'Group 2',
  alpha: number = 0.05
): GroupComparison {
  const stats1 = analyzeDistribution(group1);
  const stats2 = analyzeDistribution(group2);
  const tTest = independentTTest(group1, group2, alpha);
  const effect = cohensD(group1, group2);

  // Pool std for power analysis
  const pooledStd = Math.sqrt(
    ((group1.length - 1) * Math.pow(stats1.std, 2) + (group2.length - 1) * Math.pow(stats2.std, 2)) /
    (group1.length + group2.length - 2)
  );

  const power = powerAnalysis(
    Math.min(group1.length, group2.length),
    pooledStd
  );

  // Generate conclusion
  let conclusion: string;
  if (tTest.significant) {
    const direction = stats1.mean > stats2.mean ? 'higher' : 'lower';
    conclusion = `${group1Label} (M=${stats1.mean.toFixed(3)}, SD=${stats1.std.toFixed(3)}) ` +
      `is significantly ${direction} than ${group2Label} (M=${stats2.mean.toFixed(3)}, SD=${stats2.std.toFixed(3)}), ` +
      `t(${tTest.degreesOfFreedom.toFixed(1)})=${tTest.tStatistic.toFixed(2)}, p=${tTest.pValue.toFixed(4)}, ` +
      `d=${effect.cohensD.toFixed(2)} (${effect.interpretation} effect).`;
  } else {
    conclusion = `No significant difference between ${group1Label} (M=${stats1.mean.toFixed(3)}, SD=${stats1.std.toFixed(3)}) ` +
      `and ${group2Label} (M=${stats2.mean.toFixed(3)}, SD=${stats2.std.toFixed(3)}), ` +
      `t(${tTest.degreesOfFreedom.toFixed(1)})=${tTest.tStatistic.toFixed(2)}, p=${tTest.pValue.toFixed(4)}. ` +
      power.explanation;
  }

  return {
    group1Stats: stats1,
    group2Stats: stats2,
    tTest,
    effectSize: effect,
    powerAnalysis: power,
    conclusion,
  };
}
