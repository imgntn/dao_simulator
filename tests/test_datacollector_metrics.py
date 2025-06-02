import unittest
from dao_simulation import DAOSimulation

class TestDataCollectorMetrics(unittest.TestCase):
    def test_extra_metrics_recorded(self):
        sim = DAOSimulation(num_developers=1, num_investors=0, num_delegators=0,
                             num_proposal_creators=0, num_validators=0,
                             num_service_providers=0, num_arbitrators=0,
                             num_regulators=0, num_external_partners=0,
                             num_passive_members=0)
        sim.step()
        row = sim.datacollector.model_vars[-1]
        self.assertIn('avg_reputation', row)
        self.assertIn('total_tokens', row)
        self.assertIn('event_count', row)
        self.assertIn('dao_token_price', row)

if __name__ == "__main__":
    unittest.main()
