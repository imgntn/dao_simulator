import { describe, expect, it } from 'vitest';
import { annualRateToStepRate } from '../lib/research/economic-assumptions';
import { settings } from '../lib/config/settings';
import { STEPS_PER_YEAR } from '../lib/config/constants';

describe('economic time assumptions', () => {
  it('converts an annual rate so compounding over the declared year is exact', () => {
    const perStep = annualRateToStepRate(0.18, 360);
    expect(Math.pow(1 + perStep, 360)).toBeCloseTo(1.18, 12);
  });

  it('uses zero per-step yield for a zero annual assumption', () => {
    expect(annualRateToStepRate(0, 360)).toBe(0);
  });

  it('binds the default annual conversion to the one-hour simulation clock', () => {
    expect(STEPS_PER_YEAR).toBe(8760);
    expect(settings.simulationStepsPerYear).toBe(STEPS_PER_YEAR);
    const perStep = annualRateToStepRate(0.05, settings.simulationStepsPerYear);
    expect(Math.pow(1 + perStep, STEPS_PER_YEAR)).toBeCloseTo(1.05, 11);
  });

  it('rejects invalid annual rates and time bases', () => {
    expect(() => annualRateToStepRate(-0.1, 360)).toThrow(/annualRate/);
    expect(() => annualRateToStepRate(0.1, 0)).toThrow(/stepsPerYear/);
    expect(() => annualRateToStepRate(Number.NaN, 360)).toThrow(/annualRate/);
  });
});
