import unittest
from dao_simulation import DAOSimulation


class TestMarketShock(unittest.TestCase):
    def test_trigger_market_shock(self):
        sim = DAOSimulation(
            num_developers=0,
            num_investors=0,
            num_delegators=0,
            num_proposal_creators=0,
            num_validators=0,
            num_service_providers=0,
            num_arbitrators=0,
            num_regulators=0,
            num_external_partners=0,
            num_passive_members=0,
            comment_probability=0,
        )
        start_price = sim.dao.treasury.get_token_price("DAO_TOKEN")
        sim.trigger_market_shock(severity=0.5)
        self.assertAlmostEqual(
            sim.dao.treasury.get_token_price("DAO_TOKEN"), start_price * 1.5
        )
        self.assertEqual(len(sim.dao.market_shocks), 1)
        self.assertAlmostEqual(sim.dao.market_shocks[0].severity, 0.5)


if __name__ == "__main__":
    unittest.main()
