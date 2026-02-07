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
// PROPER DISTRIBUTION CDFs
// =============================================================================

/**
 * Standard normal CDF using Abramowitz & Stegun rational approximation (7.1.26)
 * Maximum error: 7.5e-8
 */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Natural log of the gamma function using Lanczos approximation
 */
function lnGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Regularized incomplete beta function I_x(a, b) using Lentz continued fraction
 */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use symmetry relation for better convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(1 - x, b, a);
  }

  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  // Lentz continued fraction
  const maxIter = 200;
  const eps = 1e-14;
  let f = 1;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  f = d;

  for (let m = 1; m <= maxIter; m++) {
    // Even step
    let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + numerator / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    f *= c * d;

    // Odd step
    numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + numerator / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1) < eps) break;
  }

  return front * f;
}

/**
 * Student's t-distribution CDF using regularized incomplete beta
 */
export function tDistributionCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ibeta = regularizedIncompleteBeta(x, df / 2, 0.5);
  if (t >= 0) {
    return 1 - 0.5 * ibeta;
  } else {
    return 0.5 * ibeta;
  }
}

/**
 * F-distribution CDF using regularized incomplete beta
 */
export function fDistributionCDF(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;
  const x = (df1 * f) / (df1 * f + df2);
  return regularizedIncompleteBeta(x, df1 / 2, df2 / 2);
}

/**
 * Two-tailed p-value from t-distribution
 */
function tTestPValue(t: number, df: number): number {
  const cdf = tDistributionCDF(Math.abs(t), df);
  return 2 * (1 - cdf);
}

/**
 * One-tailed p-value from F-distribution (right tail)
 */
function fTestPValue(f: number, df1: number, df2: number): number {
  return 1 - fDistributionCDF(f, df1, df2);
}

/**
 * t-distribution critical value via Newton-Raphson inversion of t-CDF
 * Returns the two-tailed critical value for the given alpha
 */
function tCritical(df: number, alpha: number = 0.05): number {
  // We want t such that P(|T| > t) = alpha, i.e., CDF(t) = 1 - alpha/2
  const target = 1 - alpha / 2;

  // Initial guess from normal approximation
  // Inverse normal approximation (Beasley-Springer-Moro)
  let t = 1.96; // default for alpha=0.05
  if (alpha === 0.01) t = 2.576;
  else if (alpha === 0.10) t = 1.645;

  // Newton-Raphson refinement
  for (let iter = 0; iter < 20; iter++) {
    const cdf = tDistributionCDF(t, df);
    const err = cdf - target;
    if (Math.abs(err) < 1e-10) break;

    // PDF of t-distribution for the derivative
    const lnPdf = lnGamma((df + 1) / 2) - lnGamma(df / 2)
      - 0.5 * Math.log(df * Math.PI)
      - ((df + 1) / 2) * Math.log(1 + t * t / df);
    const pdf = Math.exp(lnPdf);
    if (pdf < 1e-15) break;

    t -= err / pdf;
    if (t < 0) t = 0.01;
  }

  return t;
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
  nBootstrap: number = 10000,
  seed?: number
): ConfidenceInterval {
  if (values.length < 2) {
    return { lower: values[0] || 0, upper: values[0] || 0, level };
  }

  // xorshift128+ PRNG for better statistical properties than LCG
  let random: () => number;
  if (seed !== undefined) {
    // Use bitwise operations to avoid float precision loss
    let s0 = (seed ^ 0xDEADBEEF) >>> 0 || 1;
    let s1 = (seed * 2654435761) >>> 0 || 1; // Knuth's multiplicative hash, stays in 32-bit range
    random = () => {
      let x = s0;
      const y = s1;
      s0 = y;
      x ^= x << 23;
      x ^= x >> 17;
      x ^= y;
      x ^= y >> 26;
      s1 = x;
      // Convert to [0, 1) using unsigned 32-bit
      return ((s0 + s1) >>> 0) / 4294967296;
    };
  } else {
    random = Math.random;
  }

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
 * Proper two-tailed p-value from t-statistic using t-distribution CDF
 */
function approximatePValue(t: number, df: number): number {
  return tTestPValue(t, df);
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
  variancesHomogeneous?: boolean;
  varianceRatio?: number;
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

  // Check variance homogeneity (simplified Levene's-like check)
  const groupVariances = groups.map(g => {
    const m = g.reduce((s, v) => s + v, 0) / g.length;
    return g.reduce((s, v) => s + (v - m) ** 2, 0) / (g.length - 1);
  });
  const maxVar = Math.max(...groupVariances);
  const minVar = Math.min(...groupVariances.filter(v => v > 0));
  const varianceRatio = minVar > 0 ? maxVar / minVar : Infinity;
  const variancesHomogeneous = varianceRatio < 4; // Rule of thumb: ratio < 4 is acceptable

  return {
    fStatistic: f,
    dfBetween,
    dfWithin,
    pValue,
    significant: pValue < alpha,
    alpha,
    variancesHomogeneous,
    varianceRatio,
  };
}

function approximateFPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  return fTestPValue(f, df1, df2);
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
  // Approximate power using normal CDF approximation
  const delta = currentNonCentrality - zAlpha2;
  const currentPower = Math.min(0.999, Math.max(0.001, normalCDF(delta)));

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

// =============================================================================
// MULTIPLE COMPARISON CORRECTION
// =============================================================================

/**
 * Benjamini-Hochberg procedure for controlling the false discovery rate (FDR).
 * Returns adjusted p-values.
 */
export function benjaminiHochberg(pValues: number[]): number[] {
  const n = pValues.length;
  if (n === 0) return [];

  // Create index-value pairs and sort by p-value
  const indexed = pValues.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p - b.p);

  // Apply BH correction: adjusted_p[k] = p[k] * n / (k+1)
  const adjusted = new Array<number>(n);
  let cumMin = 1;
  for (let k = n - 1; k >= 0; k--) {
    const corrected = indexed[k].p * n / (k + 1);
    cumMin = Math.min(cumMin, corrected);
    adjusted[indexed[k].i] = Math.min(cumMin, 1);
  }

  return adjusted;
}

