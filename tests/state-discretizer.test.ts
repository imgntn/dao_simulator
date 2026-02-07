// Tests for StateDiscretizer - consistent state discretization for Q-learning
import { describe, it, expect } from 'vitest';
import { StateDiscretizer } from '@/lib/agents/learning';
import type { Proposal } from '@/lib/data-structures/proposal';

describe('StateDiscretizer', () => {
  describe('discretizePrice', () => {
    it('should categorize prices into correct buckets', () => {
      const baseline = 1.0;

      expect(StateDiscretizer.discretizePrice(0.3, baseline)).toBe('crash');
      expect(StateDiscretizer.discretizePrice(0.7, baseline)).toBe('low');
      expect(StateDiscretizer.discretizePrice(1.0, baseline)).toBe('normal');
      expect(StateDiscretizer.discretizePrice(1.3, baseline)).toBe('high');
      expect(StateDiscretizer.discretizePrice(2.0, baseline)).toBe('moon');
    });

    it('should handle edge cases at bucket boundaries', () => {
      expect(StateDiscretizer.discretizePrice(0.5, 1.0)).toBe('low'); // Exactly at boundary
      expect(StateDiscretizer.discretizePrice(0.9, 1.0)).toBe('normal');
      expect(StateDiscretizer.discretizePrice(1.1, 1.0)).toBe('normal');
      expect(StateDiscretizer.discretizePrice(1.5, 1.0)).toBe('high');
    });

    it('should work with different baselines', () => {
      expect(StateDiscretizer.discretizePrice(40, 100)).toBe('crash');  // 0.4x = crash
      expect(StateDiscretizer.discretizePrice(50, 100)).toBe('low');    // 0.5x = low (boundary)
      expect(StateDiscretizer.discretizePrice(100, 100)).toBe('normal');
      expect(StateDiscretizer.discretizePrice(200, 100)).toBe('moon');
    });

    it('should handle invalid inputs gracefully', () => {
      expect(StateDiscretizer.discretizePrice(NaN, 1.0)).toBe('normal');
      expect(StateDiscretizer.discretizePrice(1.0, NaN)).toBe('normal');
      expect(StateDiscretizer.discretizePrice(1.0, 0)).toBe('normal');
      expect(StateDiscretizer.discretizePrice(1.0, -1)).toBe('normal');
    });
  });

  describe('discretizeTrend', () => {
    it('should detect rising trends', () => {
      const rising = [1.0, 1.02, 1.04, 1.06, 1.10];
      expect(StateDiscretizer.discretizeTrend(rising)).toBe('rising');
    });

    it('should detect falling trends', () => {
      const falling = [1.0, 0.98, 0.96, 0.94, 0.90];
      expect(StateDiscretizer.discretizeTrend(falling)).toBe('falling');
    });

    it('should detect stable prices', () => {
      const stable = [1.0, 1.01, 0.99, 1.02, 1.01];
      expect(StateDiscretizer.discretizeTrend(stable)).toBe('stable');
    });

    it('should handle short price histories', () => {
      expect(StateDiscretizer.discretizeTrend([])).toBe('stable');
      expect(StateDiscretizer.discretizeTrend([1.0])).toBe('stable');
    });

    it('should respect window parameter', () => {
      // Old prices show falling, recent prices show rising
      const prices = [1.0, 0.8, 0.6, 0.8, 1.0, 1.2];

      // Window of 3 (last 3 prices: 1.0, 1.2) - rising
      expect(StateDiscretizer.discretizeTrend(prices, 3)).toBe('rising');

      // Window of 6 - overall rising from 1.0 to 1.2
      expect(StateDiscretizer.discretizeTrend(prices, 6)).toBe('rising');
    });

    it('should respect threshold parameter', () => {
      const prices = [1.0, 1.02]; // 2% increase

      expect(StateDiscretizer.discretizeTrend(prices, 5, 0.01)).toBe('rising'); // 1% threshold
      expect(StateDiscretizer.discretizeTrend(prices, 5, 0.05)).toBe('stable'); // 5% threshold
    });
  });

  describe('discretizeParticipation', () => {
    it('should categorize participation rates', () => {
      expect(StateDiscretizer.discretizeParticipation(0.05)).toBe('low');
      expect(StateDiscretizer.discretizeParticipation(0.35)).toBe('medium');
      expect(StateDiscretizer.discretizeParticipation(0.75)).toBe('high');
    });

    it('should handle boundary values', () => {
      expect(StateDiscretizer.discretizeParticipation(0.2)).toBe('medium');
      expect(StateDiscretizer.discretizeParticipation(0.5)).toBe('medium');
      expect(StateDiscretizer.discretizeParticipation(0.51)).toBe('high');
    });

    it('should clamp out-of-range values', () => {
      expect(StateDiscretizer.discretizeParticipation(-0.5)).toBe('low');
      expect(StateDiscretizer.discretizeParticipation(1.5)).toBe('high');
    });

    it('should handle invalid inputs', () => {
      expect(StateDiscretizer.discretizeParticipation(NaN)).toBe('low');
    });
  });

  describe('discretizeTreasury', () => {
    it('should categorize by absolute values when no reference given', () => {
      expect(StateDiscretizer.discretizeTreasury(50)).toBe('depleted');
      expect(StateDiscretizer.discretizeTreasury(500)).toBe('low');
      expect(StateDiscretizer.discretizeTreasury(5000)).toBe('adequate');
      expect(StateDiscretizer.discretizeTreasury(50000)).toBe('flush');
    });

    it('should use target reserve when provided', () => {
      const target = 10000;
      expect(StateDiscretizer.discretizeTreasury(500, undefined, target)).toBe('depleted');
      expect(StateDiscretizer.discretizeTreasury(3000, undefined, target)).toBe('low');
      expect(StateDiscretizer.discretizeTreasury(8000, undefined, target)).toBe('adequate');
      expect(StateDiscretizer.discretizeTreasury(15000, undefined, target)).toBe('flush');
    });

    it('should use runway when provided', () => {
      expect(StateDiscretizer.discretizeTreasury(1000, 5)).toBe('depleted');
      expect(StateDiscretizer.discretizeTreasury(1000, 30)).toBe('low');
      expect(StateDiscretizer.discretizeTreasury(1000, 100)).toBe('adequate');
      expect(StateDiscretizer.discretizeTreasury(1000, 500)).toBe('flush');
    });
  });

  describe('discretizeVolatility', () => {
    it('should detect calm markets', () => {
      const calm = [1.0, 1.001, 1.002, 0.999, 1.001];
      expect(StateDiscretizer.discretizeVolatility(calm)).toBe('calm');
    });

    it('should detect volatile markets', () => {
      // Moderate swings that produce stdDev between 0.05 and 0.15
      const volatile = [1.0, 1.05, 0.95, 1.08, 0.92];
      expect(StateDiscretizer.discretizeVolatility(volatile)).toBe('volatile');
    });

    it('should detect extreme volatility', () => {
      const extreme = [1.0, 1.3, 0.7, 1.4, 0.6];
      expect(StateDiscretizer.discretizeVolatility(extreme)).toBe('extreme');
    });

    it('should handle insufficient data', () => {
      expect(StateDiscretizer.discretizeVolatility([])).toBe('normal');
      expect(StateDiscretizer.discretizeVolatility([1.0, 1.1])).toBe('normal');
    });
  });

  describe('discretizeRisk', () => {
    it('should categorize risk scores', () => {
      expect(StateDiscretizer.discretizeRisk(0.05)).toBe('minimal');
      expect(StateDiscretizer.discretizeRisk(0.2)).toBe('low');
      expect(StateDiscretizer.discretizeRisk(0.45)).toBe('moderate');
      expect(StateDiscretizer.discretizeRisk(0.7)).toBe('high');
      expect(StateDiscretizer.discretizeRisk(0.95)).toBe('critical');
    });

    it('should clamp out-of-range values', () => {
      expect(StateDiscretizer.discretizeRisk(-0.5)).toBe('minimal');
      expect(StateDiscretizer.discretizeRisk(1.5)).toBe('critical');
    });
  });

  describe('discretizeAllocation', () => {
    it('should categorize allocation ratios', () => {
      expect(StateDiscretizer.discretizeAllocation(0, 1000)).toBe('none');
      expect(StateDiscretizer.discretizeAllocation(50, 1000)).toBe('small');
      expect(StateDiscretizer.discretizeAllocation(200, 1000)).toBe('moderate');
      expect(StateDiscretizer.discretizeAllocation(400, 1000)).toBe('large');
      expect(StateDiscretizer.discretizeAllocation(600, 1000)).toBe('dominant');
    });

    it('should handle edge cases', () => {
      expect(StateDiscretizer.discretizeAllocation(100, 0)).toBe('none');
      expect(StateDiscretizer.discretizeAllocation(NaN, 1000)).toBe('none');
    });
  });

  describe('discretizeActivity', () => {
    it('should categorize activity levels', () => {
      expect(StateDiscretizer.discretizeActivity(0, 10)).toBe('inactive');
      expect(StateDiscretizer.discretizeActivity(2, 10)).toBe('low');
      expect(StateDiscretizer.discretizeActivity(5, 10)).toBe('moderate');
      expect(StateDiscretizer.discretizeActivity(8, 10)).toBe('active');
      expect(StateDiscretizer.discretizeActivity(15, 10)).toBe('hyperactive');
    });
  });

  describe('discretizeVotingPower', () => {
    it('should categorize voting power ratios', () => {
      expect(StateDiscretizer.discretizeVotingPower(5, 1000)).toBe('negligible');
      expect(StateDiscretizer.discretizeVotingPower(30, 1000)).toBe('minor');
      expect(StateDiscretizer.discretizeVotingPower(100, 1000)).toBe('notable');
      expect(StateDiscretizer.discretizeVotingPower(250, 1000)).toBe('significant');
      expect(StateDiscretizer.discretizeVotingPower(500, 1000)).toBe('dominant');
    });
  });

  describe('discretizeSupport', () => {
    it('should categorize proposal support', () => {
      expect(StateDiscretizer.discretizeSupport(10, 90)).toBe('opposed');
      expect(StateDiscretizer.discretizeSupport(40, 60)).toBe('contested');
      expect(StateDiscretizer.discretizeSupport(55, 45)).toBe('leaning');
      expect(StateDiscretizer.discretizeSupport(80, 20)).toBe('supported');
      expect(StateDiscretizer.discretizeSupport(95, 5)).toBe('unanimous');
    });

    it('should handle no votes', () => {
      expect(StateDiscretizer.discretizeSupport(0, 0)).toBe('contested');
    });
  });

  describe('discretizePoolDepth', () => {
    it('should categorize pool depth', () => {
      expect(StateDiscretizer.discretizePoolDepth(30, 40)).toBe('shallow');
      expect(StateDiscretizer.discretizePoolDepth(150, 200)).toBe('medium');
      expect(StateDiscretizer.discretizePoolDepth(300, 400)).toBe('deep');
    });
  });

  describe('combineState and parseState', () => {
    it('should combine multiple dimensions', () => {
      const state = StateDiscretizer.combineState('high', 'rising', 'moderate');
      expect(state).toBe('high|rising|moderate');
    });

    it('should handle various types', () => {
      const state = StateDiscretizer.combineState('price', 42, true, 'trend');
      expect(state).toBe('price|42|true|trend');
    });

    it('should handle null/undefined as underscore', () => {
      const state = StateDiscretizer.combineState('a', null as any, 'b');
      expect(state).toBe('a|_|b');
    });

    it('should parse state back to dimensions', () => {
      const dimensions = StateDiscretizer.parseState('high|rising|moderate');
      expect(dimensions).toEqual(['high', 'rising', 'moderate']);
    });

    it('should be reversible', () => {
      const original = ['crash', 'falling', 'low', 'depleted'];
      const combined = StateDiscretizer.combineState(...original);
      const parsed = StateDiscretizer.parseState(combined);
      expect(parsed).toEqual(original);
    });
  });

  describe('createFinancialState', () => {
    it('should create consistent financial state keys', () => {
      const state1 = StateDiscretizer.createFinancialState(
        1.5, 1.0, [1.0, 1.2, 1.4], 200, 1000  // 200/1000 = 0.2 = moderate
      );
      const state2 = StateDiscretizer.createFinancialState(
        1.5, 1.0, [1.0, 1.2, 1.4], 200, 1000
      );
      expect(state1).toBe(state2);
      expect(state1).toBe('high|rising|moderate');
    });
  });

  describe('createGovernanceState', () => {
    it('should create governance state without proposal', () => {
      // 3000/10000 = 0.3 = low, 5000/10000 = 0.5 = adequate
      const state = StateDiscretizer.createGovernanceState(null, 0.3, 3000, 10000);
      expect(state).toBe('none|medium|low');
    });

    it('should create governance state with proposal', () => {
      const proposal = {
        status: 'open',
        closed: false,
        votesFor: 10,
        votesAgainst: 5,
      } as unknown as Proposal;

      const state = StateDiscretizer.createGovernanceState(proposal, 0.6, 15000, 10000);
      expect(state).toContain('high'); // High participation
      expect(state).toContain('flush'); // Above target treasury
    });
  });

  describe('createTradingState', () => {
    it('should create trading state', () => {
      const state = StateDiscretizer.createTradingState(
        0.8, 1.0, 300, 200, [1.0, 0.9, 0.8]
      );
      expect(state).toBe('low|deep|falling');
    });
  });

  describe('Consistency guarantees', () => {
    it('should produce identical outputs for identical inputs', () => {
      // Run same discretization 100 times
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        results.add(StateDiscretizer.discretizePrice(1.25, 1.0));
      }
      expect(results.size).toBe(1);
      expect(results.has('high')).toBe(true);
    });

    it('should maintain bucket ordering', () => {
      // Price buckets should be ordered by value
      const priceBuckets = [0.3, 0.7, 1.0, 1.3, 2.0].map(p =>
        StateDiscretizer.discretizePrice(p, 1.0)
      );
      expect(priceBuckets).toEqual(['crash', 'low', 'normal', 'high', 'moon']);
    });

    it('should provide complete coverage of value ranges', () => {
      // Every valid price should map to a bucket
      for (let price = 0; price <= 3; price += 0.1) {
        const bucket = StateDiscretizer.discretizePrice(price, 1.0);
        expect(['crash', 'low', 'normal', 'high', 'moon']).toContain(bucket);
      }
    });
  });
});
