import unittest
from dao_simulation import DAOSimulation


class TestMarketingCampaign(unittest.TestCase):
    def test_run_marketing_campaign(self):
        sim = DAOSimulation(
            enable_marketing=True,
            marketing_level="low",
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
        sim.schedule.steps = 20
        sim.dao.treasury.deposit("DAO_TOKEN", 100)
        sim.run_marketing_campaign()
        self.assertEqual(len(sim.datacollector.campaign_history), 1)
        self.assertEqual(sim.datacollector.campaign_history[0]["type"], "social_media")


if __name__ == "__main__":
    unittest.main()