/**
 * Bonferroni correction for multiple comparisons.
 * More conservative than BH but controls family-wise error rate (FWER).
 */
export function bonferroniCorrection(pValues: number[]): number[] {
  const n = pValues.length;
  return pValues.map(p => Math.min(p * n, 1));
}

// =============================================================================
// LINEAR REGRESSION
// =============================================================================

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  standardErrorSlope: number;
  standardErrorIntercept: number;
  tStatisticSlope: number;
  pValueSlope: number;
  fStatistic: number;
  pValueF: number;
  residuals: number[];
  predicted: number[];
  n: number;
}

/**
 * Simple linear regression: y = a + bx
 * Returns comprehensive regression statistics including R², t-tests, and F-test
 */
export function linearRegression(x: number[], y: number[]): RegressionResult {
  const n = x.length;

  if (n < 3 || x.length !== y.length) {
    return {
      slope: 0, intercept: 0, rSquared: 0, adjustedRSquared: 0,
      standardErrorSlope: 0, standardErrorIntercept: 0,
      tStatisticSlope: 0, pValueSlope: 1, fStatistic: 0, pValueF: 1,
      residuals: [], predicted: [], n: 0
    };
  }

  const meanX = mean(x);
  const meanY = mean(y);

  // Calculate slope and intercept
  let sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumXY += (x[i] - meanX) * (y[i] - meanY);
    sumXX += (x[i] - meanX) * (x[i] - meanX);
  }

  const slope = sumXX > 0 ? sumXY / sumXX : 0;
  const intercept = meanY - slope * meanX;

  // Calculate predicted values and residuals
  const predicted = x.map(xi => intercept + slope * xi);
  const residuals = y.map((yi, i) => yi - predicted[i]);

  // Sum of squares
  const ssTotal = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r ** 2, 0);
  const ssRegression = ssTotal - ssResidual;

  // R-squared and adjusted R-squared
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  const adjustedRSquared = 1 - (1 - rSquared) * (n - 1) / (n - 2);

  // Mean squared error
  const mse = ssResidual / (n - 2);
  const rmse = Math.sqrt(mse);

  // Handle perfect fit (mse ≈ 0): relationship is infinitely significant
  const isPerfectFit = mse < 1e-14 && ssRegression > 0;

  // Standard errors
  const standardErrorSlope = sumXX > 0 ? rmse / Math.sqrt(sumXX) : 0;
  const standardErrorIntercept = sumXX > 0 ? rmse * Math.sqrt(1/n + meanX**2 / sumXX) : 0;

  // t-statistic for slope
  // For perfect fits, t-statistic is effectively infinite → p-value = 0
  let tStatisticSlope: number;
  let pValueSlope: number;
  if (isPerfectFit) {
    tStatisticSlope = Infinity;
    pValueSlope = 0;
  } else {
    tStatisticSlope = standardErrorSlope > 0 ? slope / standardErrorSlope : 0;
    pValueSlope = tTestPValue(tStatisticSlope, n - 2);
  }

  // F-statistic (for simple regression, F = t²)
  const msRegression = ssRegression / 1;  // df_regression = 1 for simple regression
  let fStatistic: number;
  let pValueF: number;
  if (isPerfectFit) {
    fStatistic = Infinity;
    pValueF = 0;
  } else {
    fStatistic = mse > 0 ? msRegression / mse : 0;
    pValueF = fTestPValue(fStatistic, 1, n - 2);
  }

  return {
    slope, intercept, rSquared, adjustedRSquared,
    standardErrorSlope, standardErrorIntercept,
    tStatisticSlope, pValueSlope,
    fStatistic, pValueF,
    residuals, predicted, n
  };
}

