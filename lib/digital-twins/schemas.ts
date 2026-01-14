/**
 * Digital Twin Zod Validation Schemas
 *
 * Schemas for validating digital twin JSON files (schema v0.2)
 * Used by the loader to ensure data integrity
 */

import { z } from 'zod';

// =============================================================================
// INDEX FILE SCHEMA
// =============================================================================

export const DigitalTwinIndexEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.array(z.string()),
  file: z.string().endsWith('.json'),
});

export const DigitalTwinIndexSchema = z.object({
  schema_version: z.string().startsWith('dao_digital_twin'),
  generated_utc: z.string(),
  count: z.number().int().positive(),
  daos: z.array(DigitalTwinIndexEntrySchema),
});

// =============================================================================
// GOVERNANCE TOKEN
// =============================================================================

export const GovernanceTokenSchema = z.object({
  symbol: z.string().min(1),
  type: z.string(),
  contract_address: z.string().optional(),
  voting_power_model: z.string(),
  notes: z.string().optional(),
});

// =============================================================================
// GOVERNANCE STACK
// =============================================================================

export const OffchainVotingSchema = z.object({
  platform: z.string(),
  used_for: z.array(z.string()).optional(),
  typical_poll_duration_days: z.number().optional(),
  typical_duration_days: z.number().optional(),
  typical_pass_rule: z.string().optional(),
  proposal_gate: z
    .object({
      min_delegated_pct_votable: z.number().optional(),
    })
    .optional(),
});

export const VotingPeriodDaysSchema = z.union([
  z.number(),
  z.object({
    min: z.number(),
    max: z.number(),
  }),
]);

export const ProposalCategoriesSchema = z
  .object({
    constitutional: z.object({ quorum_pct_votable: z.number() }).optional(),
    non_constitutional: z.object({ quorum_pct_votable: z.number() }).optional(),
  })
  .optional();

export const OnchainVotingSchema = z.object({
  platform: z.string().optional(),
  framework: z.string().optional(),
  voting_delay_days: z.number().optional(),
  voting_period_days: VotingPeriodDaysSchema.optional(),
  pass_rule: z.string().optional(),
  proposal_threshold_arb: z.number().optional(),
  proposal_threshold_uni: z.number().optional(),
  proposal_categories: ProposalCategoriesSchema,
});

export const TimelockExecutionSchema = z.object({
  min_delay_days: z.number().optional(),
  notes: z.string().optional(),
});

export const ExecutionComponentSchema = z.object({
  component: z.string(),
  typical_delay_days: z.number(),
});

export const ExecutionSchema = z
  .object({
    timelock: TimelockExecutionSchema.optional(),
    timelock_and_bridging: z
      .object({
        notes: z.array(z.string()).optional(),
        typical_components: z.array(ExecutionComponentSchema).optional(),
      })
      .optional(),
  })
  .optional();

// Optimism bicameral
export const QuorumConfigSchema = z.object({
  type: z.string(),
  value_pct: z.number(),
});

export const ApprovalThresholdSchema = z.object({
  type: z.string(),
  value_pct: z.number(),
});

export const TokenHouseSchema = z.object({
  who: z.string(),
  primary_decisions: z.array(z.string()),
  quorum: QuorumConfigSchema,
  approval_threshold: ApprovalThresholdSchema,
  cadence: z.string().optional(),
});

export const CitizensHouseSchema = z.object({
  who: z.string(),
  primary_decisions: z.array(z.string()),
  veto_window_days: z.number().optional(),
});

export const HousesSchema = z
  .object({
    token_house: TokenHouseSchema.optional(),
    citizens_house: CitizensHouseSchema.optional(),
  })
  .optional();

// Lido dual governance
export const DualGovernanceSafeguardSchema = z.object({
  name: z.string(),
  who: z.string(),
  normal_review_window: z
    .object({
      pending_days: z.number(),
      buffer_days: z.number(),
    })
    .optional(),
  veto_signalling_threshold_pct_steth_supply: z.number().optional(),
  rage_quit_threshold_pct_steth_supply: z.number().optional(),
  dynamic_timelock_days_range: z.tuple([z.number(), z.number()]).optional(),
  effects: z
    .object({
      veto_signalling: z.string().optional(),
      rage_quit: z.string().optional(),
    })
    .optional(),
});

