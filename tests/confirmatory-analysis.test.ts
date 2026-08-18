import { describe, expect, it } from 'vitest';
import {
  analyzePairedEffect,
  correctPValues,
  estimatePairedPilotPower,
  estimatePairedSimulationPower,
  fitFactorialModel,
  poolDaoEffects,
  type AnalysisObservation,
} from '../lib/research/confirmatory-analysis';

describe('confirmatory analysis', () => {
  it('preserves seed blocks and estimates paired effects', () => {
    const observations: AnalysisObservation[] = [];
    for (let seed = 1; seed <= 8; seed++) {
      observations.push({ condition: 'control', seed, value: seed });
      observations.push({ condition: 'treatment', seed, value: seed + 2 + seed / 100 });
    }
    const result = analyzePairedEffect(observations, 'control', 'treatment', 0.5, 500);
    expect(result.nPairs).toBe(8);
    expect(result.meanDifference).toBeCloseTo(2.045);
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.signFlipPValue).toBeLessThan(0.01);
    expect(result.practicallyImportant).toBe(true);
    expect(result.differences.map(item => item.seed)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reports missing and non-finite experimental units', () => {
    const observations: AnalysisObservation[] = [
      { condition: 'a', seed: 1, value: 1 },
      { condition: 'b', seed: 1, value: 2 },
      { condition: 'a', seed: 2, value: 2 },
      { condition: 'b', seed: 2, value: Number.NaN },
      { condition: 'a', seed: 3, value: 3 },
      { condition: 'b', seed: 3, value: 4 },
      { condition: 'b', seed: 4, value: 4 },
    ];
    const result = analyzePairedEffect(observations, 'a', 'b', 2, 200);
    expect(result.missingInA).toEqual([4]);
    expect(result.excludedNonFinite).toHaveLength(1);
    expect(result.practicallyEquivalent).toBe(true);
  });

  it('applies ordered Holm and Benjamini-Hochberg corrections', () => {
    const tests = [
      { id: 'a', pValue: 0.01 },
      { id: 'b', pValue: 0.04 },
      { id: 'c', pValue: 0.2 },
    ];
    expect(correctPValues(tests, 'holm').map(item => item.adjustedPValue))
      .toEqual([0.03, 0.08, 0.2]);
    expect(correctPValues(tests, 'benjamini-hochberg').map(item => item.adjustedPValue))
      .toEqual([0.03, 0.06, 0.2]);
  });

  it('estimates factorial main effects and interactions', () => {
    const observations: AnalysisObservation[] = [];
    let seed = 1;
    for (const a of [0, 1]) {
      for (const b of [0, 1]) {
        for (let replicate = 0; replicate < 6; replicate++) {
          observations.push({
            condition: `${a}-${b}`,
            seed: seed++,
            value: 10 + 2 * a + 3 * b + 4 * a * b + replicate * 0.01,
            factors: { a, b },
          });
        }
      }
    }
    const model = fitFactorialModel(observations, 'outcome');
    expect(model.rSquared).toBeGreaterThan(0.99);
    expect(model.coefficients.find(item => item.term === 'a:b')?.estimate).toBeCloseTo(4, 6);
    expect(model.coefficients.every(item => item.robustStandardError >= 0)).toBe(true);
    expect(model.residualDegreesOfFreedom).toBe(20);
  });

  it('pools DAO effects and calculates pilot requirements', () => {
    const pooled = poolDaoEffects([
      { daoId: 'a', estimate: 0.1, standardError: 0.02 },
      { daoId: 'b', estimate: 0.2, standardError: 0.03 },
      { daoId: 'c', estimate: 0.15, standardError: 0.025 },
    ]);
    expect(pooled.daoCount).toBe(3);
    expect(pooled.pooledEstimate).toBeGreaterThan(0.1);
    expect(pooled.pooledEstimate).toBeLessThan(0.2);

    const power = estimatePairedPilotPower([0.08, 0.1, 0.12, 0.09, 0.11], 0.05);
    expect(power.requiredPairs).toBeGreaterThanOrEqual(2);
    expect(power.pilotPairs).toBe(5);

    const simulationPower = estimatePairedSimulationPower(
      [0.08, 0.1, 0.12, 0.09, 0.11],
      0.05,
      { candidatePairs: [8, 16, 32], simulationsPerCandidate: 200 },
    );
    expect(simulationPower.candidatePower).toHaveLength(3);
    expect(simulationPower.candidatePower[2].power)
      .toBeGreaterThanOrEqual(simulationPower.candidatePower[0].power);
    expect(estimatePairedSimulationPower(
      [0.08, 0.1, 0.12, 0.09, 0.11],
      0.05,
      { candidatePairs: [8, 16, 32], simulationsPerCandidate: 200 },
    )).toEqual(simulationPower);
  });
});
