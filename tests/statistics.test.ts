/**
 * Unit tests for statistics module
 * Tests the new statistical functions: linearRegression, kruskalWallis,
 * anovaEffectSizes, tukeyHSD, pairwiseTTests, detailedPowerAnalysis
 */

import { describe, it, expect } from 'vitest';
import {
  linearRegression,
  kruskalWallis,
  anovaEffectSizes,
  tukeyHSD,
  pairwiseTTests,
  detailedPowerAnalysis,
  bonferroniCorrection,
  benjaminiHochberg,
  mean,
  variance,
  oneWayAnova,
  cohensD,
} from '../lib/research/statistics';

describe('linearRegression', () => {
  it('should compute correct slope and intercept for perfect linear data', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10]; // y = 2x
    const result = linearRegression(x, y);

    expect(result.slope).toBeCloseTo(2, 5);
    expect(result.intercept).toBeCloseTo(0, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it('should compute correct R-squared for noisy data', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2.1, 4.0, 5.9, 8.1, 10.0, 12.1, 14.0, 15.9, 18.1, 20.0];
    const result = linearRegression(x, y);

    expect(result.slope).toBeCloseTo(2, 1);
    expect(result.rSquared).toBeGreaterThan(0.99);
  });

  it('should return significant p-value for strong relationship', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = x.map(xi => 3 * xi + 5);
    const result = linearRegression(x, y);

    expect(result.pValueSlope).toBeLessThan(0.001);
    expect(result.pValueF).toBeLessThan(0.001);
  });

  it('should handle insufficient data gracefully', () => {
    const result = linearRegression([1], [2]);
    expect(result.n).toBe(0);
    expect(result.rSquared).toBe(0);
  });

  it('should compute residuals correctly', () => {
    const x = [1, 2, 3];
    const y = [2, 4, 6];
    const result = linearRegression(x, y);

    expect(result.residuals).toHaveLength(3);
    result.residuals.forEach(r => {
      expect(Math.abs(r)).toBeLessThan(0.0001);
    });
  });
});

describe('kruskalWallis', () => {
  it('should detect significant difference between clearly different groups', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15]
    ];
    const result = kruskalWallis(groups);

    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.degreesOfFreedom).toBe(2);
  });

  it('should not detect difference between similar groups', () => {
    const groups = [
      [5, 6, 7, 8, 9],
      [5, 6, 7, 8, 9],
      [5, 6, 7, 8, 9]
    ];
    const result = kruskalWallis(groups);

    expect(result.significant).toBe(false);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it('should handle ties correctly', () => {
    const groups = [
      [1, 1, 2, 2, 3],
      [4, 4, 5, 5, 6],
      [7, 7, 8, 8, 9]
    ];
    const result = kruskalWallis(groups);

    expect(result.hStatistic).toBeGreaterThan(0);
    expect(result.significant).toBe(true);
  });

  it('should return non-significant for insufficient data', () => {
    const result = kruskalWallis([[1], [2]]);
    expect(result.significant).toBe(false);
    expect(result.pValue).toBe(1);
  });
});

describe('anovaEffectSizes', () => {
  it('should compute eta-squared correctly', () => {
    const groups = [
      [1, 2, 3],
      [10, 11, 12],
      [20, 21, 22]
    ];
    const result = anovaEffectSizes(groups);

    expect(result.etaSquared).toBeGreaterThan(0.9);
    expect(result.interpretation).toBe('large');
  });

  it('should compute omega-squared as less than eta-squared', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [3, 4, 5, 6, 7],
      [5, 6, 7, 8, 9]
    ];
    const result = anovaEffectSizes(groups);

    expect(result.omegaSquared).toBeLessThanOrEqual(result.etaSquared);
    expect(result.omegaSquared).toBeGreaterThanOrEqual(0);
  });

  it('should interpret small effect sizes correctly', () => {
    // Generate groups with small differences
    const groups = [
      [5.0, 5.1, 4.9, 5.2, 4.8],
      [5.1, 5.0, 5.2, 4.9, 5.0],
      [5.0, 5.0, 5.1, 5.0, 4.9]
    ];
    const result = anovaEffectSizes(groups);

    expect(['negligible', 'small']).toContain(result.interpretation);
  });

  it('should handle insufficient data', () => {
    const result = anovaEffectSizes([[1]]);
    expect(result.etaSquared).toBe(0);
    expect(result.interpretation).toBe('insufficient data');
  });
});

describe('tukeyHSD', () => {
  it('should compute all pairwise comparisons', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [3, 4, 5, 6, 7],
      [6, 7, 8, 9, 10]
    ];
    const result = tukeyHSD(groups);

    // 3 groups = 3 pairwise comparisons
    expect(result.comparisons).toHaveLength(3);
  });

  it('should detect significant differences', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24]
    ];
    const result = tukeyHSD(groups);

    result.comparisons.forEach(c => {
      expect(c.significant).toBe(true);
    });
  });

  it('should compute confidence intervals', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10]
    ];
    const result = tukeyHSD(groups);

    expect(result.comparisons[0].ci95.lower).toBeLessThan(result.comparisons[0].meanDiff);
    expect(result.comparisons[0].ci95.upper).toBeGreaterThan(result.comparisons[0].meanDiff);
  });
});

