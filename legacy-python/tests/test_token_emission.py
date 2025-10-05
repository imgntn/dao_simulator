import unittest
from dao_simulation import DAOSimulation
from .test_constants import get_clean_dao_simulation, TINY_AMOUNT, SMALL_AMOUNT

class TestTokenEmission(unittest.TestCase):
    def _base_sim(self, **kwargs):
        return DAOSimulation(
            num_developers=0,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_auditors=0,
            num_bounty_hunters=0,
            num_external_partners=0,
            num_passive_members=0,
            comment_probability=0,
            **kwargs,
        )

    def test_emission_increases_balance(self):
        # Use clean simulation with specific emission rate
        sim = get_clean_dao_simulation(token_emission_rate=SMALL_AMOUNT)
        before = sim.dao.treasury.get_token_balance("DAO_TOKEN")
        sim.step()
        after = sim.dao.treasury.get_token_balance("DAO_TOKEN")
        self.assertEqual(after - before, SMALL_AMOUNT)
        self.assertIn("token_minted", sim.datacollector.event_counts)

    def test_burn_decreases_balance(self):
        # Use clean simulation to avoid initial treasury funding confusion
        sim = get_clean_dao_simulation(token_burn_rate=TINY_AMOUNT)
        
        # Add tokens to burn
        sim.dao.treasury.deposit("DAO_TOKEN", TINY_AMOUNT)
        before = sim.dao.treasury.get_token_balance("DAO_TOKEN")
        
        sim.step()
        after = sim.dao.treasury.get_token_balance("DAO_TOKEN")
        
        # The balance should decrease by the burn amount
        self.assertEqual(before - after, TINY_AMOUNT)
        self.assertIn("token_burned", sim.datacollector.event_counts)

if __name__ == "__main__":
    unittest.main()
