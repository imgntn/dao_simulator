import unittest
from dao_simulation import DAOSimulation
from data_structures.dao import DAO

class TestMarketShockPersistence(unittest.TestCase):
    def test_shocks_survive_save_load(self):
        sim = DAOSimulation(
            num_developers=0,
            num_investors=1,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_external_partners=0,
            num_passive_members=0,
            market_shock_frequency=1,
            comment_probability=0,
        )
        sim.step()
        self.assertTrue(sim.dao.market_shocks)
        data = sim.dao.to_dict()
        dao2 = DAO.from_dict(data)
        self.assertEqual(len(dao2.market_shocks), len(sim.dao.market_shocks))
        self.assertAlmostEqual(
            dao2.market_shocks[0].severity,
            sim.dao.market_shocks[0].severity,
        )

if __name__ == "__main__":
    unittest.main()
