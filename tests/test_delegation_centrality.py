import unittest
from dao_simulation import DAOSimulation

class TestDelegationCentrality(unittest.TestCase):
    def test_liquid_delegator_centrality(self):
        sim = DAOSimulation(num_developers=1, num_investors=0, num_delegators=0,
                             num_liquid_delegators=1, num_proposal_creators=0,
                             num_validators=0, num_service_providers=0,
                             num_arbitrators=0, num_regulators=0,
                             num_external_partners=0, num_passive_members=0,
                             seed=1)
        sim.step()
        centrality = sim.datacollector.delegation_centrality[-1]
        self.assertAlmostEqual(centrality.get('Developer_0', 0.0), 1.0)

if __name__ == '__main__':
    unittest.main()