// =============================================================================
// EFFECT SIZES FOR ANOVA
// =============================================================================

export interface AnovaEffectSizes {
  etaSquared: number;           // SS_between / SS_total
  omegaSquared: number;         // Less biased estimate
  interpretation: string;
}

/**
 * Calculate eta-squared and omega-squared effect sizes for ANOVA
 * η² = SS_between / SS_total (proportion of variance explained)
 * ω² = (SS_between - df_between * MS_within) / (SS_total + MS_within)
 */
export function anovaEffectSizes(groups: number[][]): AnovaEffectSizes {
  const k = groups.length;
  const allValues = groups.flat();
  const N = allValues.length;

  if (k < 2 || N < k + 1) {
    return { etaSquared: 0, omegaSquared: 0, interpretation: 'insufficient data' };
  }

  const grandMean = mean(allValues);

  // Sum of squares between groups
  let ssBetween = 0;
  for (const group of groups) {
    const groupMean = mean(group);
    ssBetween += group.length * (groupMean - grandMean) ** 2;
  }

  // Sum of squares within groups
  let ssWithin = 0;
  for (const group of groups) {
    const groupMean = mean(group);
    for (const value of group) {
      ssWithin += (value - groupMean) ** 2;
    }
  }

  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msWithin = ssWithin / dfWithin;

  // Eta-squared
  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0;

  // Omega-squared (less biased)
  const omegaSquared = ssTotal > 0
    ? (ssBetween - dfBetween * msWithin) / (ssTotal + msWithin)
    : 0;

  // Interpretation (Cohen's conventions for eta-squared)
  let interpretation: string;
  if (etaSquared < 0.01) interpretation = 'negligible';
  else if (etaSquared < 0.06) interpretation = 'small';
  else if (etaSquared < 0.14) interpretation = 'medium';
  else interpretation = 'large';

  return { etaSquared, omegaSquared: Math.max(0, omegaSquared), interpretation };
}

// =============================================================================
// KRUSKAL-WALLIS TEST (Non-parametric ANOVA alternative)
// =============================================================================

/**
 * Chi-squared distribution CDF using regularized incomplete gamma
 */
function chiSquaredCDF(x: number, k: number): number {
  if (x <= 0) return 0;
  // Chi-squared is a special case of gamma distribution
  // CDF = regularized incomplete gamma function P(k/2, x/2)
  return regularizedIncompleteGamma(k / 2, x / 2);
}

/**
 * Regularized incomplete gamma function P(a, x) using series expansion
 */
function regularizedIncompleteGamma(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // Use series expansion
    return gammaSeriesP(a, x);
  } else {
    // Use continued fraction and complement
    return 1 - gammaContinuedFractionQ(a, x);
  }
}

function gammaSeriesP(a: number, x: number): number {
  const maxIter = 200;
  const eps = 1e-14;

  let sum = 1 / a;
  let term = 1 / a;

  for (let n = 1; n < maxIter; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < eps * Math.abs(sum)) break;
  }

  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

