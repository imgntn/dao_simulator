// Configuration constants for the DAO simulation
// Port from constants.py

// =============================================================================
// TIME SCALE CONFIGURATION
// =============================================================================
// CRITICAL: These constants define the mapping between simulation steps and real time.
// All time-based parameters should be derived from these values for consistency.
//
// Default: 1 step = 1 hour
// This means:
//   - 24 steps = 1 day
//   - 168 steps = 1 week
//   - 720 steps = 1 month (30 days)
//   - 8760 steps = 1 year (365 days)

/**
 * Duration of a single simulation step in hours.
 * All time-dependent calculations should use this value.
 */
export const STEP_DURATION_HOURS = 1;

/**
 * Number of simulation steps per day
 */
export const STEPS_PER_DAY = 24 / STEP_DURATION_HOURS;

/**
 * Number of simulation steps per week
 */
export const STEPS_PER_WEEK = STEPS_PER_DAY * 7;

/**
 * Number of simulation steps per month (30 days)
 */
export const STEPS_PER_MONTH = STEPS_PER_DAY * 30;

/**
 * Number of simulation steps per year (365 days)
 */
export const STEPS_PER_YEAR = STEPS_PER_DAY * 365;

/**
 * Convert hours to steps
 */
export function hoursToSteps(hours: number): number {
  return Math.round(hours / STEP_DURATION_HOURS);
}

/**
 * Convert days to steps
 */
export function daysToSteps(days: number): number {
  return Math.round(days * STEPS_PER_DAY);
}

/**
 * Convert steps to hours
 */
export function stepsToHours(steps: number): number {
  return steps * STEP_DURATION_HOURS;
}

/**
 * Convert steps to days
 */
export function stepsToDays(steps: number): number {
  return steps / STEPS_PER_DAY;
}

// Treasury Configuration
export const MIN_TREASURY_RESERVE = 10000; // Minimum treasury balance to maintain
export const INITIAL_TREASURY_FUNDING = 50000; // Base treasury funding

// Agent Token Configuration
export const DEFAULT_AGENT_TOKENS = 100; // Default starting tokens for agents
export const DEVELOPER_TOKENS = 100;
export const INVESTOR_TOKENS = 1000;
export const TRADER_TOKENS = 100;
export const ADAPTIVE_INVESTOR_TOKENS = 1000;
export const DELEGATOR_TOKENS = 100;
export const LIQUID_DELEGATOR_TOKENS = 100;
export const PROPOSAL_CREATOR_TOKENS = 100;
export const VALIDATOR_TOKENS = 100;
export const SERVICE_PROVIDER_TOKENS = 100;
export const ARBITRATOR_TOKENS = 100;
export const REGULATOR_TOKENS = 100;
export const AUDITOR_TOKENS = 100;
export const BOUNTY_HUNTER_TOKENS = 100;
export const EXTERNAL_PARTNER_TOKENS = 100;
export const ARTIST_TOKENS = 100;
export const COLLECTOR_TOKENS = 100;
export const SPECULATOR_TOKENS = 100;
export const PASSIVE_MEMBER_TOKENS = 100;
export const PLAYER_TOKENS = 100;
export const STAKER_TOKENS = 500;
export const STAKER_STAKE_RATIO = 0.6;

// Agent Budget Configuration
export const INVESTOR_BUDGET = 500;
export const ADAPTIVE_INVESTOR_BUDGET = 500;
export const DELEGATOR_BUDGET = 200;
export const LIQUID_DELEGATOR_BUDGET = 200;
export const SERVICE_PROVIDER_BUDGET = 200;

// Agent Reputation Configuration
export const DEFAULT_AGENT_REPUTATION = 0;
export const BOUNTY_HUNTER_REPUTATION = 10;

// Agent Capacity Configuration
export const ARBITRATOR_CAPACITY = 3;

// Achievement Thresholds
export const FIRST_1000_TOKENS_THRESHOLD = 1000;

// Learning Parameters
export const DEFAULT_ADAPTIVE_LEARNING_RATE = 0.1;
export const DEFAULT_ADAPTIVE_EPSILON = 0.1;

// Market Parameters
export const MIN_TOKEN_PRICE = 0.01; // Minimum token price floor
export const MARKET_SHOCK_RANGE = 0.5; // Maximum market shock severity
export const BUYBACK_PERCENTAGE = 0.1; // Percentage of funds to use for buybacks
export const BUYBACK_FUND_THRESHOLD = 5000; // Minimum treasury balance for buybacks
export const BUYBACK_PRICE_THRESHOLD = 1.0; // Price threshold for buybacks

// Agent Addition Parameters
export const NEW_MEMBER_INTERVAL = 50; // Steps between adding new members
export const NEW_MEMBERS_PER_INTERVAL = 5; // Number of new members to add
export const NEW_MEMBER_COST = 100; // Cost to add a new member
export const NEW_MEMBER_FUND_REQUIREMENT = 100; // Treasury requirement to add members

// File and Database Limits
export const MAX_FILE_PATH_LENGTH = 255;
export const MAX_STRING_INPUT_LENGTH = 1000;
export const MAX_SIMULATION_STEPS = 10000;
export const MAX_PROPOSAL_ID = 100000;
export const MAX_AGENT_ID = 10000;
export const MAX_TOKEN_AMOUNT = 1_000_000_000;

// Logging Configuration
export const LOG_MAX_BYTES = 10_000_000; // 10MB
export const LOG_BACKUP_COUNT = 5;

// Bridge Configuration
export const DEFAULT_BRIDGE_FEE_RATE = 0.1; // 10% fee for cross-DAO transfers
export const DEFAULT_BRIDGE_DELAY = 1; // Steps to wait before processing bridge transfers

// Test Configuration Constants
export const TEST_PORT_BASE = 8125; // Base port for test servers
export const TEST_TOKEN_AMOUNT_TINY = 5;
export const TEST_TOKEN_AMOUNT_SMALL = 10;
export const TEST_TOKEN_AMOUNT_MEDIUM = 100;
export const TEST_TOKEN_AMOUNT_LARGE = 1000;
export const TEST_TOKEN_AMOUNT_EXTRA_LARGE = 6000;
export const TEST_BRIDGE_FEE_RATE = 0.1; // 10% bridge fee for tests
export const TEST_PROJECT_FUNDING_GOAL = 1000;
export const TEST_REVENUE_AMOUNT = 1000;

// Default Token Emission/Burn Rates
export const DEFAULT_TOKEN_EMISSION_RATE = 100.0; // Default tokens minted per step
export const DEFAULT_TOKEN_BURN_RATE = 0.0; // Default tokens burned per step
export const DEFAULT_PRICE_VOLATILITY = 0.005; // Default per-step price volatility
