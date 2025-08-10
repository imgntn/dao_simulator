"""Configuration constants for the DAO simulation."""

# Treasury Configuration
MIN_TREASURY_RESERVE = 10000  # Minimum treasury balance to maintain
INITIAL_TREASURY_FUNDING = 50000  # Base treasury funding
MARKETING_BUDGET_BOOST = 10000  # Additional marketing budget

# Agent Token Configuration
DEFAULT_AGENT_TOKENS = 100  # Default starting tokens for agents
DEVELOPER_TOKENS = 100
INVESTOR_TOKENS = 1000
TRADER_TOKENS = 100
ADAPTIVE_INVESTOR_TOKENS = 1000
DELEGATOR_TOKENS = 100
LIQUID_DELEGATOR_TOKENS = 100
PROPOSAL_CREATOR_TOKENS = 100
VALIDATOR_TOKENS = 100
SERVICE_PROVIDER_TOKENS = 100
ARBITRATOR_TOKENS = 100
REGULATOR_TOKENS = 100
AUDITOR_TOKENS = 100
BOUNTY_HUNTER_TOKENS = 100
EXTERNAL_PARTNER_TOKENS = 100
ARTIST_TOKENS = 100
COLLECTOR_TOKENS = 100
SPECULATOR_TOKENS = 100
PASSIVE_MEMBER_TOKENS = 100
PLAYER_TOKENS = 100

# Agent Budget Configuration
INVESTOR_BUDGET = 500
ADAPTIVE_INVESTOR_BUDGET = 500
DELEGATOR_BUDGET = 200
LIQUID_DELEGATOR_BUDGET = 200
SERVICE_PROVIDER_BUDGET = 200

# Agent Reputation Configuration
DEFAULT_AGENT_REPUTATION = 0
BOUNTY_HUNTER_REPUTATION = 10

# Agent Capacity Configuration
ARBITRATOR_CAPACITY = 3

# Achievement Thresholds
FIRST_1000_TOKENS_THRESHOLD = 1000

# Learning Parameters
DEFAULT_ADAPTIVE_LEARNING_RATE = 0.1
DEFAULT_ADAPTIVE_EPSILON = 0.1

# Market Parameters
MIN_TOKEN_PRICE = 0.01  # Minimum token price floor
MARKET_SHOCK_RANGE = 0.5  # Maximum market shock severity
BUYBACK_PERCENTAGE = 0.1  # Percentage of funds to use for buybacks
BUYBACK_FUND_THRESHOLD = 5000  # Minimum treasury balance for buybacks
BUYBACK_PRICE_THRESHOLD = 1.0  # Price threshold for buybacks

# Agent Addition Parameters
NEW_MEMBER_INTERVAL = 50  # Steps between adding new members
NEW_MEMBERS_PER_INTERVAL = 5  # Number of new members to add
NEW_MEMBER_COST = 100  # Cost to add a new member
NEW_MEMBER_FUND_REQUIREMENT = 100  # Treasury requirement to add members

# File and Database Limits
MAX_FILE_PATH_LENGTH = 255
MAX_STRING_INPUT_LENGTH = 1000
MAX_SIMULATION_STEPS = 10000
MAX_PROPOSAL_ID = 100000
MAX_AGENT_ID = 10000
MAX_TOKEN_AMOUNT = 1_000_000_000

# Logging Configuration
LOG_MAX_BYTES = 10_000_000  # 10MB
LOG_BACKUP_COUNT = 5

# Bridge Configuration
DEFAULT_BRIDGE_FEE_RATE = 0.1  # 10% fee for cross-DAO transfers
DEFAULT_BRIDGE_DELAY = 1  # Steps to wait before processing bridge transfers

# Test Configuration Constants
TEST_PORT_BASE = 8125  # Base port for test servers
TEST_TOKEN_AMOUNT_TINY = 5  # Small amounts for testing
TEST_TOKEN_AMOUNT_SMALL = 10
TEST_TOKEN_AMOUNT_MEDIUM = 100  
TEST_TOKEN_AMOUNT_LARGE = 1000
TEST_TOKEN_AMOUNT_EXTRA_LARGE = 6000
TEST_BRIDGE_FEE_RATE = 0.1  # 10% bridge fee for tests
TEST_PROJECT_FUNDING_GOAL = 1000  # Standard project funding goal for tests
TEST_REVENUE_AMOUNT = 1000  # Standard revenue amount for tests

# Default Token Emission/Burn Rates (moved from settings for consistency)
DEFAULT_TOKEN_EMISSION_RATE = 100.0  # Default tokens minted per step
DEFAULT_TOKEN_BURN_RATE = 0.0  # Default tokens burned per step