describe('pairwiseTTests', () => {
  it('should apply BH correction by default', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
      [3, 4, 5, 6, 7]
    ];
    const result = pairwiseTTests(groups, 0.05, 'bh');

    expect(result).toHaveLength(3);
    result.forEach(c => {
      expect(c.adjustedPValue).toBeGreaterThanOrEqual(c.rawPValue);
    });
  });

  it('should apply Bonferroni correction when specified', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
      [3, 4, 5, 6, 7]
    ];
    const result = pairwiseTTests(groups, 0.05, 'bonferroni');

    result.forEach(c => {
      // Bonferroni multiplies by number of comparisons
      expect(c.adjustedPValue).toBeCloseTo(Math.min(c.rawPValue * 3, 1), 5);
    });
  });

  it('should include effect sizes', () => {
    const groups = [
      [1, 2, 3, 4, 5],
      [10, 11, 12, 13, 14]
    ];
    const result = pairwiseTTests(groups);

    expect(result[0].effectSize.cohensD).not.toBe(0);
    expect(result[0].effectSize.interpretation).toBeDefined();
  });
});

describe('detailedPowerAnalysis', () => {
  it('should compute power correctly for given sample size', () => {
    const result = detailedPowerAnalysis(30);

    expect(result.currentN).toBe(30);
    expect(result.currentPower).toBeGreaterThan(0);
    expect(result.currentPower).toBeLessThan(1);
  });

  it('should recommend correct sample sizes for different effect sizes', () => {
    const result = detailedPowerAnalysis(30);

    // For 80% power at alpha=0.05:
    // Small effect (d=0.2) needs ~400 per group
    // Medium effect (d=0.5) needs ~64 per group
    // Large effect (d=0.8) needs ~26 per group
    expect(result.recommendedN.small).toBeGreaterThan(result.recommendedN.medium);
    expect(result.recommendedN.medium).toBeGreaterThan(result.recommendedN.large);
  });

  it('should correctly assess adequacy for large effects', () => {
    const result = detailedPowerAnalysis(30);

    // n=30 should be adequate for large effects (d=0.8)
    expect(result.adequateForLargeEffect).toBe(true);
    expect(result.adequateForSmallEffect).toBe(false);
  });

  it('should generate power curve', () => {
    const result = detailedPowerAnalysis(30);

    expect(result.powerCurve.length).toBeGreaterThan(0);
    // Power should increase with sample size
    const powers = result.powerCurve.map(p => p.power);
    for (let i = 1; i < powers.length; i++) {
      expect(powers[i]).toBeGreaterThanOrEqual(powers[i - 1]);
    }
  });
});

describe('bonferroniCorrection', () => {
  it('should multiply p-values by number of tests', () => {
    const pValues = [0.01, 0.02, 0.03];
    const adjusted = bonferroniCorrection(pValues);

    expect(adjusted[0]).toBeCloseTo(0.03, 5);
    expect(adjusted[1]).toBeCloseTo(0.06, 5);
    expect(adjusted[2]).toBeCloseTo(0.09, 5);
  });

  it('should cap p-values at 1', () => {
    const pValues = [0.5, 0.6, 0.7];
    const adjusted = bonferroniCorrection(pValues);

    adjusted.forEach(p => {
      expect(p).toBeLessThanOrEqual(1);
    });
  });
});

describe('benjaminiHochberg', () => {
  it('should control FDR', () => {
    const pValues = [0.01, 0.02, 0.03, 0.04, 0.05];
    const adjusted = benjaminiHochberg(pValues);

    // BH is less conservative than Bonferroni
    const bonf = bonferroniCorrection(pValues);
    adjusted.forEach((p, i) => {
      expect(p).toBeLessThanOrEqual(bonf[i]);
    });
  });

  it('should maintain order relationship', () => {
    const pValues = [0.001, 0.01, 0.05, 0.1, 0.2];
    const adjusted = benjaminiHochberg(pValues);

    // Adjusted p-values should maintain relative order
    for (let i = 1; i < adjusted.length; i++) {
      expect(adjusted[i]).toBeGreaterThanOrEqual(adjusted[i - 1]);
    }
  });

  it('should handle single p-value', () => {
    const adjusted = benjaminiHochberg([0.03]);
    expect(adjusted).toEqual([0.03]);
  });
});

describe('integration: ANOVA with post-hoc', () => {
  it('should produce consistent results across methods', () => {
    const groups = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    ];

    // ANOVA should be significant
    const anova = oneWayAnova(groups);
    expect(anova.significant).toBe(true);

    // Effect size should be large
    const effectSizes = anovaEffectSizes(groups);
    expect(effectSizes.interpretation).toBe('large');

    // Kruskal-Wallis should agree
    const kw = kruskalWallis(groups);
    expect(kw.significant).toBe(true);

    // Pairwise comparisons should show differences
    const pairwise = pairwiseTTests(groups);
    pairwise.forEach(c => {
      expect(Math.abs(c.effectSize.cohensD)).toBeGreaterThan(0.5);
    });
  });
});