function gammaContinuedFractionQ(a: number, x: number): number {
  const maxIter = 200;
  const eps = 1e-14;

  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;

  for (let n = 1; n < maxIter; n++) {
    const an = -n * (n - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < eps) break;
  }

  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

export interface KruskalWallisResult {
  hStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  significant: boolean;
  alpha: number;
}

/**
 * Kruskal-Wallis H test (non-parametric alternative to one-way ANOVA)
 * Tests whether samples originate from the same distribution.
 * Does not assume normality.
 */
export function kruskalWallis(groups: number[][], alpha: number = 0.05): KruskalWallisResult {
  const k = groups.length;
  const N = groups.reduce((sum, g) => sum + g.length, 0);

  if (k < 2 || N < k + 1) {
    return {
      hStatistic: 0,
      degreesOfFreedom: k - 1,
      pValue: 1,
      significant: false,
      alpha
    };
  }

  // Combine all values with group labels and sort by value
  const combined: Array<{ value: number; group: number }> = [];
  groups.forEach((group, groupIdx) => {
    group.forEach(value => combined.push({ value, group: groupIdx }));
  });
  combined.sort((a, b) => a.value - b.value);

  // Assign ranks (handling ties by averaging)
  const ranks: number[] = new Array(N);
  let i = 0;
  while (i < N) {
    let j = i;
    // Find all tied values
    while (j < N && combined[j].value === combined[i].value) j++;
    // Average rank for tied values
    const avgRank = (i + j + 1) / 2;  // 1-based ranks
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }
    i = j;
  }

  // Calculate sum of ranks for each group
  const rankSums: number[] = new Array(k).fill(0);
  const groupSizes: number[] = groups.map(g => g.length);

  let rankIdx = 0;
  for (const item of combined) {
    rankSums[item.group] += ranks[rankIdx++];
  }

  // Calculate H statistic
  let sumTerm = 0;
  for (let g = 0; g < k; g++) {
    if (groupSizes[g] > 0) {
      sumTerm += (rankSums[g] ** 2) / groupSizes[g];
    }
  }

  const H = (12 / (N * (N + 1))) * sumTerm - 3 * (N + 1);

  // Tie correction factor
  let tieCorrection = 1;
  i = 0;
  while (i < N) {
    let j = i;
    while (j < N && combined[j].value === combined[i].value) j++;
    const t = j - i;  // Number of tied values
    if (t > 1) {
      tieCorrection -= (t ** 3 - t) / (N ** 3 - N);
    }
    i = j;
  }

  const correctedH = tieCorrection > 0 ? H / tieCorrection : H;
  const df = k - 1;
  const pValue = 1 - chiSquaredCDF(correctedH, df);

  return {
    hStatistic: correctedH,
    degreesOfFreedom: df,
    pValue,
    significant: pValue < alpha,
    alpha
  };
}

// =============================================================================
// TUKEY HSD POST-HOC TEST
// =============================================================================

export interface TukeyHSDResult {
  comparisons: Array<{
    group1: number;
    group2: number;
    meanDiff: number;
    standardError: number;
    qStatistic: number;
    pValue: number;
    significant: boolean;
    ci95: { lower: number; upper: number };
  }>;
  alpha: number;
}

/**
 * Tukey's Honestly Significant Difference (HSD) test for post-hoc pairwise comparisons
 * Used after significant ANOVA to determine which groups differ
 */
export function tukeyHSD(groups: number[][], alpha: number = 0.05): TukeyHSDResult {
  const k = groups.length;
  const N = groups.reduce((sum, g) => sum + g.length, 0);
  const dfWithin = N - k;

  // Calculate MSE (mean square error within groups)
  let ssWithin = 0;
  for (const group of groups) {
    const groupMean = mean(group);
    for (const value of group) {
      ssWithin += (value - groupMean) ** 2;
    }
  }
  const mse = ssWithin / dfWithin;
  const rmse = Math.sqrt(mse);

  const groupMeans = groups.map(g => mean(g));
  const comparisons: TukeyHSDResult['comparisons'] = [];

  // All pairwise comparisons
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const ni = groups[i].length;
      const nj = groups[j].length;
      const meanDiff = groupMeans[i] - groupMeans[j];

      // Standard error for unequal sample sizes (Tukey-Kramer)
      const se = rmse * Math.sqrt(0.5 * (1/ni + 1/nj));

      // q statistic (studentized range)
      const q = Math.abs(meanDiff) / se;

      // Approximate p-value using the studentized range distribution
      // For computational simplicity, we use a conservative approximation
      // based on the relationship q ≈ √2 * t for large df
      const approxT = q / Math.sqrt(2);
      const pValue = tTestPValue(approxT, dfWithin) * k * (k - 1) / 2;  // Bonferroni-like adjustment
      const adjustedP = Math.min(1, pValue);

      // Critical value for 95% CI (approximate)
      const qCrit = tCritical(dfWithin, alpha) * Math.sqrt(2);
      const margin = qCrit * se;

      comparisons.push({
        group1: i,
        group2: j,
        meanDiff,
        standardError: se,
        qStatistic: q,
        pValue: adjustedP,
        significant: adjustedP < alpha,
        ci95: { lower: meanDiff - margin, upper: meanDiff + margin }
      });
    }
  }

  return { comparisons, alpha };
}

