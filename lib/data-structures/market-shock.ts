// Market Shock - abrupt token price change events
// Port from data_structures/market_shock.py

export class MarketShock {
  step: number;
  severity: number; // +/- multiplier applied to price

  constructor(step: number, severity: number) {
    this.step = step;
    this.severity = severity;
  }

  toDict(): { step: number; severity: number } {
    return {
      step: this.step,
      severity: this.severity,
    };
  }

  static fromDict(data: { step?: number; severity?: number }): MarketShock {
    return new MarketShock(
      data.step || 0,
      data.severity || 0.0
    );
  }
}