export const FastTrackSchema = z.object({
  name: z.string(),
  platform: z.string(),
  purpose: z.string(),
});

export const UpgradeSafetySchema = z.object({
  developer_advisory_board_review: z.boolean().optional(),
  veto_period_days: z.number().optional(),
  notes: z.array(z.string()).optional(),
});

export const GovernanceStackSchema = z.object({
  discussion_forum: z.string().optional(),
  offchain_voting: OffchainVotingSchema.optional(),
  onchain_voting: OnchainVotingSchema.optional(),
  execution: ExecutionSchema,
  houses: HousesSchema,
  upgrade_safety: UpgradeSafetySchema.optional(),
  fast_track: FastTrackSchema.optional(),
  safeguard_layer: DualGovernanceSafeguardSchema.optional(),
});

// =============================================================================
// TREASURY
// =============================================================================

export const TreasurySchema = z.object({
  treasury_controller: z.string(),
  primary_treasury_address: z.string().optional(),
  spending_mechanism: z.union([z.string(), z.array(z.string())]),
  budgeting_patterns: z.array(z.string()).optional(),
  revenue_streams: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
});

// =============================================================================
// MEMBERSHIP
// =============================================================================

export const MemberTypeSchema = z.object({
  type: z.string(),
  who: z.string(),
  rights: z.array(z.string()),
});

export const MembershipSchema = z.object({
  member_types: z.array(MemberTypeSchema),
  notable_institutions: z.array(z.string()).optional(),
});

// =============================================================================
// PROPOSAL PROCESS
// =============================================================================

export const ProposalStageSchema = z.object({
  stage: z.string(),
  platform: z.string().optional(),
  min_duration_days: z.number().optional(),
  duration_days: z.number().optional(),
  duration_days_range: z.tuple([z.number(), z.number()]).optional(),
  duration: z.string().optional(),
  pass_condition: z.string().optional(),
  entry_requirement: z.string().optional(),
  purpose: z.string().optional(),
  typical_duration_days: z.number().nullable().optional(),
  typical_voting_window_days: z.number().optional(),
  voting_delay_days: z.number().optional(),
  voting_period_days: z.number().optional(),
  timelock_days: z.number().optional(),
  notes: z.string().optional(),
});

export const ProposalProcessSchema = z.object({
  stages: z.array(ProposalStageSchema),
  proposal_types: z.array(z.string()).optional(),
});

// =============================================================================
// PROPOSAL ACTIVITY
// =============================================================================

export const ProposalActivitySchema = z.object({
  activity_level: z.enum(['high', 'medium-high', 'medium', 'low']),
  cadence_pattern: z.string(),
  primary_artifacts: z.array(z.string()).optional(),
});

// =============================================================================
// SECURITY CONTROLS
// =============================================================================

export const SecurityControlsSchema = z.object({
  timelock: z.boolean().optional(),
  timelock_delay_days: z.number().optional(),
  voting_delay_days: z.number().optional(),
  multi_stage_execution: z.boolean().optional(),
  veto_mechanism: z.boolean().optional(),
  veto_period_days: z.number().optional(),
  dual_governance: z.boolean().optional(),
  notes: z.array(z.string()).optional(),
});

// =============================================================================
// SIMULATION PARAMETERS
// =============================================================================

export const ProposalThresholdParamSchema = z.object({
  unit: z.string(),
  value: z.number(),
});

export const QuorumParamSchema = z.object({
  unit: z.string().optional(),
  value: z.number().optional(),
});

export const QuorumPctVotableSchema = z.union([
  z.number(),
  z.object({
    constitutional: z.number(),
    non_constitutional: z.number(),
  }),
]);

export const TokenHouseSimSchema = z.object({
  vote_weight: z.string(),
  quorum_pct_votable_supply: z.number(),
  approval_threshold_pct: z.number(),
  typical_voting_window_days: z.number(),
});

