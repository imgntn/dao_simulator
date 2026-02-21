// Prediction Market — LMSR (Logarithmic Market Scoring Rule)
//
// Implements a simple automated market maker for binary outcome prediction markets.
// Used by Futarchy governance where proposal approval is decided by market prices.
//
// Reference: Hanson, R. (2003). "Combinatorial Information Market Design"

/**
 * LMSR (Logarithmic Market Scoring Rule) Automated Market Maker
 *
 * Maintains a pool for YES and NO outcomes. Agents trade by buying/selling
 * outcome tokens. The market price reflects the crowd's probability estimate.
 *
 * Price of YES token = e^(qYes/b) / (e^(qYes/b) + e^(qNo/b))
 * where b = liquidity parameter (higher = more liquid, less price impact per trade)
 */
export class PredictionMarket {
  /** Quantity of YES outcome tokens sold */
  qYes: number = 0;
  /** Quantity of NO outcome tokens sold */
  qNo: number = 0;
  /** Liquidity parameter — higher means less price impact per trade */
  readonly liquidity: number;
  /** Whether the market has been resolved */
  resolved: boolean = false;
  /** Resolution outcome (true = YES won) */
  outcome?: boolean;
  /** Step at which market was created */
  readonly creationStep: number;
  /** Step at which market resolves */
  readonly resolutionStep: number;
  /** Trades history for analytics */
  trades: Array<{
    agentId: string;
    side: 'yes' | 'no';
    amount: number;
    price: number;
    step: number;
  }> = [];

  constructor(options: {
    liquidity?: number;
    creationStep?: number;
    resolutionStep?: number;
  } = {}) {
    this.liquidity = options.liquidity ?? 100;
    this.creationStep = options.creationStep ?? 0;
    this.resolutionStep = options.resolutionStep ?? 100;
  }

  /**
   * Get current YES price (probability estimate 0-1)
   */
  getYesPrice(): number {
    const b = this.liquidity;
    const expYes = Math.exp(this.qYes / b);
    const expNo = Math.exp(this.qNo / b);
    return expYes / (expYes + expNo);
  }

  /**
   * Get current NO price (= 1 - yesPrice)
   */
  getNoPrice(): number {
    return 1 - this.getYesPrice();
  }

  /**
   * Calculate cost to buy `amount` of YES tokens
   * Cost = b * ln(e^((qYes+amount)/b) + e^(qNo/b)) - b * ln(e^(qYes/b) + e^(qNo/b))
   */
  costToBuyYes(amount: number): number {
    return this.costFunction(this.qYes + amount, this.qNo)
      - this.costFunction(this.qYes, this.qNo);
  }

  /**
   * Calculate cost to buy `amount` of NO tokens
   */
  costToBuyNo(amount: number): number {
    return this.costFunction(this.qYes, this.qNo + amount)
      - this.costFunction(this.qYes, this.qNo);
  }

  /**
   * LMSR cost function: C(q) = b * ln(e^(qYes/b) + e^(qNo/b))
   */
  private costFunction(qYes: number, qNo: number): number {
    const b = this.liquidity;
    // Use log-sum-exp trick for numerical stability
    const maxQ = Math.max(qYes, qNo) / b;
    return b * (maxQ + Math.log(
      Math.exp(qYes / b - maxQ) + Math.exp(qNo / b - maxQ)
    ));
  }

  /**
   * Execute a trade: buy `amount` of YES or NO tokens.
   * Returns the cost paid.
   */
  trade(agentId: string, side: 'yes' | 'no', amount: number, step: number): number {
    if (this.resolved) return 0;
    if (amount <= 0) return 0;

    const cost = side === 'yes'
      ? this.costToBuyYes(amount)
      : this.costToBuyNo(amount);

    if (side === 'yes') {
      this.qYes += amount;
    } else {
      this.qNo += amount;
    }

    const price = this.getYesPrice();
    this.trades.push({ agentId, side, amount, price, step });

    return cost;
  }

  /**
   * Resolve the market. If YES price > threshold, outcome is YES.
   */
  resolve(threshold: number = 0.5): boolean {
    this.resolved = true;
    this.outcome = this.getYesPrice() > threshold;
    return this.outcome;
  }

  /**
   * Check if market should resolve at the given step
   */
  shouldResolve(currentStep: number): boolean {
    return !this.resolved && currentStep >= this.resolutionStep;
  }
}
