import unittest
import random
from dao_simulation import DAOSimulation

class TestMarketingCampaigns(unittest.TestCase):
    def test_recruitment_campaign_adds_members(self):
        random.seed(0)
        sim = DAOSimulation(
            enable_marketing=True,
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
        )
        initial = len(sim.dao.members)
        sim.step()
        self.assertGreater(len(sim.dao.members), initial)
        self.assertIn("marketing_campaign", sim.datacollector.event_counts)

    def test_demand_boost_campaign_increases_price(self):
        random.seed(1)
        sim = DAOSimulation(
            enable_marketing=True,
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
        )
        price_before = sim.dao.treasury.get_token_price("DAO_TOKEN")
        sim.step()
        price_after = sim.dao.treasury.get_token_price("DAO_TOKEN")
        self.assertNotEqual(price_after, price_before)
        self.assertIn("marketing_campaign", sim.datacollector.event_counts)

if __name__ == "__main__":
    unittest.main()

