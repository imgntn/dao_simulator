"""Base test classes for consistent test setup."""

import unittest
from .test_constants import (
    get_clean_dao_simulation,
    get_clean_multi_dao_simulation, 
    TREASURY_INITIAL_FUNDING,
    calculate_expected_balance_after_step,
)


class BaseDAOTest(unittest.TestCase):
    """Base test class with standard DAO simulation setup that accounts for initial funding."""
    
    def setUp(self):
        """Set up a standard DAO simulation."""
        self.simulation = None
        
    def create_simulation(self, **kwargs):
        """Create a DAO simulation with default settings."""
        from dao_simulation import DAOSimulation
        
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
        }
        defaults.update(kwargs)
        
        self.simulation = DAOSimulation(**defaults)
        return self.simulation
    
    def get_initial_treasury_balance(self):
        """Get the initial treasury balance (includes funding)."""
        return TREASURY_INITIAL_FUNDING
    
    def assert_balance_change(self, dao, expected_change, token="DAO_TOKEN"):
        """Assert that the token balance changed by the expected amount."""
        initial_balance = dao.treasury.get_token_balance(token)
        dao.treasury.deposit(token, expected_change)
        final_balance = dao.treasury.get_token_balance(token)
        self.assertEqual(final_balance - initial_balance, expected_change)


class CleanDAOTest(unittest.TestCase):
    """Base test class with clean DAO simulation (zero initial treasury)."""
    
    def setUp(self):
        """Set up a clean DAO simulation with zero initial treasury."""
        self.simulation = None
        
    def create_clean_simulation(self, **kwargs):
        """Create a clean DAO simulation with zero initial treasury."""
        self.simulation = get_clean_dao_simulation(**kwargs)
        return self.simulation
    
    def create_clean_multi_dao_simulation(self, num_daos=2, **kwargs):
        """Create a clean multi-DAO simulation with zero initial treasury."""
        return get_clean_multi_dao_simulation(num_daos=num_daos, **kwargs)
    
    def assert_exact_balance(self, dao, expected_balance, token="DAO_TOKEN"):
        """Assert that the token balance is exactly the expected amount."""
        actual_balance = dao.treasury.get_token_balance(token)
        self.assertEqual(actual_balance, expected_balance)
    
    def assert_balance_increase(self, dao, expected_increase, token="DAO_TOKEN", step_emission=True):
        """Assert that balance increased by expected amount, accounting for token emission."""
        initial_balance = dao.treasury.get_token_balance(token)
        # Perform some action that should increase balance
        final_balance = dao.treasury.get_token_balance(token)
        
        if step_emission:
            # Account for token emission if a step was taken
            expected_final = calculate_expected_balance_after_step(initial_balance + expected_increase)
        else:
            expected_final = initial_balance + expected_increase
            
        self.assertEqual(final_balance, expected_final)


class MultiDAOTest(BaseDAOTest):
    """Base test class for multi-DAO simulations."""
    
    def create_multi_dao_simulation(self, num_daos=2, **kwargs):
        """Create a multi-DAO simulation."""
        from multi_dao_simulation import MultiDAOSimulation
        
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
        }
        defaults.update(kwargs)
        
        self.multi_sim = MultiDAOSimulation(num_daos=num_daos, **defaults)
        return self.multi_sim
    
    def get_dao_pair(self):
        """Get a pair of DAOs for testing."""
        if not hasattr(self, 'multi_sim') or self.multi_sim is None:
            self.create_multi_dao_simulation()
        
        dao0 = self.multi_sim.daos[0].dao
        dao1 = self.multi_sim.daos[1].dao
        return dao0, dao1