// Zod validation schemas for API requests

import { z } from 'zod';

/**
 * Simulation configuration schema
 */
export const SimulationConfigSchema = z.object({
  // Agent counts - all optional with sensible limits
  num_developers: z.number().int().min(0).max(1000).optional(),
  num_investors: z.number().int().min(0).max(1000).optional(),
  num_traders: z.number().int().min(0).max(1000).optional(),
  num_adaptive_investors: z.number().int().min(0).max(1000).optional(),
  num_delegators: z.number().int().min(0).max(1000).optional(),
  num_liquid_delegators: z.number().int().min(0).max(1000).optional(),
  num_proposal_creators: z.number().int().min(0).max(1000).optional(),
  num_validators: z.number().int().min(0).max(1000).optional(),
  num_service_providers: z.number().int().min(0).max(1000).optional(),
  num_arbitrators: z.number().int().min(0).max(1000).optional(),
  num_regulators: z.number().int().min(0).max(1000).optional(),
  num_auditors: z.number().int().min(0).max(1000).optional(),
  num_bounty_hunters: z.number().int().min(0).max(1000).optional(),
  num_external_partners: z.number().int().min(0).max(1000).optional(),
  num_passive_members: z.number().int().min(0).max(1000).optional(),
  num_artists: z.number().int().min(0).max(1000).optional(),
  num_collectors: z.number().int().min(0).max(1000).optional(),
  num_speculators: z.number().int().min(0).max(1000).optional(),

  // Governance settings
  governance_rule: z.enum(['majority', 'quorum', 'supermajority']).optional(),

  // Feature flags
  enable_marketing: z.boolean().optional(),
  marketing_level: z.string().max(50).optional(),
  enable_player: z.boolean().optional(),

  // Numeric parameters with ranges
  token_emission_rate: z.number().min(0).max(10000).optional(),
  token_burn_rate: z.number().min(0).max(10000).optional(),
  staking_interest_rate: z.number().min(0).max(1).optional(),
  slash_fraction: z.number().min(0).max(1).optional(),
  reputation_decay_rate: z.number().min(0).max(1).optional(),
  market_shock_frequency: z.number().min(0).max(100).optional(),
  adaptive_learning_rate: z.number().min(0).max(1).optional(),
  adaptive_epsilon: z.number().min(0).max(1).optional(),

  // Probabilities
  comment_probability: z.number().min(0).max(1).optional(),
  external_partner_interact_probability: z.number().min(0).max(1).optional(),
  violation_probability: z.number().min(0).max(1).optional(),
  reputation_penalty: z.number().min(0).max(1000).optional(),

  // Export/logging options
  exportCsv: z.boolean().optional(),
  csvFilename: z.string().max(255).optional(),
  useParallel: z.boolean().optional(),
  useAsync: z.boolean().optional(),
  maxWorkers: z.number().int().min(1).max(64).optional(),
  eventLogging: z.boolean().optional(),
  eventLogFilename: z.string().max(255).optional(),
  useIndexedDB: z.boolean().optional(),
  checkpointInterval: z.number().int().min(0).max(10000).optional(),
  reportFile: z.string().max(255).optional(),
  seed: z.number().int().optional(),
  centralityInterval: z.number().int().min(1).max(1000).optional(),

  // Dashboard-specific
  marketShockFrequency: z.number().min(0).max(100).optional(),
}).strict().optional().default({});

/**
 * Create simulation request schema
 */
export const CreateSimulationRequestSchema = SimulationConfigSchema;

/**
 * Step simulation request schema
 */
export const StepSimulationRequestSchema = z.object({
  id: z.string().min(1).max(100),
  action: z.enum(['step', 'run']),
  steps: z.number().int().min(1).max(10000).optional(),
}).strict();

/**
 * Validate request body against a schema
 * Returns the validated data or throws a formatted error response
 */
export async function validateRequest<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: Response }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate query parameters
 */
export function validateQueryParam(
  value: string | null,
  schema: z.ZodSchema
): { success: true; data: unknown } | { success: false; error: string } {
  if (value === null) {
    return { success: true, data: null };
  }

  const result = schema.safeParse(value);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || 'Invalid parameter',
    };
  }

  return { success: true, data: result.data };
}

// Query parameter schemas
export const SimulationIdSchema = z.string().min(1).max(100);
export const FormatSchema = z.enum(['csv', 'json']);
