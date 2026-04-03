// Price Oracle implementations for token pricing

import type { PriceOracle } from '@/types/simulation';
import { random } from './random';

/**
 * Base Price Oracle interface
 */
export abstract class BasePriceOracle implements PriceOracle {
  protected prices: Map<string, number> = new Map();

  abstract updatePrice(token: string, step?: number, volatility?: number): void;

  getPrice(token: string): number {
    return this.prices.get(token) || 100; // Default price
  }

  setPrice(token: string, price: number): void {
    this.prices.set(token, price);
  }
}

/**
 * Random Walk Oracle - simple random price movements
 */
export class RandomWalkOracle extends BasePriceOracle {
  private volatility: number;

  constructor(volatility: number = 0.005) {
    super();
    this.volatility = volatility;
  }

  updatePrice(token: string, _step?: number, volatilityOverride?: number): void {
    // _step parameter reserved for future time-based price modeling
    const currentPrice = this.getPrice(token);
    // Random walk: price can go up or down by volatility percentage
    const volatility = Number.isFinite(volatilityOverride) ? volatilityOverride! : this.volatility;
    const change = (random() - 0.5) * 2 * volatility;
    const newPrice = Math.max(1, currentPrice * (1 + change));
    this.setPrice(token, newPrice);
  }
}

/**
 * Geometric Brownian Motion Oracle - more realistic price model
 */
export class GeometricBrownianOracle extends BasePriceOracle {
  protected drift: number;
  protected volatility: number;

  constructor(drift: number = 0.01, volatility: number = 0.2) {
    super();
    this.drift = drift;
    this.volatility = volatility;
  }

  updatePrice(token: string, _step?: number, volatilityOverride?: number): void {
    // _step parameter reserved for advanced time-series modeling
    const currentPrice = this.getPrice(token);
    const dt = 1; // time step

    const volatility = Number.isFinite(volatilityOverride) ? volatilityOverride! : this.volatility;

    // Box-Muller transform for normal distribution
    const u1 = random();
    const u2 = random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Geometric Brownian Motion formula
    const drift_term = this.drift * dt;
    const diffusion_term = volatility * Math.sqrt(dt) * z;
    // Clamp the exponent to prevent explosive price swings (±50% per step max)
    const exponent = Math.max(-0.5, Math.min(0.5, drift_term + diffusion_term));
    const newPrice = Math.max(1, currentPrice * Math.exp(exponent));

    this.setPrice(token, newPrice);
  }
}

/**
 * Fixed Price Oracle - price never changes
 */
export class FixedPriceOracle extends BasePriceOracle {
  updatePrice(_token?: string, _step?: number, _volatility?: number): void {
    // Price stays constant - no parameters needed
  }
}

/**
 * Calibrated GBM Oracle - uses drift/volatility from historical CalibrationProfile
 * Optionally injects drawdown events from historical data.
 */
export class CalibratedGBMOracle extends GeometricBrownianOracle {
  private drawdownEvents: Array<{ startStep: number; endStep: number; magnitude: number }>;
  private initialPrice: number;
  private meanReversionSpeed: number;

  constructor(calibration: {
    drift: number;
    volatility: number;
    initialPrice: number;
    drawdownEvents?: Array<{ startStep: number; endStep: number; magnitude: number }>;
    meanReversionSpeed?: number;
  }) {
    super(calibration.drift, calibration.volatility);
    this.initialPrice = calibration.initialPrice;
    this.drawdownEvents = calibration.drawdownEvents || [];
    // Mean-reversion toward the initial (historical average) price.
    // Counteracts systematic drift from treasury selling pressure and GBM noise.
    // 0.03 = 3% pull-back per step → half-life of ~23 steps (~1 day).
    // Stronger reversion prevents price divergence seen in Optimism (-37% under).
    this.meanReversionSpeed = calibration.meanReversionSpeed ?? 0.03;
  }

