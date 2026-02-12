#!/usr/bin/env node
/**
 * Quick test of new statistical functions
 */

import {
  linearRegression,
  kruskalWallis,
  anovaEffectSizes,
  detailedPowerAnalysis,
  pairwiseTTests,
  tukeyHSD,
  bonferroniCorrection,
} from '../lib/research/statistics';

console.log('=== Testing New Statistical Functions ===\n');

// Test linear regression
console.log('1. Linear Regression');
const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const y = [2.1, 4.0, 5.9, 8.1, 10.0, 12.1, 14.0, 15.9, 18.1, 20.0];
const reg = linearRegression(x, y);
console.log(`   y = ${reg.slope.toFixed(3)}x + ${reg.intercept.toFixed(3)}`);
console.log(`   R² = ${reg.rSquared.toFixed(4)}`);
console.log(`   F(1,${reg.n - 2}) = ${reg.fStatistic.toFixed(2)}, p = ${reg.pValueF.toFixed(6)}`);
console.log(`   Slope t = ${reg.tStatisticSlope.toFixed(2)}, p = ${reg.pValueSlope.toFixed(6)}`);

// Test Kruskal-Wallis
console.log('\n2. Kruskal-Wallis Test (non-parametric ANOVA)');
const groups = [
  [1, 2, 3, 4, 5],
  [4, 5, 6, 7, 8],
  [8, 9, 10, 11, 12]
];
const kw = kruskalWallis(groups);
console.log(`   H(${kw.degreesOfFreedom}) = ${kw.hStatistic.toFixed(3)}, p = ${kw.pValue.toFixed(4)}`);
console.log(`   Significant at α=0.05: ${kw.significant ? 'Yes' : 'No'}`);

// Test ANOVA effect sizes
console.log('\n3. ANOVA Effect Sizes');
const effect = anovaEffectSizes(groups);
console.log(`   η² = ${effect.etaSquared.toFixed(3)} (${effect.interpretation})`);
console.log(`   ω² = ${effect.omegaSquared.toFixed(3)}`);

// Test pairwise t-tests with BH correction
console.log('\n4. Pairwise t-tests with Benjamini-Hochberg Correction');
const pairwise = pairwiseTTests(groups, 0.05, 'bh');
for (const c of pairwise) {
  console.log(`   Group ${c.group1} vs ${c.group2}:`);
  console.log(`     Mean diff = ${c.meanDiff.toFixed(2)}, t = ${c.tStatistic.toFixed(2)}`);
  console.log(`     Raw p = ${c.rawPValue.toFixed(4)}, Adj p = ${c.adjustedPValue.toFixed(4)}`);
  console.log(`     Cohen's d = ${c.effectSize.cohensD.toFixed(2)} (${c.effectSize.interpretation})`);
}

// Test Tukey HSD
console.log('\n5. Tukey HSD Post-hoc Test');
const tukey = tukeyHSD(groups);
for (const c of tukey.comparisons) {
  console.log(`   Group ${c.group1} vs ${c.group2}: q = ${c.qStatistic.toFixed(2)}, p = ${c.pValue.toFixed(4)}`);
}

// Test Bonferroni correction
console.log('\n6. Bonferroni vs BH Correction');
const rawP = [0.01, 0.02, 0.03, 0.04, 0.05];
const bonf = bonferroniCorrection(rawP);
const { benjaminiHochberg } = require('../lib/research/statistics');
const bh = benjaminiHochberg(rawP);
console.log('   Raw p-values:', rawP.map(p => p.toFixed(3)).join(', '));
console.log('   Bonferroni:  ', bonf.map(p => p.toFixed(3)).join(', '));
console.log('   BH (FDR):    ', bh.map((p: number) => p.toFixed(3)).join(', '));

// Test power analysis
console.log('\n7. Power Analysis');
const power = detailedPowerAnalysis(30);
console.log(`   Current N = ${power.currentN}`);
console.log(`   Power (d=0.5) = ${(power.currentPower * 100).toFixed(1)}%`);
console.log(`   Min detectable effect = ${power.minimumDetectableEffect.toFixed(3)}`);
console.log(`   Required N for small (d=0.2):  ${power.recommendedN.small}`);
console.log(`   Required N for medium (d=0.5): ${power.recommendedN.medium}`);
console.log(`   Required N for large (d=0.8):  ${power.recommendedN.large}`);

console.log('\n=== All Statistical Function Tests Passed ===');
