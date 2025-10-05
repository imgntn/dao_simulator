"""Test constants and utilities for consistent testing."""

from constants import (
    INITIAL_TREASURY_FUNDING,
    TEST_TOKEN_AMOUNT_TINY,
    TEST_TOKEN_AMOUNT_SMALL,
    TEST_TOKEN_AMOUNT_MEDIUM,
    TEST_TOKEN_AMOUNT_LARGE,
    TEST_TOKEN_AMOUNT_EXTRA_LARGE,
    TEST_PROJECT_FUNDING_GOAL,
    TEST_REVENUE_AMOUNT,
    TEST_BRIDGE_FEE_RATE,
    TEST_PORT_BASE,
    DEFAULT_BRIDGE_DELAY,
    DEFAULT_TOKEN_EMISSION_RATE,
    DEFAULT_TOKEN_BURN_RATE,
)


def get_clean_dao_simulation(**kwargs):
    """Create a DAO simulation with zero initial treasury and no token emission for isolated testing."""
    from dao_simulation import DAOSimulation
    
    # Default to no agents and no token emission for clean testing
    defaults = {
        'num_developers': 0,
        'num_investors': 0,
        'num_delegators': 0,
        'num_proposal_creators': 0,
        'num_validators': 0,
        'num_service_providers': 0,
        'num_arbitrators': 0,
        'num_regulators': 0,
        'num_auditors': 0,
        'num_bounty_hunters': 0,
        'num_external_partners': 0,
        'num_passive_members': 0,
        'comment_probability': 0,
        'token_emission_rate': 0,  # Disable token emission for clean testing
        'token_burn_rate': 0,      # Disable token burning for clean testing (unless specified)
    }
    defaults.update(kwargs)
    
    sim = DAOSimulation(**defaults)
    
    # Remove initial treasury funding for clean testing
    current_balance = sim.dao.treasury.get_token_balance("DAO_TOKEN")
    if current_balance > 0:
        sim.dao.treasury.withdraw("DAO_TOKEN", current_balance)
    
    return sim


def get_clean_multi_dao_simulation(num_daos=2, **kwargs):
    """Create a multi-DAO simulation with zero initial treasury and no token emission for isolated testing."""
    from multi_dao_simulation import MultiDAOSimulation
    
    # Default to no agents and no token emission for clean testing  
    defaults = {
        'enable_cross_dao': False,
        'num_developers': 0,
        'num_investors': 0,
        'num_delegators': 0,
        'num_proposal_creators': 0,
        'num_validators': 0,
        'num_service_providers': 0,
        'num_arbitrators': 0,
        'num_regulators': 0,
        'num_external_partners': 0,
        'num_passive_members': 0,
        'token_emission_rate': 0,  # Disable token emission for clean testing
        'token_burn_rate': 0,      # Disable token burning for clean testing (unless specified)
    }
    defaults.update(kwargs)
    
    sim = MultiDAOSimulation(num_daos=num_daos, **defaults)
    
    # Remove initial treasury funding from all DAOs for clean testing
    for dao_sim in sim.daos:
        current_balance = dao_sim.dao.treasury.get_token_balance("DAO_TOKEN")
        if current_balance > 0:
            dao_sim.dao.treasury.withdraw("DAO_TOKEN", current_balance)
    
    return sim


def calculate_expected_balance_after_step(initial_balance, token_emission_rate=None):
    """Calculate expected token balance after a simulation step."""
    from settings import settings
    
    if token_emission_rate is None:
        token_emission_rate = settings.get('token_emission_rate', 0)
    
    return initial_balance + token_emission_rate


def get_test_port(offset=0):
    """Get a test port number for servers."""
    return TEST_PORT_BASE + offset


# Test amounts for consistent usage across tests
TINY_AMOUNT = TEST_TOKEN_AMOUNT_TINY      # 5
SMALL_AMOUNT = TEST_TOKEN_AMOUNT_SMALL    # 10  
MEDIUM_AMOUNT = TEST_TOKEN_AMOUNT_MEDIUM  # 100
LARGE_AMOUNT = TEST_TOKEN_AMOUNT_LARGE    # 1000
XL_AMOUNT = TEST_TOKEN_AMOUNT_EXTRA_LARGE # 6000

# Common test values
STANDARD_PROJECT_GOAL = TEST_PROJECT_FUNDING_GOAL  # 1000
STANDARD_REVENUE = TEST_REVENUE_AMOUNT             # 1000
BRIDGE_FEE_RATE = TEST_BRIDGE_FEE_RATE            # 0.1
BRIDGE_DELAY = DEFAULT_BRIDGE_DELAY               # 1

# Treasury funding constant for tests that need to account for it
TREASURY_INITIAL_FUNDING = INITIAL_TREASURY_FUNDING  # 50000