  updatePrice(token: string, step?: number, volatilityOverride?: number): void {
    // Set initial price on first call
    if (!this.prices.has(token)) {
      this.setPrice(token, this.initialPrice);
    }

    // Inline GBM update (avoids parent's Math.max(1,...) floor which breaks sub-$1 tokens)
    const currentPrice = this.getPrice(token);
    const dt = 1;
    const vol = Number.isFinite(volatilityOverride) ? volatilityOverride! : this.volatility;
    const u1 = random();
    const u2 = random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const driftTerm = this.drift * dt;
    const diffusionTerm = vol * Math.sqrt(dt) * z;
    // Clamp the exponent to prevent explosive price swings (±50% per step max)
    const exponent = Math.max(-0.5, Math.min(0.5, driftTerm + diffusionTerm));
    const priceFloor = Math.max(0.0001, this.initialPrice * 0.01);
    const gbmPrice = Math.max(priceFloor, currentPrice * Math.exp(exponent));
    this.setPrice(token, gbmPrice);

    // Mean-reversion: pull price back toward the historical average (Ornstein-Uhlenbeck style).
    // Without this, treasury selling pressure causes ~40% systematic downward bias.
    if (this.meanReversionSpeed > 0) {
      const currentPrice = this.getPrice(token);
      const logRatio = Math.log(currentPrice / this.initialPrice);
      const revertedPrice = currentPrice * Math.exp(-this.meanReversionSpeed * logRatio);
      this.setPrice(token, Math.max(0.01, revertedPrice));
    }

    // Apply drawdown effect if in a drawdown window
    if (step !== undefined) {
      for (const dd of this.drawdownEvents) {
        if (step >= dd.startStep && step <= dd.endStep) {
          const progress = (step - dd.startStep) / Math.max(dd.endStep - dd.startStep, 1);
          // Peak drawdown at midpoint, recover toward end
          const drawdownFactor = progress < 0.5
            ? 1 - dd.magnitude * (progress * 2)
            : 1 - dd.magnitude * (2 - progress * 2);
          const currentPrice = this.getPrice(token);
          this.setPrice(token, Math.max(0.01, currentPrice * Math.max(0.5, drawdownFactor)));
          break;
        }
      }
    }
  }
}

/**
 * Historical Replay Oracle - replays actual price data from a time series.
 * After the series ends, falls back to CalibratedGBM with learned parameters.
 */
export class HistoricalReplayOracle extends BasePriceOracle {
  private timeSeries: Array<{ step: number; price: number }>;
  private fallbackOracle: CalibratedGBMOracle | null = null;
  private maxStep: number;

  constructor(
    timeSeries: Array<{ step: number; price: number }>,
    fallbackParams?: { drift: number; volatility: number }
  ) {
    super();
    this.timeSeries = timeSeries.sort((a, b) => a.step - b.step);
    this.maxStep = this.timeSeries.length > 0
      ? this.timeSeries[this.timeSeries.length - 1].step
      : 0;

    if (fallbackParams && this.timeSeries.length > 0) {
      this.fallbackOracle = new CalibratedGBMOracle({
        drift: fallbackParams.drift,
        volatility: fallbackParams.volatility,
        initialPrice: this.timeSeries[this.timeSeries.length - 1].price,
      });
    }
  }

  updatePrice(token: string, step?: number, volatilityOverride?: number): void {
    if (step === undefined) {
      step = 0;
    }

    if (step <= this.maxStep && this.timeSeries.length > 0) {
      // Interpolate between nearest data points
      const price = this.interpolatePrice(step);
      this.setPrice(token, price);
    } else if (this.fallbackOracle) {
      // After series ends, use calibrated GBM
      this.fallbackOracle.updatePrice(token, step, volatilityOverride);
      this.setPrice(token, this.fallbackOracle.getPrice(token));
    }
    // If no fallback, price stays at last known value
  }

  private interpolatePrice(step: number): number {
    if (this.timeSeries.length === 0) return 100;
    if (this.timeSeries.length === 1) return this.timeSeries[0].price;

    // Binary search for nearest data points
    let lo = 0;
    let hi = this.timeSeries.length - 1;

    if (step <= this.timeSeries[lo].step) return this.timeSeries[lo].price;
    if (step >= this.timeSeries[hi].step) return this.timeSeries[hi].price;

    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.timeSeries[mid].step <= step) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    // Linear interpolation
    const loEntry = this.timeSeries[lo];
    const hiEntry = this.timeSeries[hi];
    const t = (step - loEntry.step) / Math.max(hiEntry.step - loEntry.step, 1);
    return loEntry.price + t * (hiEntry.price - loEntry.price);
  }
}

/**
 * Market Shock Oracle - applies sudden price shocks
 */
export class MarketShockOracle extends BasePriceOracle {
  private baseOracle: PriceOracle;
  private shockMagnitude: number = 0;
  private shockDuration: number = 0;
  private shockStep: number = -1;

  constructor(baseOracle: PriceOracle) {
    super();
    this.baseOracle = baseOracle;
  }

  updatePrice(token: string, step: number = 0, volatilityOverride?: number): void {
    // Update using base oracle
    this.baseOracle.updatePrice(token, step, volatilityOverride);
    let price = this.baseOracle.getPrice(token);

    // Apply shock if active
    if (this.shockStep >= 0 && step < this.shockStep + this.shockDuration) {
      price *= (1 + this.shockMagnitude);
    }

    this.setPrice(token, price);
  }

  getPrice(token: string): number {
    return this.prices.get(token) || this.baseOracle.getPrice(token);
  }

  /**
   * Trigger a market shock
   */
  triggerShock(magnitude: number, duration: number, step: number): void {
    this.shockMagnitude = magnitude;
    this.shockDuration = duration;
    this.shockStep = step;
  }
}
