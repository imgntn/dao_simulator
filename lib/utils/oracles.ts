// Price Oracle implementations for token pricing

import type { PriceOracle } from '@/types/simulation';

/**
 * Base Price Oracle interface
 */
export abstract class BasePriceOracle implements PriceOracle {
  protected prices: Map<string, number> = new Map();

  abstract updatePrice(token: string, step: number): void;

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

  constructor(volatility: number = 0.02) {
    super();
    this.volatility = volatility;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePrice(token: string, _step?: number): void {
    // _step parameter reserved for future time-based price modeling
    const currentPrice = this.getPrice(token);
    // Random walk: price can go up or down by volatility percentage
    const change = (Math.random() - 0.5) * 2 * this.volatility;
    const newPrice = Math.max(1, currentPrice * (1 + change));
    this.setPrice(token, newPrice);
  }
}

/**
 * Geometric Brownian Motion Oracle - more realistic price model
 */
export class GeometricBrownianOracle extends BasePriceOracle {
  private drift: number;
  private volatility: number;

  constructor(drift: number = 0.01, volatility: number = 0.2) {
    super();
    this.drift = drift;
    this.volatility = volatility;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePrice(token: string, _step?: number): void {
    // _step parameter reserved for advanced time-series modeling
    const currentPrice = this.getPrice(token);
    const dt = 1; // time step

    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Geometric Brownian Motion formula
    const drift_term = this.drift * dt;
    const diffusion_term = this.volatility * Math.sqrt(dt) * z;
    const newPrice = Math.max(1, currentPrice * Math.exp(drift_term + diffusion_term));

    this.setPrice(token, newPrice);
  }
}

/**
 * Fixed Price Oracle - price never changes
 */
export class FixedPriceOracle extends BasePriceOracle {
  updatePrice(): void {
    // Price stays constant - no parameters needed
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

  updatePrice(token: string, step: number): void {
    // Update using base oracle
    this.baseOracle.updatePrice(token, step);
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
