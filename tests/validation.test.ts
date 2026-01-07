// Validation schema tests
import { describe, it, expect } from 'vitest';
import {
  SimulationConfigSchema,
  StepSimulationRequestSchema,
  SimulationIdSchema,
  CreateSimulationRequestSchema,
} from '@/lib/validation/schemas';

describe('SimulationConfigSchema', () => {
  it('should accept valid config', () => {
    const config = {
      num_developers: 10,
      num_investors: 5,
      governance_rule: 'majority' as const,
    };

    const result = SimulationConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should accept empty config', () => {
    const result = SimulationConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept undefined config', () => {
    const result = SimulationConfigSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('should reject invalid agent counts', () => {
    const config = {
      num_developers: -5,
    };

    const result = SimulationConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject agent counts over limit', () => {
    const config = {
      num_developers: 1001,
    };

    const result = SimulationConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should accept valid governance rules', () => {
    expect(SimulationConfigSchema.safeParse({ governance_rule: 'majority' }).success).toBe(true);
    expect(SimulationConfigSchema.safeParse({ governance_rule: 'quorum' }).success).toBe(true);
    expect(SimulationConfigSchema.safeParse({ governance_rule: 'supermajority' }).success).toBe(true);
  });

  it('should reject invalid governance rules', () => {
    const result = SimulationConfigSchema.safeParse({ governance_rule: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should validate probability ranges', () => {
    expect(SimulationConfigSchema.safeParse({ comment_probability: 0.5 }).success).toBe(true);
    expect(SimulationConfigSchema.safeParse({ comment_probability: 0 }).success).toBe(true);
    expect(SimulationConfigSchema.safeParse({ comment_probability: 1 }).success).toBe(true);
    expect(SimulationConfigSchema.safeParse({ comment_probability: 1.5 }).success).toBe(false);
    expect(SimulationConfigSchema.safeParse({ comment_probability: -0.1 }).success).toBe(false);
  });

  it('should reject unknown fields with strict mode', () => {
    const config = {
      num_developers: 10,
      unknown_field: 'value',
    };

    const result = SimulationConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('StepSimulationRequestSchema', () => {
  it('should accept valid step request', () => {
    const request = {
      id: 'sim_123',
      action: 'step' as const,
    };

    const result = StepSimulationRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should accept valid run request', () => {
    const request = {
      id: 'sim_123',
      action: 'run' as const,
      steps: 100,
    };

    const result = StepSimulationRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const request = {
      action: 'step',
    };

    const result = StepSimulationRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should reject invalid action', () => {
    const request = {
      id: 'sim_123',
      action: 'invalid',
    };

    const result = StepSimulationRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should reject too many steps', () => {
    const request = {
      id: 'sim_123',
      action: 'run',
      steps: 20000, // Over limit of 10000
    };

    const result = StepSimulationRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should reject negative steps', () => {
    const request = {
      id: 'sim_123',
      action: 'run',
      steps: -5,
    };

    const result = StepSimulationRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

describe('SimulationIdSchema', () => {
  it('should accept valid ids', () => {
    expect(SimulationIdSchema.safeParse('sim_123').success).toBe(true);
    expect(SimulationIdSchema.safeParse('abc').success).toBe(true);
  });

  it('should reject empty id', () => {
    expect(SimulationIdSchema.safeParse('').success).toBe(false);
  });

  it('should reject too long ids', () => {
    const longId = 'a'.repeat(101);
    expect(SimulationIdSchema.safeParse(longId).success).toBe(false);
  });
});

describe('CreateSimulationRequestSchema', () => {
  it('should be equivalent to SimulationConfigSchema', () => {
    const config = {
      num_developers: 10,
      num_investors: 5,
    };

    const configResult = SimulationConfigSchema.safeParse(config);
    const createResult = CreateSimulationRequestSchema.safeParse(config);

    expect(configResult.success).toBe(createResult.success);
  });
});