/**
 * Pairwise t-tests with multiple comparison correction
 * Alternative to Tukey HSD, using actual t-tests with BH correction
 */
export function pairwiseTTests(
  groups: number[][],
  alpha: number = 0.05,
  correction: 'bonferroni' | 'bh' = 'bh'
): Array<{
  group1: number;
  group2: number;
  meanDiff: number;
  tStatistic: number;
  df: number;
  rawPValue: number;
  adjustedPValue: number;
  significant: boolean;
  effectSize: EffectSize;
}> {
  const k = groups.length;
  const results: Array<{
    group1: number;
    group2: number;
    meanDiff: number;
    tStatistic: number;
    df: number;
    rawPValue: number;
    adjustedPValue: number;
    significant: boolean;
    effectSize: EffectSize;
  }> = [];

  // Perform all pairwise t-tests
  const rawPValues: number[] = [];
  const tempResults: Array<{
    group1: number;
    group2: number;
    meanDiff: number;
    tStatistic: number;
    df: number;
    rawPValue: number;
    effectSize: EffectSize;
  }> = [];

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const tTest = independentTTest(groups[i], groups[j], alpha);
      const effect = cohensD(groups[i], groups[j]);

      rawPValues.push(tTest.pValue);
      tempResults.push({
        group1: i,
        group2: j,
        meanDiff: mean(groups[i]) - mean(groups[j]),
        tStatistic: tTest.tStatistic,
        df: tTest.degreesOfFreedom,
        rawPValue: tTest.pValue,
        effectSize: effect
      });
    }
  }

  // Apply correction
  const adjustedPValues = correction === 'bonferroni'
    ? bonferroniCorrection(rawPValues)
    : benjaminiHochberg(rawPValues);

  // Combine results
  for (let i = 0; i < tempResults.length; i++) {
    results.push({
      ...tempResults[i],
      adjustedPValue: adjustedPValues[i],
      significant: adjustedPValues[i] < alpha
    });
  }

  return results;
}

// =============================================================================
// POWER ANALYSIS - DETAILED REPORT
// =============================================================================

export interface DetailedPowerAnalysis {
  // Current study
  currentN: number;
  currentPower: number;
  minimumDetectableEffect: number;

  // Recommendations
  recommendedN: {
    small: number;    // d = 0.2
    medium: number;   // d = 0.5
    large: number;    // d = 0.8
  };

  // Power at various sample sizes
  powerCurve: Array<{ n: number; power: number }>;

  // Summary
  adequateForSmallEffect: boolean;
  adequateForMediumEffect: boolean;
  adequateForLargeEffect: boolean;
}

/**
 * Comprehensive power analysis with power curves and recommendations
 */
export function detailedPowerAnalysis(
  currentN: number,
  alpha: number = 0.05,
  desiredPower: number = 0.80
): DetailedPowerAnalysis {
  const zAlpha2 = alpha === 0.05 ? 1.96 : alpha === 0.01 ? 2.576 : 1.645;
  const zBeta = desiredPower === 0.80 ? 0.84 : desiredPower === 0.90 ? 1.28 : 0.52;

  // Calculate required N for different effect sizes
  const calcRequiredN = (d: number) => Math.ceil(2 * ((zAlpha2 + zBeta) / d) ** 2);

  // Calculate power for given N and effect size
  const calcPower = (n: number, d: number) => {
    const ncp = d * Math.sqrt(n / 2);
    return Math.min(0.999, Math.max(0.001, normalCDF(ncp - zAlpha2)));
  };

  // Power curve at medium effect size
  const powerCurve: Array<{ n: number; power: number }> = [];
  const sampleSizes = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 1000];
  for (const n of sampleSizes) {
    powerCurve.push({ n, power: calcPower(n, 0.5) });
  }

  // Current power at medium effect
  const currentPower = calcPower(currentN, 0.5);

  // Minimum detectable effect at 80% power
  const minimumDetectableEffect = (zAlpha2 + zBeta) / Math.sqrt(currentN / 2);

  return {
    currentN,
    currentPower,
    minimumDetectableEffect,
    recommendedN: {
      small: calcRequiredN(0.2),
      medium: calcRequiredN(0.5),
      large: calcRequiredN(0.8)
    },
    powerCurve,
    adequateForSmallEffect: currentN >= calcRequiredN(0.2),
    adequateForMediumEffect: currentN >= calcRequiredN(0.5),
    adequateForLargeEffect: currentN >= calcRequiredN(0.8)
  };
}
