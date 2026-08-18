export function annualRateToStepRate(annualRate: number, stepsPerYear: number): number {
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    throw new Error('annualRate must be a non-negative finite number');
  }
  if (!Number.isFinite(stepsPerYear) || stepsPerYear <= 0) {
    throw new Error('stepsPerYear must be a positive finite number');
  }
  return Math.pow(1 + annualRate, 1 / stepsPerYear) - 1;
}