export const CitizensHouseSimSchema = z.object({
  vote_weight: z.string(),
  upgrade_veto_window_days: z.number(),
});

export const ExecutorSimSchema = z.object({
  proposal_threshold_pct_supply: z.number(),
  quorum_pct_supply: z.number(),
  differential_pct: z.number(),
  timelock_days: z.number(),
});

export const GovernanceSimParamsSchema = z.object({
  vote_weight: z.string(),
  proposal_threshold: ProposalThresholdParamSchema.optional(),
  quorum: QuorumParamSchema.optional(),
  quorum_pct_votable: QuorumPctVotableSchema.optional(),
  voting_delay_days: z.number().optional(),
  voting_period_days: z.number().optional(),
  voting_period_days_range: z.tuple([z.number(), z.number()]).optional(),
  timelock_delay_days: z.number().optional(),
  pass_rule: z.string().optional(),
  temperature_check_gate_pct: z.number().optional(),
  token_house: TokenHouseSimSchema.optional(),
  citizens_house: CitizensHouseSimSchema.optional(),
  short_executor: ExecutorSimSchema.optional(),
  long_executor: ExecutorSimSchema.optional(),
  offchain_vote_days: z.number().optional(),
  onchain_vote_days: z.number().optional(),
});

export const DualGovernanceSimParamsSchema = z.object({
  review_pending_days: z.number(),
  buffer_days: z.number(),
  veto_threshold_pct: z.number(),
  rage_quit_threshold_pct: z.number(),
  dynamic_timelock_days_range: z.tuple([z.number(), z.number()]),
});

export const ExecutionSimParamsSchema = z.object({
  l2_timelock_days: z.number().optional(),
  l2_to_l1_delay_days: z.number().optional(),
  l1_timelock_days: z.number().optional(),
});

export const ProcessSimParamsSchema = z.object({
  temperature_check_days: z.number().optional(),
  rfc_min_days: z.number().optional(),
});

export const SimulationParametersSchema = z.object({
  governance: GovernanceSimParamsSchema,
  dual_governance: DualGovernanceSimParamsSchema.optional(),
  execution: ExecutionSimParamsSchema.optional(),
  process: ProcessSimParamsSchema.optional(),
});

// =============================================================================
// SOURCES
// =============================================================================

export const SourceReferenceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
});

// =============================================================================
// MAIN DAO SPEC
// =============================================================================

export const DAOSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.array(z.string()),
  primary_chain: z.string(),
  governance_token: GovernanceTokenSchema,
  governance_stack: GovernanceStackSchema,
  treasury: TreasurySchema,
  membership: MembershipSchema,
  proposal_process: ProposalProcessSchema,
  proposal_activity: ProposalActivitySchema,
  security_controls: SecurityControlsSchema,
  simulation_parameters: SimulationParametersSchema,
  sources: z.array(SourceReferenceSchema),
});

export const DigitalTwinConfigSchema = z.object({
  schema_version: z.string().startsWith('dao_digital_twin'),
  last_verified_utc: z.string(),
  dao: DAOSpecSchema,
});

// =============================================================================
// INFERRED TYPES FROM ZOD SCHEMAS
// =============================================================================

export type ZodDigitalTwinConfig = z.infer<typeof DigitalTwinConfigSchema>;
export type ZodDigitalTwinIndex = z.infer<typeof DigitalTwinIndexSchema>;
export type ZodDAOSpec = z.infer<typeof DAOSpecSchema>;

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationSuccess {
  success: true;
  data: ZodDigitalTwinConfig;
}

export interface ValidationFailure {
  success: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export interface IndexValidationSuccess {
  success: true;
  data: ZodDigitalTwinIndex;
}

export interface IndexValidationFailure {
  success: false;
  error: string;
}

export type IndexValidationResult = IndexValidationSuccess | IndexValidationFailure;

/**
 * Validate a digital twin configuration object
 */
export function validateTwinConfig(data: unknown): ValidationResult {
  const result = DigitalTwinConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

/**
 * Validate the digital twin index file
 */
export function validateIndex(data: unknown): IndexValidationResult {
  const result = DigitalTwinIndexSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}
